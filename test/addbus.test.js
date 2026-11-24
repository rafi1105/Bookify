import test from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from './helpers.js';

// The API inserts as service_role, so grants and column defaults must work for that role.
test('service_role can add a bus exactly like the API does', async () => {
  const db = await freshDatabase();
  const u = (await db.query(`insert into auth.users (email, raw_user_meta_data) values ('o@test.dev','{}') returning id`)).rows[0].id;
  const v = (await db.query(`insert into public.vendors (user_id, company_name, license_no, address, approval_status) values ($1,'Op','L','a','APPROVED') returning id`, [u])).rows[0].id;
  await db.query(`insert into public.bus_operators (vendor_id, operator_name) values ($1,'Op')`, [v]);
  await db.query('set role service_role');
  const brand = (await db.query('select id from public.bus_operators where vendor_id=$1', [v])).rows[0].id;
  const layout = { kind: 'SEAT', decks: [{ label: 'Main', rows: [['A1', 'A2', '', 'A3']] }] };
  const cap = (await db.query(`insert into public.bus_capacities (capacity_value, seat_layout_json, vendor_id, name) values (3,$1,$2,'x') returning id`, [layout, v])).rows[0].id;
  const bus = (await db.query(
    `insert into public.buses (operator_id, vendor_id, reg_no, model_no, name, bus_type, capacity_id, amenities, status, image_url)
     values ($1,$2,'SR-100','Hyundai','SR Travel','AC_ECONOMY',$3,$4,'ACTIVE','https://example.com/a.jpg') returning id, code`,
    [brand, v, cap, ['Wi-Fi']])).rows[0];
  assert.match(bus.code, /^BUS-[A-Z0-9]{6}$/);
  await db.query('reset role');
});
