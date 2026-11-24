import { route, uuid, text } from '../../../../src/server/http.js';
import { requireAdmin } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';

// Records that the money was sent back through the payment provider's dashboard.
export default route({
  async POST(req) {
    const admin = await requireAdmin(req);
    unwrap(await db().rpc('bk_mark_refunded', { p_admin: admin.id, p_booking: uuid(req.query.id, 'Booking'), p_reference: text(req.body?.reference, { min: 3, max: 120, label: 'Refund reference' }) }));
    return { ok: true };
  },
});
