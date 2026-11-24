import { route, uuid, money, isoDate, HttpError } from '../../../../src/server/http.js';
import { requireVendor } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';
import { syncTripStatus } from '../../../../src/server/tripSync.js';

const one = (v) => (Array.isArray(v) ? v[0] : v);

export default route({
  async GET(req) {
    const { vendor } = await requireVendor(req);
    const scope = req.query.scope === 'past' ? 'past' : 'upcoming';
    await syncTripStatus();
    const nowIso = new Date().toISOString();
    let query = db().from('trips')
      .select('id,status,departure_at,arrival_at,dep_delay_min,traffic_delay_min,delay_cause,delay_note,fare,cancel_reason,routes(start_point,end_point),buses(name,reg_no,bus_capacities(capacity_value))')
      .eq('vendor_id', vendor.id).limit(200);
    query = scope === 'past'
      ? query.or(`status.eq.COMPLETED,and(status.eq.CANCELLED,departure_at.lt.${nowIso})`).order('departure_at', { ascending: false })
      : query.or(`status.in.(SCHEDULED,BOARDING,DELAYED,EN_ROUTE),and(status.eq.CANCELLED,departure_at.gte.${nowIso})`).order('departure_at');
    const trips = unwrap(await query);
    const ids = trips.map((t) => t.id);
    const items = ids.length ? unwrap(await db().from('booking_items').select('trip_id').in('trip_id', ids).eq('status', 'CONFIRMED')) : [];
    const sold = {};
    for (const i of items) sold[i.trip_id] = (sold[i.trip_id] || 0) + 1;
    return {
      trips: trips.map((t) => ({
        id: t.id, status: t.status, scheduledDepartureAt: t.departure_at,
        departureAt: new Date(new Date(t.departure_at).getTime() + t.dep_delay_min * 60000).toISOString(),
        arrivalAt: new Date(new Date(t.arrival_at).getTime() + (t.dep_delay_min + t.traffic_delay_min) * 60000).toISOString(), depDelayMin: t.dep_delay_min, trafficDelayMin: t.traffic_delay_min, delayCause: t.delay_cause, delayNote: t.delay_note, fare: Number(t.fare), cancelReason: t.cancel_reason,
        origin: one(t.routes).start_point, destination: one(t.routes).end_point, bus: one(t.buses).name, regNo: one(t.buses).reg_no,
        capacity: one(one(t.buses).bus_capacities).capacity_value, sold: sold[t.id] || 0,
      })),
    };
  },
  // Create a schedule: one or many dated trips.
  async POST(req) {
    const { vendor } = await requireVendor(req, { approvedOnly: true });
    const b = req.body || {};
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time || '')) throw new HttpError(400, 'Choose a departure time');
    const days = Array.isArray(b.days) ? b.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [];
    const result = unwrap(await db().rpc('bk_create_schedule', {
      p_vendor: vendor.id, p_bus: uuid(b.busId, 'Bus'), p_permission: uuid(b.permissionId, 'Route'), p_departure: b.time,
      p_days: days, p_from: isoDate(b.from, 'Start date'), p_until: isoDate(b.until, 'End date'),
      p_fare: money(b.fare, { min: 50, max: 20000, label: 'Fare' }),
    }));
    return result;
  },
});
