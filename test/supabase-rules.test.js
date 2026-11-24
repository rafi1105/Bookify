import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { freshDatabase } from './helpers.js';

// Real Supabase enables the safeupdate extension, which rejects UPDATE and DELETE without WHERE,
// and the app talks to the database as service_role. The embedded test engine enforces neither,
// so these tests check both explicitly.
function sqlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sqlFiles(`${dir}/${e.name}`) : e.name.endsWith('.sql') ? [`${dir}/${e.name}`] : []);
}

test('no SQL file has an UPDATE or DELETE without a WHERE clause', () => {
  const offenders = [];
  for (const file of sqlFiles(new URL('../supabase', import.meta.url).pathname)) {
    const text = readFileSync(file, 'utf8').replace(/--[^\n]*/g, '');
    for (const m of text.matchAll(/\b(update\s+(?:only\s+)?[\w."]+\s+(?:as\s+\w+\s+)?set|delete\s+from\s+[\w."]+)([\s\S]*?)(;|\$\$)/gi)) {
      if (!/\bwhere\b/i.test(m[2])) offenders.push(`${file.split('/supabase/')[1]}: ${(m[1] + m[2]).slice(0, 80).replace(/\s+/g, ' ')}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('service_role can use every table and function, and the browser roles can use none', async () => {
  const db = await freshDatabase();
  const tables = (await db.query(`select tablename from pg_tables where schemaname = 'public'`)).rows.map((r) => r.tablename);
  for (const t of tables) {
    const ok = (await db.query(`select has_table_privilege('service_role', format('public.%I', $1::text), 'select,insert,update,delete') as ok`, [t])).rows[0].ok;
    assert.ok(ok, `service_role lacks privileges on ${t}`);
  }
  for (const t of ['sim_clock', 'trips', 'bookings', 'buses']) {
    for (const role of ['anon', 'authenticated']) {
      const open = (await db.query(`select has_table_privilege($1, format('public.%I', $2::text), 'select') as ok`, [role, t])).rows[0].ok;
      assert.equal(open, false, `${role} must not read ${t}`);
    }
  }
  const fns = (await db.query(`select p.oid::regprocedure::text as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'bk\\_%'`)).rows;
  for (const f of fns) {
    const ok = (await db.query(`select has_function_privilege('service_role', $1::regprocedure, 'execute') as ok`, [f.sig])).rows[0].ok;
    assert.ok(ok, `service_role cannot execute ${f.sig}`);
  }

  // The same calls the API makes for the simulation clock, as service_role.
  await db.query('set role service_role');
  const row = (await db.query('select speed from public.sim_clock')).rows;
  assert.equal(row.length, 1);
  const set = (await db.query('select public.bk_set_sim(60, true) as r')).rows[0].r;
  assert.equal(Number(set.speed), 60);
  assert.equal((await db.query('select public.bk_sync_trip_status() as r')).rows.length, 1);
  assert.ok(Array.isArray((await db.query('select public.bk_fleet_status(null) as f')).rows[0].f));
});
