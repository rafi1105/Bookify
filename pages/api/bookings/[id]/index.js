import { route, uuid } from '../../../../src/server/http.js';
import { requireUser } from '../../../../src/server/auth.js';
import { loadBooking } from '../../../../src/server/bookings.js';

export default route({
  async GET(req) {
    const user = await requireUser(req);
    return loadBooking({ id: uuid(req.query.id, 'Booking'), userId: user.id });
  },
});
