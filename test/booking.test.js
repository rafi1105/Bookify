import test from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from './helpers.js';

// Fixtures exist only inside this test database.
async function world(db) {
  const user = async (email, role = 1) => (await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, '{"name":"T"}') returning id`, [email])).rows[0].id;
  const owner = await user('owner@test.dev');
  const buyer = await user('buyer@test.dev');
  const other = await user('other@test.dev');
  const vendor = (await db.query(
    `insert into public.vendors (user_id, company_name, license_no, address, approval_status)
     values ($1,'Op','L-1','addr','APPROVED') returning id`, [owner])).rows[0].id;
  const operator = (await db.query(
    `insert into public.bus_operators (vendor_id, operator_name) values ($1,'Test Operator') returning id`, [vendor])).rows[0].id;
  const layout = { kind: 'SEAT', decks: [{ label: 'Main', rows: [['A1', 'A2', '', 'A3', 'A4'], ['B1', 'B2', '', 'B3', 'B4']] }] };
  const cap = (await db.query(
    `insert into public.bus_capacities (capacity_value, seat_layout_json, vendor_id, name)
     values (8, $1, $2, 'Std') returning id`, [layout, vendor])).rows[0].id;
  const bus = (await db.query(
    `insert into public.buses (operator_id, vendor_id, reg_no, model_no, name, bus_type, capacity_id)
     values ($1,$2,'DHK-1','M','Coach 1','AC_ECONOMY',$3) returning id`, [operator, vendor, cap])).rows[0].id;
  const perm = (await db.query(
    `insert into public.route_permissions (vendor_id, origin, destination, boarding_points, dropping_points, bus_type,
       proposed_fare, proposed_duration_min) values ($1,'Dhaka','Bogura',array['Gabtoli'],array['Bogura Terminal'],'AC_ECONOMY',900,360)
     returning id`, [vendor])).rows[0].id;
  // The admin changes the proposed 6 h to 8 h and the fare to 900.
  const approved = (await db.query(`select * from public.bk_approve_route_request($1,$2,900,480,'ok')`, [owner, perm])).rows[0];
  const route = approved.route_id;
  const stops = (await db.query(`select id, sequence_order from public.route_stops where permission_id = $1 order by sequence_order`, [perm])).rows;
  const day = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  const made = (await db.query(
    `select public.bk_create_schedule($1,$2,$3,'09:00',array[0,1,2,3,4,5,6]::smallint[],$4::date,$4::date,800) as r`,
    [vendor, bus, perm, day])).rows[0].r;
  const trip = (await db.query('select id from public.trips')).rows[0].id;
  return { owner, buyer, other, vendor, bus, route, perm, day, made, trip, board: stops[0].id, drop: stops[1].id };
}

test('schedule generation, search and seat map', async () => {
  const db = await freshDatabase();
  const w = await world(db);
  assert.equal(w.made.trips_created, 1);
  const hit = (await db.query(`select * from public.bk_search_trips('dhaka','BOGURA',$1)`, [w.day])).rows;
  assert.equal(hit.length, 1);
  assert.equal(hit[0].total_seats, 8);
  assert.equal(hit[0].available_seats, 8);
  assert.equal(Number(hit[0].fare), 800);
  const miss = (await db.query(`select * from public.bk_search_trips('Dhaka','Sylhet',$1)`, [w.day])).rows;
  assert.equal(miss.length, 0);
});

test('a seat can be held by only one buyer and expired holds are released', async () => {
  const db = await freshDatabase();
  const w = await world(db);
  await db.query(`select * from public.bk_hold_seats($1,$2,array['A1','A2'],$3,$4)`, [w.buyer, w.trip, w.board, w.drop]);
  await assert.rejects(
    db.query(`select * from public.bk_hold_seats($1,$2,array['A2','A3'],$3,$4)`, [w.other, w.trip, w.board, w.drop]),
    /just taken/);
  const map = (await db.query('select public.bk_trip_seat_map($1,$2) as m', [w.trip, w.other])).rows[0].m;
  assert.deepEqual(map.held.sort(), ['A1', 'A2']);
  await db.query(`update public.bookings set expires_at = now() - interval '1 minute'`);
  const again = await db.query(`select * from public.bk_hold_seats($1,$2,array['A2'],$3,$4)`, [w.other, w.trip, w.board, w.drop]);
  assert.equal(again.rows[0].seat_count, 1);
});

test('payment confirms once, bad amounts are disputed, and cancellation computes the refund', async () => {
  const db = await freshDatabase();
  const w = await world(db);
  const hold = (await db.query(`select * from public.bk_hold_seats($1,$2,array['B1'],$3,$4)`, [w.buyer, w.trip, w.board, w.drop])).rows[0];
  await db.query(`select public.bk_save_passengers($1,$2,$3,$4)`, [w.buyer, hold.id,
    { name: 'Rahim', phone: '01711111111', email: 'r@test.dev' }, [{ seat: 'B1', name: 'Rahim', age: 30, gender: 'MALE' }]]);
  const pay = (await db.query(`select public.bk_start_payment($1,$2,'SSLCOMMERZ') as p`, [w.buyer, hold.id])).rows[0].p;
  const bad = (await db.query(`select public.bk_confirm_payment($1, 1, 'BDT', 'tx1', '{}') as r`, [pay.reference])).rows[0].r;
  assert.equal(bad.outcome, 'AMOUNT_MISMATCH');
  const pay2 = (await db.query(`select public.bk_start_payment($1,$2,'SSLCOMMERZ') as p`, [w.buyer, hold.id])).rows[0].p;
  const ok = (await db.query(`select public.bk_confirm_payment($1, 800, 'BDT', 'tx2', '{}') as r`, [pay2.reference])).rows[0].r;
  assert.equal(ok.outcome, 'CONFIRMED');
  const dup = (await db.query(`select public.bk_confirm_payment($1, 800, 'BDT', 'tx2', '{}') as r`, [pay2.reference])).rows[0].r;
  assert.equal(dup.outcome, 'ALREADY_CONFIRMED');
  assert.equal((await db.query('select count(*)::int n from public.invoices')).rows[0].n, 1);

  // Departure is 3 days away: 90% refund.
  const cancelled = (await db.query(`select * from public.bk_cancel_booking($1,$2,'plans changed')`, [w.buyer, hold.id])).rows[0];
  assert.equal(Number(cancelled.refund_amount), 720);
  assert.equal(cancelled.refund_status, 'PENDING');
  const free = (await db.query(`select public.bk_trip_seat_map($1,$2) as m`, [w.trip, w.other])).rows[0].m;
  assert.deepEqual(free.booked, []);
});

test('operator cancellation refunds everyone in full, and overlapping bus schedules are rejected', async () => {
  const db = await freshDatabase();
  const w = await world(db);
  await assert.rejects(db.query(
    `select public.bk_create_schedule($1,$2,$3,'10:00',array[0,1,2,3,4,5,6]::smallint[],$4::date,$4::date,800)`,
    [w.vendor, w.bus, w.perm, w.day]), /still on another trip/);
  const hold = (await db.query(`select * from public.bk_hold_seats($1,$2,array['A1'],$3,$4)`, [w.buyer, w.trip, w.board, w.drop])).rows[0];
  await db.query(`select public.bk_save_passengers($1,$2,$3,$4)`, [w.buyer, hold.id,
    { name: 'Rahim', phone: '01711111111', email: 'r@test.dev' }, [{ seat: 'A1', name: 'Rahim', age: 30, gender: 'MALE' }]]);
  const pay = (await db.query(`select public.bk_start_payment($1,$2,'STRIPE') as p`, [w.buyer, hold.id])).rows[0].p;
  await db.query(`select public.bk_confirm_payment($1, 800, 'BDT', 'tx', '{}')`, [pay.reference]);
  const out = (await db.query(`select public.bk_cancel_trip($1,$2,$3,'Bus breakdown') as r`, [w.owner, w.trip, w.vendor])).rows[0].r;
  assert.equal(out.passenger_refunds, 1);
  const b = (await db.query('select refund_amount, refund_status from public.bookings')).rows[0];
  assert.equal(Number(b.refund_amount), 800);
  assert.equal(b.refund_status, 'PENDING');
  const gone = (await db.query(`select * from public.bk_search_trips('Dhaka','Bogura',$1)`, [w.day])).rows;
  assert.equal(gone.length, 0);
});

test('route requests: admin can change duration, the bus is free exactly when the trip ends, and fleet status is real', async () => {
  const db = await freshDatabase();
  const w = await world(db);
  const route = (await db.query('select travel_time_min, start_point from public.routes')).rows[0];
  assert.equal(route.travel_time_min, 480);
  const trip = (await db.query('select departure_at, arrival_at from public.trips')).rows[0];
  assert.equal((new Date(trip.arrival_at) - new Date(trip.departure_at)) / 60000, 480);
  // 9:00 + 8 h = 17:00, so a 17:00 departure is allowed straight after.
  const next = (await db.query(
    `select public.bk_create_schedule($1,$2,$3,'17:00',array[0,1,2,3,4,5,6]::smallint[],$4::date,$4::date,800) as r`,
    [w.vendor, w.bus, w.perm, w.day])).rows[0].r;
  assert.equal(next.trips_created, 1);
  // Playground: unique code, a bus with a future trip cannot go off duty, conditions are recorded.
  const fleet = (await db.query('select public.bk_fleet_status($1) as f', [w.vendor])).rows[0].f;
  assert.match(fleet[0].code, /^BUS-[A-Z2-9]{6}$/);
  assert.equal(fleet[0].state, 'AVAILABLE');
  assert.equal(fleet[0].next_trip.destination, 'Bogura');
  await assert.rejects(db.query(`select * from public.bk_set_bus_state($1,$2,$3,'OFF_DUTY',null,null)`, [w.owner, w.vendor, w.bus]), /Cancel those trips/);
  await db.query(`select * from public.bk_set_bus_state($1,$2,$3,null,'ACCIDENT','tyre burst')`, [w.owner, w.vendor, w.bus]);
  assert.equal((await db.query('select public.bk_fleet_status($1) as f', [w.vendor])).rows[0].f[0].state, 'ACCIDENT');
  assert.equal((await db.query('select count(*)::int n from public.bus_status_events')).rows[0].n, 1);
  // Another vendor cannot touch it.
  await assert.rejects(db.query(`select * from public.bk_set_bus_state($1,$2,$3,null,'NORMAL',null)`, [w.owner, w.buyer, w.bus]), /Bus not found/);
});
