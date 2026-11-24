import { route } from '../../../../src/server/http.js';
import { db, unwrap } from '../../../../src/server/db.js';
import { validate } from '../../../../src/server/gateways/sslcommerz.js';

// Server-to-server notification: confirms the booking even if the customer closes the browser.
export default route({
  async POST(req) {
    const verified = await validate(req.body?.val_id);
    if (!verified) return { ok: false };
    const outcome = unwrap(await db().rpc('bk_confirm_payment', {
      p_reference: verified.reference, p_amount: verified.amount, p_currency: verified.currency,
      p_transaction: verified.transaction, p_payload: verified.payload,
    }));
    return { ok: true, outcome: outcome.outcome };
  },
  allowCrossSite: true,
});
