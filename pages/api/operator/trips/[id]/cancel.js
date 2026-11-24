import { route, uuid, text } from '../../../../../src/server/http.js';
import { requireVendor } from '../../../../../src/server/auth.js';
import { db, unwrap } from '../../../../../src/server/db.js';

export default route({
  async POST(req) {
    const { user, vendor } = await requireVendor(req);
    return unwrap(await db().rpc('bk_cancel_trip', {
      p_actor: user.id, p_trip: uuid(req.query.id, 'Trip'), p_vendor: vendor.id, p_reason: text(req.body?.reason, { min: 5, max: 300, label: 'Reason' }),
    }));
  },
});
