import { route, uuid } from '../../../../src/server/http.js';
import { authenticate } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';

// Public seat map. Signed-in passengers also see their own active hold.
export default route({
  async GET(req) {
    const id = uuid(req.query.id, 'Trip');
    const user = await authenticate(req).catch(() => null);
    return unwrap(await db().rpc('bk_trip_seat_map', { p_trip: id, p_user: user?.id ?? null }));
  },
});
