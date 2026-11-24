import test from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from './helpers.js';

for (const legacy of ['none', 'full', 'partial']) test(`migration applies cleanly (${legacy} legacy schema) and sign-up creates a profile`, async () => {
  const db = await freshDatabase(legacy);
  await db.query(`insert into auth.users (email, raw_user_meta_data) values ('a@example.com', '{"name":"Ada","phone":"01711111111"}')`);
  const { rows } = await db.query('select name, phone, role_id from public.users');
  assert.deepEqual(rows, [{ name: 'Ada', phone: '01711111111', role_id: 1 }]);
});

test('the migration can be re-run safely', async () => {
  const db = await freshDatabase('none');
  const { readFileSync } = await import('node:fs');
  const sql = readFileSync(new URL('../supabase/migrations/20261124120000_bookify_v2_production.sql', import.meta.url), 'utf8').replace(/create extension if not exists [^;]*;/gi, '');
  await db.exec(sql);
});
