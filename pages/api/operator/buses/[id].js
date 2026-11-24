import { route, uuid } from '../../../../src/server/http.js';
import { requireVendor } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';
import { syncTripStatus } from '../../../../src/server/tripSync.js';
import { busDetail } from '../../../../src/server/busDetail.js';
import { removeBus, updateBus } from '../../../../src/server/crud.js';

// Edit details, availability and live condition of one of the operator's own buses, or delete it.
export default route({
  async GET(req) {
    const { vendor } = await requireVendor(req);
    return busDetail(uuid(req.query.id, 'Bus'), vendor.id);
  },
  async PATCH(req) {
    const { user, vendor } = await requireVendor(req);
    const id = uuid(req.query.id, 'Bus');
    const b = req.body || {};
    await updateBus(user.id, vendor.id, id, b);
    if (b.status || b.condition) {
      await syncTripStatus();
      unwrap(await db().rpc('bk_set_bus_state', { p_actor: user.id, p_vendor: vendor.id, p_bus: id, p_status: b.status || null, p_condition: b.condition || null, p_note: b.note || null, p_delay: b.delayMin ? Number(b.delayMin) : null }));
    }
    return { ok: true };
  },
  async DELETE(req) {
    const { user, vendor } = await requireVendor(req);
    await removeBus(user.id, vendor.id, uuid(req.query.id, 'Bus'));
    return { ok: true };
  },
});
