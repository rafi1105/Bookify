import { route } from '../../../../src/server/http.js';
import { requireAdmin } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';
import { syncTripStatus } from '../../../../src/server/tripSync.js';

const one = (v) => (Array.isArray(v) ? v[0] : v);

export default route({
  async GET(req) {
    await requireAdmin(req);
    await syncTripStatus();
    const rows = unwrap(await db().from('trips')
      .select('id,status,departure_at,arrival_at,dep_delay_min,traffic_delay_min,delay_cause,fare,routes(start_point,end_point),buses(name,reg_no,bus_operators(operator_name))')
      .or(`status.in.(SCHEDULED,BOARDING,DELAYED,EN_ROUTE),and(status.eq.CANCELLED,departure_at.gte.${new Date().toISOString()})`).order('departure_at').limit(200));
    return { trips: rows.map((t) => ({ id: t.id, status: t.status, scheduledDepartureAt: t.departure_at, departureAt: new Date(new Date(t.departure_at).getTime() + t.dep_delay_min * 60000).toISOString(), arrivalAt: t.arrival_at, depDelayMin: t.dep_delay_min, trafficDelayMin: t.traffic_delay_min, delayCause: t.delay_cause, fare: Number(t.fare), origin: one(t.routes).start_point, destination: one(t.routes).end_point, bus: one(t.buses).name, regNo: one(t.buses).reg_no, operator: one(one(t.buses).bus_operators).operator_name })) };
  },
});
