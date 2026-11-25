import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshDatabase, LIVE_MAP } from './helpers.js';

// Fixtures exist only inside this test database.
async function world(db) {
  const owner = (await db.query(`insert into auth.users (email, raw_user_meta_data) values ('o@test.dev', '{"name":"T"}') returning id`)).rows[0].id;
  const vendor = (await db.query(`insert into public.vendors (user_id, company_name, license_no, address, approval_status)
     values ($1,'Op','L-1','addr','APPROVED') returning id`, [owner])).rows[0].id;
  const operator = (await db.query(`insert into public.bus_operators (vendor_id, operator_name) values ($1,'North Line') returning id`, [vendor])).rows[0].id;
  const layout = { kind: 'SEAT', decks: [{ label: 'Main', rows: [['A1', 'A2', '', 'A3', 'A4']] }] };
  const cap = (await db.query(`insert into public.bus_capacities (capacity_value, seat_layout_json, vendor_id, name) values (4, $1, $2, 'Std') returning id`, [layout, vendor])).rows[0].id;
  const bus = (await db.query(`insert into public.buses (operator_id, vendor_id, reg_no, model_no, name, bus_type, capacity_id)
     values ($1,$2,'DHK-9','M','Coach 9','AC_ECONOMY',$3) returning id`, [operator, vendor, cap])).rows[0].id;
  const perm = (await db.query(`insert into public.route_permissions (vendor_id, origin, destination, boarding_points, dropping_points, bus_type,
       proposed_fare, proposed_duration_min) values ($1,'Dhaka','Rangpur',array['Gabtoli','Savar'],array['Bogura','Rangpur Terminal'],'AC_ECONOMY',1000,480)
     returning id`, [vendor])).rows[0].id;
  await db.query(`select * from public.bk_approve_route_request($1,$2,1000,480,'ok')`, [owner, perm]);
  const day = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  await db.query(`select public.bk_create_schedule($1,$2,$3,'09:00',array[0,1,2,3,4,5,6]::smallint[],$4::date,$4::date,1000)`, [vendor, bus, perm, day]);
  const trip = (await db.query('select id from public.trips')).rows[0].id;
  return { owner, vendor, operator, bus, trip, day };
}

test('live map migration re-runs safely', async () => {
  const db = await freshDatabase('none');
  const sql = readFileSync(new URL('../supabase/migrations/' + LIVE_MAP, import.meta.url), 'utf8');
  await db.exec(sql);
  await db.exec(sql);
});

test('a coach that drops at Bogura answers a Dhaka to Bogura search', async () => {
  const db = await freshDatabase();
  const w = await world(db);
  const exact = (await db.query(`select * from public.bk_search_trips('Dhaka','Bogura',$1)`, [w.day])).rows;
  assert.equal(exact.length, 0);
  const via = (await db.query(`select * from public.bk_search_via('dhaka','BOGURA',$1)`, [w.day])).rows;
  assert.deepEqual(via, [{ trip_id: w.trip, board_at: 'Dhaka', drop_at: 'Bogura', route_origin: 'Dhaka', route_destination: 'Rangpur' }]);
  // Boarding at a stop works too; a stop before the boarding point does not count.
  assert.equal((await db.query(`select * from public.bk_search_via('Savar','Bogura',$1)`, [w.day])).rows[0].board_at, 'Savar');
  assert.equal((await db.query(`select * from public.bk_search_via('Bogura','Savar',$1)`, [w.day])).rows.length, 0);
  // The full route is not repeated as a "via" result.
  assert.equal((await db.query(`select * from public.bk_search_via('Dhaka','Rangpur',$1)`, [w.day])).rows.length, 0);
});

test('operator colours must be hex; latest GPS fix per bus is returned and scoped to the vendor', async () => {
  const db = await freshDatabase();
  const w = await world(db);
  await db.query(`update public.bus_operators set map_color = '#1d4ed8' where id = $1`, [w.operator]);
  await assert.rejects(db.query(`update public.bus_operators set map_color = 'red' where id = $1`, [w.operator]));
  await db.query(`insert into public.bus_positions (bus_id, trip_id, lat, lng, speed_kmh, recorded_at) values
    ($1, $2, 23.8, 90.4, 40, now() - interval '20 seconds'), ($1, $2, 23.9, 90.3, 55, now() - interval '5 seconds')`, [w.bus, w.trip]);
  const rows = (await db.query(`select * from public.bk_latest_positions($1, now() - interval '5 minutes')`, [w.vendor])).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].speed_kmh, 55);
  const other = (await db.query(`select * from public.bk_latest_positions(gen_random_uuid(), now() - interval '5 minutes')`)).rows;
  assert.equal(other.length, 0);
  await assert.rejects(db.query(`insert into public.bus_positions (bus_id, lat, lng, recorded_at) values ($1, 123, 90, now())`, [w.bus]));
  await assert.rejects(db.query(`insert into public.road_incidents (kind, lat, lng, reporter_role) values ('FIRE', 23, 90, 'ADMIN')`));
  await db.query(`insert into public.road_incidents (kind, lat, lng, reporter_role, bus_id) values ('ACCIDENT', 23, 90, 'DRIVER', $1)`, [w.bus]);
  assert.equal((await db.query(`select public.bk_prune_positions() as n`)).rows[0].n, 0);
});
