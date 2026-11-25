import { route, uuid } from '../../../src/server/http.js';
import { db, unwrap } from '../../../src/server/db.js';
import { assertBusAccess, hashToken, newToken, requireStaff } from '../../../src/server/tracking.js';

// Driver tracking link for one bus. Creating a new link replaces (and so revokes) the old one.
export default route({
  async POST(req) {
    const staff = await requireStaff(req);
    const bus = await assertBusAccess(staff, uuid(req.body?.busId, 'Bus'));
    const token = newToken();
    unwrap(await db().from('bus_trackers').upsert({ bus_id: bus.id, token_hash: hashToken(token), created_by: staff.user.id, created_at: new Date().toISOString(), last_seen_at: null }));
    await db().from('audit_logs').insert({ actor_id: staff.user.id, action: 'TRACKER_LINK', entity: 'buses', entity_id: bus.id, details: { code: bus.code } });
    return { token, path: `/drive#${token}` };
  },
  async DELETE(req) {
    const staff = await requireStaff(req);
    const bus = await assertBusAccess(staff, uuid(req.body?.busId || req.query.busId, 'Bus'));
    unwrap(await db().from('bus_trackers').delete().eq('bus_id', bus.id));
    return { ok: true };
  },
});
