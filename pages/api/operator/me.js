import { route } from '../../../src/server/http.js';
import { requireVendor } from '../../../src/server/auth.js';
import { db, unwrap } from '../../../src/server/db.js';

export default route({
  async GET(req) {
    const { vendor } = await requireVendor(req);
    const brand = unwrap(await db().from('bus_operators').select('operator_name').eq('vendor_id', vendor.id).limit(1).maybeSingle());
    return {
      id: vendor.id, company: vendor.company_name, brand: brand?.operator_name, licenseNo: vendor.license_no,
      approval: vendor.approval_status, status: vendor.status, rejectionReason: vendor.rejection_reason,
    };
  },
});
