import { route, uuid, money } from '../../../../../src/server/http.js';
import { requireVendor } from '../../../../../src/server/auth.js';
import { removeTrip, updateTripFare } from '../../../../../src/server/crud.js';

export default route({
  async PATCH(req) {
    const { user, vendor } = await requireVendor(req);
    await updateTripFare(user.id, vendor.id, uuid(req.query.id, 'Trip'), money(req.body?.fare, { min: 50, max: 20000, label: 'Fare' }));
    return { ok: true };
  },
  async DELETE(req) {
    const { user, vendor } = await requireVendor(req);
    await removeTrip(user.id, vendor.id, uuid(req.query.id, 'Trip'));
    return { ok: true };
  },
});
