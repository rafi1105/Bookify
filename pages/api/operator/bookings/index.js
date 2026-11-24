import { route } from '../../../../src/server/http.js';
import { requireVendor } from '../../../../src/server/auth.js';
import { listBookings } from '../../../../src/server/bookingList.js';

// Bookings on this operator's own trips only.
export default route({
  async GET(req) {
    const { vendor } = await requireVendor(req);
    return { bookings: await listBookings({ vendorId: vendor.id }) };
  },
});
