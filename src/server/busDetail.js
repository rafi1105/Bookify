import { db, unwrap } from './db.js';
import { HttpError } from './http.js';
import { syncTripStatus } from './tripSync.js';

const one = (v) => (Array.isArray(v) ? v[0] : v);

// Everything known about one bus, from real data only: its record, current state derived from trip timing
// and status updates, its trips (past and upcoming) and its status history. No GPS and no simulation.
export async function busDetail(id, vendorId) {
  let query = db().from('buses')
    .select('id,code,name,model_no,reg_no,bus_type,status,condition,condition_note,condition_updated_at,image_url,amenities,created_at,vendor_id,bus_capacities(capacity_value,seat_layout_json),bus_operators(operator_name)')
    .eq('id', id);
  if (vendorId) query = query.eq('vendor_id', vendorId);
  const bus = unwrap(await query.maybeSingle());
  if (!bus) throw new HttpError(404, 'Bus not found');

  await syncTripStatus();
  const fleet = unwrap(await db().rpc('bk_fleet_status', { p_vendor: bus.vendor_id }));
  const live = fleet.find((b) => b.id === id) || null;

  const trips = unwrap(await db().from('trips')
    .select('id,status,departure_at,arrival_at,dep_delay_min,traffic_delay_min,delay_cause,fare,cancel_reason,routes(start_point,end_point)')
    .eq('bus_id', id).order('departure_at', { ascending: false }).limit(300));
  const ids = trips.map((t) => t.id);
  const items = ids.length ? unwrap(await db().from('booking_items').select('trip_id').in('trip_id', ids).eq('status', 'CONFIRMED')) : [];
  const sold = {};
  for (const i of items) sold[i.trip_id] = (sold[i.trip_id] || 0) + 1;

  const events = unwrap(await db().from('bus_status_events').select('id,kind,value,note,created_at,users(name)')
    .eq('bus_id', id).order('created_at', { ascending: false }).limit(60));

  const mapped = trips.map((t) => ({
    id: t.id, status: t.status, departureAt: new Date(new Date(t.departure_at).getTime() + t.dep_delay_min * 60000).toISOString(), arrivalAt: new Date(new Date(t.arrival_at).getTime() + (t.dep_delay_min + t.traffic_delay_min) * 60000).toISOString(), fare: Number(t.fare), cancelReason: t.cancel_reason,
    origin: one(t.routes).start_point, destination: one(t.routes).end_point, sold: sold[t.id] || 0,
    scheduledDepartureAt: t.departure_at, depDelayMin: t.dep_delay_min, trafficDelayMin: t.traffic_delay_min, delayCause: t.delay_cause,
    // Status is kept current by the simulation clock sync, so phases follow it rather than the wall clock.
    phase: t.status === 'CANCELLED' ? 'cancelled' : t.status === 'COMPLETED' ? 'completed' : t.status === 'EN_ROUTE' ? 'running' : 'upcoming',
  }));
  const capacity = bus.bus_capacities?.capacity_value || 0;
  const done = mapped.filter((t) => t.phase === 'completed');
  return {
    bus: {
      id: bus.id, code: bus.code, name: bus.name, modelNo: bus.model_no, regNo: bus.reg_no, busType: bus.bus_type, status: bus.status,
      condition: bus.condition, conditionNote: bus.condition_note, conditionUpdatedAt: bus.condition_updated_at, imageUrl: bus.image_url,
      amenities: bus.amenities || [], createdAt: bus.created_at, operator: one(bus.bus_operators)?.operator_name, vendorId: bus.vendor_id,
      capacity, layout: one(bus.bus_capacities)?.seat_layout_json,
    },
    live: live && { state: live.state, currentTrip: live.current_trip, nextTrip: live.next_trip, freeAt: live.free_at },
    totals: {
      trips: mapped.length, completed: done.length, cancelled: mapped.filter((t) => t.phase === 'cancelled').length,
      upcoming: mapped.filter((t) => t.phase === 'upcoming').length,
      seatsSold: mapped.reduce((n, t) => n + (t.phase === 'cancelled' ? 0 : t.sold), 0),
      occupancy: done.length && capacity ? Math.round((done.reduce((n, t) => n + t.sold, 0) / (done.length * capacity)) * 100) : null,
    },
    trips: mapped,
    events: events.map((e) => ({ id: e.id, kind: e.kind, value: e.value, note: e.note, at: e.created_at, by: one(e.users)?.name || null })),
  };
}
