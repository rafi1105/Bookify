import { route, uuid } from '../../../../src/server/http.js';
import { requireAdmin } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';
import { syncTripStatus } from '../../../../src/server/tripSync.js';
import { busDetail } from '../../../../src/server/busDetail.js';
import { removeBus, updateBus } from '../../../../src/server/crud.js';

export default route({
  async GET(req) {
    await requireAdmin(req);
    return busDetail(uuid(req.query.id, 'Bus'), null);
  },
  async PATCH(req) {
    const admin = await requireAdmin(req);
    const id = uuid(req.query.id, 'Bus');
    const b = req.body || {};
    await updateBus(admin.id, null, id, b);
    if (b.status || b.condition) {
      await syncTripStatus();
      unwrap(await db().rpc('bk_set_bus_state', { p_actor: admin.id, p_vendor: null, p_bus: id, p_status: b.status || null, p_condition: b.condition || null, p_note: b.note || null, p_delay: b.delayMin ? Number(b.delayMin) : null }));
    }
    return { ok: true };
  },
  async DELETE(req) {
    const admin = await requireAdmin(req);
    await removeBus(admin.id, null, uuid(req.query.id, 'Bus'));
    return { ok: true };
  },
});
