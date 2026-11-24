import { route, uuid } from '../../../../src/server/http.js';
import { requireUser } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';

export default route({
  async POST(req) {
    const user = await requireUser(req);
    unwrap(await db().rpc('bk_release_hold', { p_user: user.id, p_booking: uuid(req.query.id, 'Booking') }));
    return { released: true };
  },
});
