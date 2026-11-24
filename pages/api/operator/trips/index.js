import { route, uuid, money, isoDate, HttpError } from '../../../../src/server/http.js';
import { requireVendor } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';

const one = (v) => (Array.isArray(v) ? v[0] : v);

export default route({
  async GET(req) {
    const { vendor } = await requireVendor(req);
    const scope = req.query.scope === 'past' ? 'past' : 'upcoming';
    let query = db().from('trips')
      .select('id,status,departure_at,arrival_at,fare,cancel_reason,routes(start_point,end_point),buses(name,reg_no,bus_capacities(capacity_value))')
      .eq('vendor_id', vendor.id).limit(200);
    query = scope === 'past'
      ? query.lt('departure_at', new Date().toISOString()).order('departure_at', { ascending: false })
      : query.gte('departure_at', new Date().toISOString()).order('departure_at');
    const trips = unwrap(await query);
    const ids = trips.map((t) => t.id);
    const items = ids.length ? unwrap(await db().from('booking_items').select('trip_id').in('trip_id', ids).eq('status', 'CONFIRMED')) : [];
    const sold = {};
    for (const i of items) sold[i.trip_id] = (sold[i.trip_id] || 0) + 1;
    return {
      trips: trips.map((t) => ({
        id: t.id, status: t.status, departureAt: t.departure_at, arrivalAt: t.arrival_at, fare: Number(t.fare), cancelReason: t.cancel_reason,
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
