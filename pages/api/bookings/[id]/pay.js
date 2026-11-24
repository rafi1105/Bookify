import { route, uuid, HttpError } from '../../../../src/server/http.js';
import { requireUser } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';
import { activeGateway, siteUrl } from '../../../../src/server/gateways/index.js';

export default route({
  async POST(req) {
    const user = await requireUser(req);
    const gateway = activeGateway();
    if (!gateway) throw new HttpError(503, 'Online payment is not available right now. Please try again later.');
    const bookingId = uuid(req.query.id, 'Booking');
    const payment = unwrap(await db().rpc('bk_start_payment', {
      p_user: user.id, p_booking: bookingId, p_method: gateway.adapter.method,
    }));
    const booking = unwrap(await db().from('bookings').select('*').eq('id', bookingId).single());
    try {
      const { url } = await gateway.adapter.createCheckout({
        reference: payment.reference, amount: payment.amount, booking, siteUrl: siteUrl(), expiresAt: payment.expires_at,
      });
      return { url };
    } catch (error) {
      console.error('Payment start failed', error.message);
      throw new HttpError(502, 'We could not reach the payment provider. Your seats are still held, please try again.');
    }
  },
});
