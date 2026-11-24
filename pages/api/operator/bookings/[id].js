import { route, uuid } from '../../../../src/server/http.js';
import { requireVendor } from '../../../../src/server/auth.js';
import { loadBooking } from '../../../../src/server/bookings.js';

export default route({
  async GET(req) {
    const { vendor } = await requireVendor(req);
    return loadBooking({ id: uuid(req.query.id, 'Booking'), vendorId: vendor.id });
  },
});
