import { route } from '../../../src/server/http.js';
import { requireAdmin } from '../../../src/server/auth.js';
import { db, unwrap } from '../../../src/server/db.js';

export default route({
  async GET(req) {
    await requireAdmin(req);
    return { buses: unwrap(await db().rpc('bk_fleet_status', { p_vendor: null })), now: new Date().toISOString() };
  },
});
