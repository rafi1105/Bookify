import { route, uuid, money } from '../../../../../src/server/http.js';
import { requireAdmin } from '../../../../../src/server/auth.js';
import { removeTrip, updateTripFare } from '../../../../../src/server/crud.js';

export default route({
  async PATCH(req) {
    const admin = await requireAdmin(req);
    await updateTripFare(admin.id, null, uuid(req.query.id, 'Trip'), money(req.body?.fare, { min: 50, max: 20000, label: 'Fare' }));
    return { ok: true };
  },
  async DELETE(req) {
    const admin = await requireAdmin(req);
    await removeTrip(admin.id, null, uuid(req.query.id, 'Trip'));
    return { ok: true };
  },
});
