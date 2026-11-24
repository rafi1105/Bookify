import { route, uuid } from '../../../../src/server/http.js';
import { requireUser } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';
import { loadBooking } from '../../../../src/server/bookings.js';

export default route({
  async POST(req) {
    const user = await requireUser(req);
    const id = uuid(req.query.id, 'Booking');
    unwrap(await db().rpc('bk_cancel_booking', { p_user: user.id, p_booking: id, p_reason: String(req.body?.reason || '').slice(0, 300) }));
    return loadBooking({ id, userId: user.id });
  },
});
