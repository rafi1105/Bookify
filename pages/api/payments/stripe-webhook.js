import { route, HttpError } from '../../../src/server/http.js';
import { db, unwrap } from '../../../src/server/db.js';
import { client } from '../../../src/server/gateways/stripe.js';

export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default route({
  async POST(req) {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) throw new HttpError(503, 'Stripe is not configured');
    let event;
    try {
      event = client().webhooks.constructEvent(await rawBody(req), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new HttpError(400, 'Invalid signature');
    }
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      if (s.payment_status === 'paid' && s.client_reference_id) {
        unwrap(await db().rpc('bk_confirm_payment', {
          p_reference: s.client_reference_id, p_amount: s.amount_total / 100, p_currency: String(s.currency).toUpperCase(),
          p_transaction: typeof s.payment_intent === 'string' ? s.payment_intent : s.id, p_payload: { id: s.id, event: event.id },
        }));
      }
    }
    return { received: true };
  },
  allowCrossSite: true,
});
