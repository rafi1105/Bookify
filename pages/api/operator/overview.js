import { route } from '../../../src/server/http.js';
import { requireVendor } from '../../../src/server/auth.js';
import { db, unwrap } from '../../../src/server/db.js';
import { syncTripStatus } from '../../../src/server/tripSync.js';

const one = (v) => (Array.isArray(v) ? v[0] : v);
const count = async (q) => { const { count: n, error } = await q; if (error) unwrap({ error }); return n || 0; };

// Everything the operator overview needs beyond the sales numbers: setup progress, fleet summary,
// next departures and recent activity. All of it is real data.
export default route({
  async GET(req) {
    const { vendor } = await requireVendor(req);
    await syncTripStatus();
    const [buses, requested, approved, upcomingTrips, fleet, trips, events, decisions] = await Promise.all([
      count(db().from('buses').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id)),
      count(db().from('route_permissions').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id)),
      count(db().from('route_permissions').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id).eq('status', 'APPROVED')),
      count(db().from('trips').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id).in('status', ['SCHEDULED', 'DELAYED'])),
      db().rpc('bk_fleet_status', { p_vendor: vendor.id }).then(unwrap),
      db().from('trips').select('id,departure_at,fare,routes(start_point,end_point),buses(name,reg_no,bus_capacities(capacity_value))')
        .eq('vendor_id', vendor.id).in('status', ['SCHEDULED', 'DELAYED']).order('departure_at').limit(7).then(unwrap),
      db().from('bus_status_events').select('kind,value,note,created_at,buses!inner(code,name,vendor_id)').eq('buses.vendor_id', vendor.id).order('created_at', { ascending: false }).limit(8).then(unwrap),
      db().from('route_permissions').select('origin,destination,status,decided_at').eq('vendor_id', vendor.id).not('decided_at', 'is', null).order('decided_at', { ascending: false }).limit(5).then(unwrap),
    ]);

    const ids = trips.map((t) => t.id);
    const items = ids.length ? unwrap(await db().from('booking_items').select('trip_id').in('trip_id', ids).eq('status', 'CONFIRMED')) : [];
    const sold = {};
    for (const i of items) sold[i.trip_id] = (sold[i.trip_id] || 0) + 1;

    const states = {};
    for (const b of fleet) states[b.state] = (states[b.state] || 0) + 1;
    const activity = [
      ...events.map((e) => ({ at: e.created_at, text: `${one(e.buses).code} ${e.kind.toLowerCase()} set to ${String(e.value).replace(/_/g, ' ').toLowerCase()}${e.note ? ` (${e.note})` : ''}` })),
      ...decisions.map((d) => ({ at: d.decided_at, text: `Route ${d.origin} → ${d.destination} ${d.status.toLowerCase()}` })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);

    return {
      checklist: { buses, requested, approved, upcomingTrips },
      fleet: { total: fleet.length, states },
      upcoming: trips.slice(0, 6).map((t) => ({
        id: t.id, departureAt: t.departure_at, fare: Number(t.fare), origin: one(t.routes).start_point, destination: one(t.routes).end_point,
        bus: one(t.buses).name, regNo: one(t.buses).reg_no, capacity: one(one(t.buses).bus_capacities).capacity_value, sold: sold[t.id] || 0,
      })),
      activity,
    };
  },
});
