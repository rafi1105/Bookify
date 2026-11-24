import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshDatabase } from './helpers.js';

const seedSql = readFileSync(new URL('../supabase/seed/bookify_seed_operators.sql', import.meta.url), 'utf8');
const cleanSql = readFileSync(new URL('../supabase/seed/bookify_seed_cleanup.sql', import.meta.url), 'utf8');
const count = async (db, sql) => Number((await db.query(sql)).rows[0].n);

test('seed creates operators, buses, approved routes and trips; re-run is a no-op; cleanup removes them', async () => {
  const db = await freshDatabase('none');
  await db.exec(seedSql);
  assert.equal(await count(db, `select count(*) n from public.vendors`), 11);
  assert.equal(await count(db, `select count(*) n from public.users where role_id = 2`), 11);
  assert.equal(await count(db, `select count(*) n from auth.identities`), 13);
  // Test logins: administrator (role 3) and passenger (role 1), confirmed, able to sign in
  assert.equal(await count(db, `select count(*) n from public.users u join auth.users a on a.id = u.id
    where a.email = 'admin@bookify.com' and u.role_id = 3 and a.email_confirmed_at is not null and a.encrypted_password = crypt('admin1234', 'x')`), 1);
  assert.equal(await count(db, `select count(*) n from public.users u join auth.users a on a.id = u.id
    where a.email = 'passenger@bookify.com' and u.role_id = 1 and a.encrypted_password = crypt('passenger1234', 'x')`), 1);
  const buses = await count(db, `select count(*) n from public.buses`);
  assert.ok(buses >= 90 && buses <= 100);
  assert.equal(await count(db, `select count(*) n from (select vendor_id from public.buses group by 1 having count(*) > 15) x`), 0);
  assert.equal(await count(db, `select count(*) n from public.buses where reg_no = 'SR-100' and code like 'BUS-%'`), 1);
  assert.equal(await count(db, `select count(*) n from public.buses where image_url is not null`), 0);
  assert.equal(await count(db, `select count(*) n from public.route_permissions where status <> 'APPROVED'`), 0);
  assert.ok(await count(db, `select count(*) n from public.trips`) > 1000);
  // search works in both directions
  const day = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  assert.ok(await count(db, `select count(*) n from public.bk_search_trips('Dhaka','Bogura','${day}')`) > 0);
  assert.ok(await count(db, `select count(*) n from public.bk_search_trips('Bogura','Dhaka','${day}')`) > 0);
  // no bus is ever on two trips at once
  assert.equal(await count(db, `select count(*) n from public.trips a join public.trips b on a.bus_id = b.bus_id and a.id < b.id
    and a.departure_at < b.arrival_at and a.arrival_at > b.departure_at`), 0);

  const trips = await count(db, 'select count(*) n from public.trips');
  // Re-running repairs a broken login and creates nothing twice
  await db.exec(`update auth.users set encrypted_password = 'broken', email_confirmed_at = null where email = 'travel@sr.com'`);
  await db.exec(`delete from auth.identities where user_id = (select id from auth.users where email = 'travel@sr.com')`);
  await db.exec(`update auth.users set encrypted_password = 'broken' where email = 'admin@bookify.com'`);
  await db.exec(`update public.users set role_id = 1 where email = 'admin@bookify.com'`);
  await db.exec(seedSql);
  assert.equal(await count(db, 'select count(*) n from public.trips'), trips);
  assert.equal(await count(db, `select count(*) n from auth.users where email = 'travel@sr.com' and encrypted_password = crypt('srtravel1234', 'x') and email_confirmed_at is not null`), 1);
  assert.equal(await count(db, `select count(*) n from auth.identities`), 13);
  assert.equal(await count(db, 'select count(*) n from public.vendors'), 11);
  assert.equal(await count(db, `select count(*) n from auth.users a join public.users u on u.id = a.id
    where a.email = 'admin@bookify.com' and u.role_id = 3 and a.encrypted_password = crypt('admin1234', 'x')`), 1);

  await db.exec(cleanSql);
  for (const t of ['vendors', 'buses', 'bus_capacities', 'trips', 'trip_schedules', 'route_permissions', 'routes', 'route_stops', 'users']) {
    assert.equal(await count(db, `select count(*) n from public.${t}`), 0, t);
  }
});

test('cleanup refuses while bookings exist on seeded trips', async () => {
  const db = await freshDatabase('none');
  await db.exec(seedSql);
  const u = (await db.query(`insert into auth.users (email) values ('buyer@test.dev') returning id`)).rows[0].id;
  const t = (await db.query(`select id, fare from public.trips limit 1`)).rows[0];
  await db.query(`insert into public.bookings (user_id, trip_id, total_amount, status) values ($1,$2,$3,'CONFIRMED')`, [u, t.id, t.fare]);
  await assert.rejects(() => db.exec(cleanSql), /booking/);
});
