import { route, isoDate } from '../../../src/server/http.js';
import { requireAdmin } from '../../../src/server/auth.js';
import { db, unwrap } from '../../../src/server/db.js';

const count = async (q) => { const { count: n, error } = await q; if (error) unwrap({ error }); return n || 0; };

export default route({
  async GET(req) {
    await requireAdmin(req);
    const [pendingRoutes, pendingRefunds, upcomingTrips, report] = await Promise.all([
      count(db().from('route_permissions').select('id', { count: 'exact', head: true }).eq('status', 'PENDING')),
      count(db().from('bookings').select('id', { count: 'exact', head: true }).eq('refund_status', 'PENDING')),
      count(db().from('trips').select('id', { count: 'exact', head: true }).eq('status', 'SCHEDULED').gte('departure_at', new Date().toISOString())),
      db().rpc('bk_sales_report', { p_vendor: null, p_from: isoDate(req.query.from, 'From'), p_to: isoDate(req.query.to, 'To') }).then(unwrap),
    ]);
    return { pendingRoutes, pendingRefunds, upcomingTrips, report };
  },
});
