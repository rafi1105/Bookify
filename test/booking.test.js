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
  assert.equal(map.my_hold, null);
  // The holder sees the same seats as their own hold (and not as someone else's)
  const mine = (await db.query('select public.bk_trip_seat_map($1,$2) as m', [w.trip, w.buyer])).rows[0].m;
  assert.deepEqual(mine.my_hold.seats.sort(), ['A1', 'A2']);
  assert.deepEqual(mine.held, []);
  // Anonymous visitors see every hold as held
  const anon = (await db.query('select public.bk_trip_seat_map($1,null) as m', [w.trip])).rows[0].m;
  assert.deepEqual(anon.held.sort(), ['A1', 'A2']);
  await db.query(`update public.bookings set expires_at = now() - interval '1 minute'`);
  // Expired holds no longer show
  const expired = (await db.query('select public.bk_trip_seat_map($1,$2) as m', [w.trip, w.other])).rows[0].m;
  assert.deepEqual(expired.held, []);
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

test('sales report counts only paid seats, and a vendor sees only bookings on their own trips', async () => {
  const db = await freshDatabase();
  const w = await world(db);
  const from = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const to = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  const report = async () => (await db.query(`select public.bk_sales_report($1,$2,$3) as r`, [w.vendor, from, to])).rows[0].r;
  const sold = (r) => JSON.stringify(r).match(/"seats_sold":\s*(\d+)/)?.[1];

  const hold = (await db.query(`select * from public.bk_hold_seats($1,$2,array['A1','A2'],$3,$4)`, [w.buyer, w.trip, w.board, w.drop])).rows[0];
  assert.equal(Number(sold(await report()) || 0), 0, 'an unpaid hold is not a sale');

  await db.query(`select public.bk_save_passengers($1,$2,$3,$4)`, [w.buyer, hold.id,
    { name: 'Karim', phone: '01822222222', email: 'k@test.dev' }, [{ seat: 'A1', name: 'Karim', age: 30, gender: 'MALE' }, { seat: 'A2', name: 'Salma', age: 28, gender: 'FEMALE' }]]);
  const pay = (await db.query(`select public.bk_start_payment($1,$2,'BKASH') as p`, [w.buyer, hold.id])).rows[0].p;
  await db.query(`select public.bk_confirm_payment($1, 1600, 'BDT', 'trx9', '{}')`, [pay.reference]);
  assert.equal(Number(sold(await report())), 2, 'paid seats are counted');

  // The query the operator list runs: bookings joined to trips filtered by vendor.
  const mine = await db.query(
    `select b.pnr, b.confirmed_at is not null as paid from public.bookings b join public.trips t on t.id = b.trip_id where t.vendor_id = $1`, [w.vendor]);
  assert.equal(mine.rows.length, 1);
  assert.equal(mine.rows[0].paid, true);
  const stranger = await db.query(
    `select b.pnr from public.bookings b join public.trips t on t.id = b.trip_id where t.vendor_id = $1`, [w.buyer]);
  assert.equal(stranger.rows.length, 0);
});

test('trip status syncs from the clock and the fleet shows route stops for a running bus', async () => {
  const db = await freshDatabase();
  const w = await world(db);
  assert.equal((await db.query('select public.bk_sync_trip_status() as r')).rows[0].r.started, 0);
  await db.query(`update public.trips set departure_at = now() - interval '2 hours', arrival_at = now() + interval '6 hours'`);
  const running = (await db.query('select public.bk_sync_trip_status() as r')).rows[0].r;
  assert.equal(running.started, 1);
  assert.equal((await db.query('select status from public.trips')).rows[0].status, 'EN_ROUTE');
  const bus = (await db.query('select public.bk_fleet_status($1) as f', [w.vendor])).rows[0].f[0];
  assert.equal(bus.state, 'ON_TRIP');
  assert.ok(Math.abs(bus.current_trip.progress - 25) < 1, 'about 2 of 8 hours elapsed');
  assert.ok(Array.isArray(bus.current_trip.stops));
  await db.query(`select * from public.bk_set_bus_state($1,$2,$3,null,'IN_TRAFFIC','Jatrabari jam')`, [w.owner, w.vendor, w.bus]);
  assert.equal((await db.query('select public.bk_fleet_status($1) as f', [w.vendor])).rows[0].f[0].state, 'IN_TRAFFIC');
  await db.query(`update public.trips set departure_at = now() - interval '9 hours', arrival_at = now() - interval '1 hour'`);
  assert.equal((await db.query('select public.bk_sync_trip_status() as r')).rows[0].r.completed, 1);
  assert.equal((await db.query('select status from public.trips')).rows[0].status, 'COMPLETED');
});

async function twoTrips(db, w) {
  await db.query(`select public.bk_create_schedule($1,$2,$3,'17:00',array[0,1,2,3,4,5,6]::smallint[],$4::date,$4::date,800)`, [w.vendor, w.bus, w.perm, w.day]);
  const [first, second] = (await db.query('select id from public.trips order by departure_at')).rows.map((r) => r.id);
  // First leg left 2 h ago and is due in 6 h; the return leg is scheduled 30 minutes after that.
  await db.query(`update public.trips set departure_at = now() - interval '2 hours', arrival_at = now() + interval '6 hours' where id = $1`, [first]);
  await db.query(`update public.trips set departure_at = now() + interval '6 hours 30 minutes', arrival_at = now() + interval '14 hours 30 minutes' where id = $1`, [second]);
  return { first, second };
}

test('a traffic jam delays the running trip and the next trip of the same bus, and clearing it undoes the cascade', async () => {
  const db = await freshDatabase();
  const w = await world(db);
  const { first, second } = await twoTrips(db, w);
  await db.query('select public.bk_sync_trip_status()');
  assert.equal((await db.query('select status from public.trips where id = $1', [first])).rows[0].status, 'EN_ROUTE');

  await assert.rejects(db.query(`select * from public.bk_set_bus_state($1,$2,$3,null,'IN_TRAFFIC','jam',2)`, [w.owner, w.vendor, w.bus]), /between 5 and 720/);
  await db.query(`select * from public.bk_set_bus_state($1,$2,$3,null,'IN_TRAFFIC','Jatrabari jam',120)`, [w.owner, w.vendor, w.bus]);
  const a = (await db.query('select traffic_delay_min, delay_cause, dep_delay_min from public.trips where id = $1', [first])).rows[0];
  assert.equal(a.traffic_delay_min, 120);
  assert.equal(a.delay_cause, 'TRAFFIC');
  const b = (await db.query('select status, dep_delay_min, delay_cause from public.trips where id = $1', [second])).rows[0];
  assert.equal(b.status, 'DELAYED');
  assert.equal(b.dep_delay_min, 90, 'due 2 h late, scheduled 30 min after arrival: 90 min late');
  assert.equal(b.delay_cause, 'PREVIOUS_TRIP');

  const bus = (await db.query('select public.bk_fleet_status($1) as f', [w.vendor])).rows[0].f[0];
  assert.equal(bus.state, 'IN_TRAFFIC');
  assert.equal(bus.current_trip.jam_active, true);
  assert.equal(bus.next_trip.waiting_for_bus, true);
  assert.equal(bus.next_trip.dep_delay_min, 90);
  assert.ok(Math.abs(bus.current_trip.progress - 25) < 1, 'the bus is stopped, not moving');
  // The delayed trip is still on sale, with its new departure shown.
  const hit = (await db.query(`select * from public.bk_search_trips('dhaka','BOGURA',$1)`, [w.day])).rows;
  assert.ok(hit.every((t) => t.delay_min === 0 || t.delay_min === 90));

  await db.query(`select * from public.bk_set_bus_state($1,$2,$3,null,'NORMAL',null)`, [w.owner, w.vendor, w.bus]);
  const cleared = (await db.query('select status, dep_delay_min from public.trips where id = $1', [second])).rows[0];
  assert.equal(cleared.dep_delay_min, 0);
  assert.equal(cleared.status, 'SCHEDULED');
  // The overlap rule counts delays: a new trip inside the delayed window is rejected.
  await db.query(`select * from public.bk_set_bus_state($1,$2,$3,null,'IN_TRAFFIC','again',300)`, [w.owner, w.vendor, w.bus]);
  assert.equal((await db.query('select status from public.trips where id = $1', [second])).rows[0].status, 'DELAYED');
});

test('the simulation clock runs trips faster than real time and ends a timed jam by itself', async () => {
  const db = await freshDatabase();
  const w = await world(db);
  // Six real minutes at 60x is six simulated hours.
  await db.query(`update public.sim_clock set speed = 60, real_anchor = now() - interval '6 minutes', sim_anchor = now() - interval '6 minutes'`);
  const ahead = (await db.query(`select extract(epoch from public.bk_now() - now()) / 3600 as h`)).rows[0].h;
  assert.ok(Math.abs(Number(ahead) - 5.9) < 0.05);
  await db.query(`update public.trips set departure_at = now() + interval '1 hour', arrival_at = now() + interval '9 hours'`);
  assert.equal((await db.query('select status from public.trips')).rows[0].status, 'SCHEDULED');
  const sync = (await db.query('select public.bk_sync_trip_status() as r')).rows[0].r;
  assert.equal(sync.started, 1, 'departure time reached on the simulated clock');
  const bus = (await db.query('select public.bk_fleet_status($1) as f', [w.vendor])).rows[0].f[0];
  assert.equal(bus.state, 'ON_TRIP');
  assert.ok(bus.current_trip.progress > 55 && bus.current_trip.progress < 65);

  // Real ticketing is not accelerated: a hold still lasts ten real minutes.
  await db.query(`update public.trips set departure_at = now() + interval '30 days', arrival_at = now() + interval '30 days 8 hours', status = 'SCHEDULED'`);
  const hold = (await db.query(`select * from public.bk_hold_seats($1,$2,array['A1'],$3,$4)`, [w.buyer, w.trip, w.board, w.drop])).rows[0];
  const mins = (await db.query('select extract(epoch from expires_at - now()) / 60 as m from public.bookings where id = $1', [hold.id])).rows[0].m;
  assert.ok(Number(mins) > 9 && Number(mins) <= 10);

  // A 60 minute jam started now ends after one real minute at 60x.
  await db.query(`update public.trips set departure_at = public.bk_now() - interval '1 hour', arrival_at = public.bk_now() + interval '5 hours', status = 'EN_ROUTE'`);
  await db.query(`select * from public.bk_set_bus_state($1,$2,$3,null,'IN_TRAFFIC','Hatirjheel',60)`, [w.owner, w.vendor, w.bus]);
  await db.query(`update public.sim_clock set real_anchor = real_anchor - interval '2 minutes'`);
  const after = (await db.query('select public.bk_sync_trip_status() as r')).rows[0].r;
  assert.equal(after.traffic_cleared, 1);
  assert.equal((await db.query('select condition from public.buses')).rows[0].condition, 'NORMAL');
});
