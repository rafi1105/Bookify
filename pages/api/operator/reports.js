import { route, isoDate } from '../../../src/server/http.js';
import { requireVendor } from '../../../src/server/auth.js';
import { db, unwrap } from '../../../src/server/db.js';

export default route({
  async GET(req) {
    const { vendor } = await requireVendor(req);
    return unwrap(await db().rpc('bk_sales_report', { p_vendor: vendor.id, p_from: isoDate(req.query.from, 'From'), p_to: isoDate(req.query.to, 'To') }));
  },
});
