import { route } from '../../../../src/server/http.js';
import { requireAdmin } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';

export default route({
  async GET(req) {
    await requireAdmin(req);
    const rows = unwrap(await db().from('vendors').select('id,company_name,license_no,address,contact_phone,contact_email,approval_status,status,rejection_reason,created_at').order('created_at', { ascending: false }));
    return { operators: rows };
  },
});
