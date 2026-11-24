import { route } from '../../../../src/server/http.js';
import { requireAdmin } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';

const one = (v) => (Array.isArray(v) ? v[0] : v);

export default route({
  async GET(req) {
    await requireAdmin(req);
    const status = ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'].includes(req.query.status) ? req.query.status : 'PENDING';
    const rows = unwrap(await db().from('route_permissions')
      .select('id,origin,destination,boarding_points,dropping_points,bus_type,proposed_fare,proposed_duration_min,approved_fare,approved_duration_min,status,note,created_at,vendors(company_name)')
      .eq('status', status).order('created_at', { ascending: false }).limit(200));
    return { permissions: rows.map((p) => ({ ...p, vendors: one(p.vendors) })) };
  },
});
