import { route } from '../../../src/server/http.js';
import { requireStaff, snapshot } from '../../../src/server/tracking.js';

// Live map data for an operator (own buses) or an administrator (all operators).
export default route({
  async GET(req) {
    return snapshot(await requireStaff(req));
  },
});
