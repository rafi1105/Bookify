import { route } from '../../../src/server/http.js';
import { requireVendor } from '../../../src/server/auth.js';
import { db, unwrap } from '../../../src/server/db.js';
import { syncTripStatus } from '../../../src/server/tripSync.js';

export default route({
  async GET(req) {
    const { vendor } = await requireVendor(req);
    await syncTripStatus();
    return { buses: unwrap(await db().rpc('bk_fleet_status', { p_vendor: vendor.id })), now: new Date().toISOString() };
  },
});
