import { route, uuid, HttpError } from '../../../../src/server/http.js';
import { requireUser } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';

export default route({
  async POST(req) {
    const user = await requireUser(req);
    const trip = uuid(req.query.id, 'Trip');
    const seats = req.body?.seats;
    if (!Array.isArray(seats) || seats.some((s) => typeof s !== 'string' || s.length > 10)) throw new HttpError(400, 'Choose your seats');
    const booking = unwrap(await db().rpc('bk_hold_seats', {
      p_user: user.id, p_trip: trip, p_seats: seats,
      p_boarding: uuid(req.body?.boardingId, 'Boarding point'), p_dropping: uuid(req.body?.droppingId, 'Dropping point'),
    }));
    return { bookingId: booking.id, pnr: booking.pnr, expiresAt: booking.expires_at, total: booking.total_amount };
  },
});
