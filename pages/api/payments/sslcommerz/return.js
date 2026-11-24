import { route } from '../../../../src/server/http.js';
import { db, unwrap } from '../../../../src/server/db.js';
import { siteUrl } from '../../../../src/server/gateways/index.js';
import { validate } from '../../../../src/server/gateways/sslcommerz.js';

// The customer's browser is POSTed back here. Validate with SSLCommerz, then send them to the booking.
async function bookingFor(reference) {
  if (!reference) return null;
  const pay = unwrap(await db().from('payments').select('booking_id').eq('gateway_session_id', reference).maybeSingle());
  return pay?.booking_id || null;
}

async function handle(req, res) {
  const body = req.body || {};
  const result = req.query.result;
  let bookingId = await bookingFor(body.tran_id);
  if (result === 'success') {
    const verified = await validate(body.val_id).catch(() => null);
    if (verified) {
      const outcome = unwrap(await db().rpc('bk_confirm_payment', {
        p_reference: verified.reference, p_amount: verified.amount, p_currency: verified.currency,
        p_transaction: verified.transaction, p_payload: verified.payload,
      }));
      bookingId = outcome.booking_id || bookingId;
    }
  } else if (body.tran_id) {
    unwrap(await db().rpc('bk_fail_payment', { p_reference: body.tran_id, p_payload: { result } }));
  }
  const target = bookingId ? `/bookings/${bookingId}?paid=${result === 'success' ? 1 : 0}` : '/account/bookings';
  res.redirect(303, siteUrl() + target);
}

export default route({ POST: handle, GET: handle, allowCrossSite: true });
