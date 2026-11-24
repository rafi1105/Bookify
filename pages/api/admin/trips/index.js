import { route } from '../../../../src/server/http.js';
import { requireAdmin } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';

const one = (v) => (Array.isArray(v) ? v[0] : v);

export default route({
  async GET(req) {
    await requireAdmin(req);
    const rows = unwrap(await db().from('trips')
      .select('id,status,departure_at,fare,routes(start_point,end_point),buses(name,reg_no,bus_operators(operator_name))')
      .gte('departure_at', new Date().toISOString()).order('departure_at').limit(200));
    return { trips: rows.map((t) => ({ id: t.id, status: t.status, departureAt: t.departure_at, fare: Number(t.fare), origin: one(t.routes).start_point, destination: one(t.routes).end_point, bus: one(t.buses).name, regNo: one(t.buses).reg_no, operator: one(one(t.buses).bus_operators).operator_name })) };
  },
});
