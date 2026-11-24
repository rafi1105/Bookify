import { route, text } from '../../../src/server/http.js';
import { loadBooking } from '../../../src/server/bookings.js';

// Guest lookup: PNR + the mobile number used at booking. View and print only.
export default route({
  async POST(req) {
    const pnr = text(req.body?.pnr, { min: 6, max: 12, label: 'PNR' });
    const phone = text(req.body?.phone, { min: 10, max: 16, label: 'Mobile number' });
    const booking = await loadBooking({ pnr, phone });
    return booking;
  },
});
