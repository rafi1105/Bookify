import { route, uuid } from '../../../../src/server/http.js';
import { requireAdmin } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';

export default route({
  async PATCH(req) {
    const admin = await requireAdmin(req);
    const b = req.body || {};
    unwrap(await db().rpc('bk_set_bus_state', { p_actor: admin.id, p_vendor: null, p_bus: uuid(req.query.id, 'Bus'), p_status: b.status || null, p_condition: b.condition || null, p_note: b.note || null }));
    return { ok: true };
  },
});
