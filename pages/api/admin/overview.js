import { route, isoDate } from '../../../src/server/http.js';
import { requireAdmin } from '../../../src/server/auth.js';
import { db, unwrap } from '../../../src/server/db.js';
import { syncTripStatus } from '../../../src/server/tripSync.js';

const one = (v) => (Array.isArray(v) ? v[0] : v);
const count = async (q) => { const { count: n, error } = await q; if (error) unwrap({ error }); return n || 0; };

export default route({
  async GET(req) {
    await requireAdmin(req);
    await syncTripStatus();
    const [pendingRoutes, pendingRefunds, upcomingTrips, report, operators, buses, fleet, pendingList, trips, audit] = await Promise.all([
      count(db().from('route_permissions').select('id', { count: 'exact', head: true }).eq('status', 'PENDING')),
      count(db().from('bookings').select('id', { count: 'exact', head: true }).eq('refund_status', 'PENDING')),
      count(db().from('trips').select('id', { count: 'exact', head: true }).in('status', ['SCHEDULED', 'DELAYED'])),
      db().rpc('bk_sales_report', { p_vendor: null, p_from: isoDate(req.query.from, 'From'), p_to: isoDate(req.query.to, 'To') }).then(unwrap),
      count(db().from('vendors').select('id', { count: 'exact', head: true })),
      count(db().from('buses').select('id', { count: 'exact', head: true })),
      db().rpc('bk_fleet_status', { p_vendor: null }).then(unwrap),
      db().from('route_permissions').select('id,origin,destination,bus_type,proposed_fare,created_at,vendors(company_name)').eq('status', 'PENDING').order('created_at').limit(5).then(unwrap),
      db().from('trips').select('id,departure_at,fare,routes(start_point,end_point),buses(name,reg_no,bus_operators(operator_name))').in('status', ['SCHEDULED', 'DELAYED']).order('departure_at').limit(6).then(unwrap),
      db().from('audit_logs').select('action,created_at').order('created_at', { ascending: false }).limit(8).then(unwrap),
    ]);
    const states = {};
    for (const b of fleet) states[b.state] = (states[b.state] || 0) + 1;
    return {
      pendingRoutes, pendingRefunds, upcomingTrips, report, operators, buses, fleet: { total: fleet.length, states },
      pendingList: pendingList.map((p) => ({ ...p, vendors: one(p.vendors) })),
      upcoming: trips.map((t) => ({ id: t.id, departureAt: t.departure_at, fare: Number(t.fare), origin: one(t.routes).start_point, destination: one(t.routes).end_point, bus: one(t.buses).name, regNo: one(t.buses).reg_no, operator: one(one(t.buses).bus_operators).operator_name })),
      activity: audit.map((a) => ({ at: a.created_at, text: a.action.replace(/_/g, ' ').toLowerCase() })),
    };
  },
});
