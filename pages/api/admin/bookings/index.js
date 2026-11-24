import { route } from '../../../../src/server/http.js';
import { requireAdmin } from '../../../../src/server/auth.js';
import { listBookings } from '../../../../src/server/bookingList.js';

export default route({
  async GET(req) {
    await requireAdmin(req);
    return { bookings: await listBookings() };
  },
});
