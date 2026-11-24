import { route, uuid } from '../../../../src/server/http.js';
import { requireAdmin } from '../../../../src/server/auth.js';
import { loadBooking } from '../../../../src/server/bookings.js';

export default route({
  async GET(req) {
    await requireAdmin(req);
    return loadBooking({ id: uuid(req.query.id, 'Booking') });
  },
});
