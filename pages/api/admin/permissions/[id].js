import { route, uuid, money, int, text, HttpError } from '../../../../src/server/http.js';
import { requireAdmin } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';
import { removePermission } from '../../../../src/server/crud.js';

export default route({
  async PATCH(req) {
    const admin = await requireAdmin(req);
    const id = uuid(req.query.id, 'Request');
    const action = req.body?.action;
    if (action === 'approve') {
      // Admin may change the vendor's proposed fare and duration before approving.
      unwrap(await db().rpc('bk_approve_route_request', {
        p_admin: admin.id, p_permission: id, p_fare: money(req.body?.fare, { min: 50, max: 20000, label: 'Approved fare' }),
        p_duration: int(req.body?.durationMin, { min: 15, max: 1440, label: 'Duration (minutes)' }), p_note: req.body?.note || null,
      }));
      return { ok: true };
    }
    if (action === 'update') {
      // Change the approved fare and journey time of an approved route. Trips already published keep their own fare.
      const fare = money(req.body?.fare, { min: 50, max: 20000, label: 'Approved fare' });
      const durationMin = int(req.body?.durationMin, { min: 15, max: 1440, label: 'Duration (minutes)' });
      const rows = unwrap(await db().from('route_permissions').update({ approved_fare: fare, approved_duration_min: durationMin }).eq('id', id).eq('status', 'APPROVED').select('id'));
      if (!rows.length) throw new HttpError(409, 'Only approved routes can be edited');
      unwrap(await db().from('audit_logs').insert({ actor_id: admin.id, action: 'ROUTE_REQUEST_UPDATED', entity: 'route_permission', entity_id: id, details: { fare, durationMin } }));
      return { ok: true };
    }
    const patch = { decided_by: admin.id, decided_at: new Date().toISOString() };
    if (action === 'reject' || action === 'revoke') {
      patch.status = action === 'reject' ? 'REJECTED' : 'REVOKED';
      patch.note = text(req.body?.note, { min: 5, max: 300, label: 'Note' });
    } else throw new HttpError(400, 'Unknown action');
    unwrap(await db().from('route_permissions').update(patch).eq('id', id));
    unwrap(await db().from('audit_logs').insert({ actor_id: admin.id, action: `PERMISSION_${action.toUpperCase()}`, entity: 'route_permission', entity_id: id, details: patch }));
    return { ok: true };
  },
  async DELETE(req) {
    const admin = await requireAdmin(req);
    await removePermission(admin.id, null, uuid(req.query.id, 'Request'));
    return { ok: true };
  },
});
