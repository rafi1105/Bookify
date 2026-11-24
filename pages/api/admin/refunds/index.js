import { route } from '../../../../src/server/http.js';
import { requireAdmin } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';

const one = (v) => (Array.isArray(v) ? v[0] : v);

export default route({
  async GET(req) {
    await requireAdmin(req);
    const rows = unwrap(await db().from('bookings')
      .select('id,pnr,total_amount,refund_amount,cancelled_at,cancel_reason,contact_name,contact_phone,payments(payment_method,transaction_id),trips(departure_at,routes(start_point,end_point))')
      .eq('refund_status', 'PENDING').order('cancelled_at').limit(200));
    return { refunds: rows.map((b) => ({ ...b, payments: one(b.payments), trips: { ...one(b.trips), routes: one(one(b.trips).routes) } })) };
  },
});
