import { route, uuid, text, HttpError } from '../../../../src/server/http.js';
import { requireAdmin } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';

const ACTIONS = {
  approve: { approval_status: 'APPROVED', status: 'ACTIVE', rejection_reason: null },
  reject: { approval_status: 'REJECTED' },
  suspend: { status: 'SUSPENDED' },
  reinstate: { status: 'ACTIVE' },
};

export default route({
  async PATCH(req) {
    const admin = await requireAdmin(req);
    const id = uuid(req.query.id, 'Operator');
    const action = req.body?.action;
    if (!ACTIONS[action]) throw new HttpError(400, 'Unknown action');
    const patch = { ...ACTIONS[action], decided_at: new Date().toISOString() };
    let reason = null;
    if (action === 'reject' || action === 'suspend') {
      reason = text(req.body?.reason, { min: 5, max: 300, label: 'Reason' });
      if (action === 'reject') patch.rejection_reason = reason;
    }
    unwrap(await db().from('vendors').update(patch).eq('id', id));
    unwrap(await db().from('audit_logs').insert({ actor_id: admin.id, action: `OPERATOR_${action.toUpperCase()}`, entity: 'vendor', entity_id: id, details: { reason } }));
    return { ok: true };
  },
});
