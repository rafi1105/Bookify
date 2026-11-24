import { route, uuid } from '../../../../src/server/http.js';
import { requireVendor } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';
import { imageUrl } from '../../../../src/server/validate.js';

// Availability (ACTIVE / OFF_DUTY), live condition and image URL of one of the operator's own buses.
export default route({
  async PATCH(req) {
    const { user, vendor } = await requireVendor(req);
    const id = uuid(req.query.id, 'Bus');
    const b = req.body || {};
    if ('imageUrl' in b) {
      const url = imageUrl(b.imageUrl);
      unwrap(await db().from('buses').update({ image_url: url }).eq('id', id).eq('vendor_id', vendor.id));
    }
    if (b.status || b.condition) {
      unwrap(await db().rpc('bk_set_bus_state', { p_actor: user.id, p_vendor: vendor.id, p_bus: id, p_status: b.status || null, p_condition: b.condition || null, p_note: b.note || null }));
    }
    return { ok: true };
  },
});
