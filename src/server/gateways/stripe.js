import Stripe from 'stripe';

export const method = 'STRIPE';
export const label = 'Visa, Mastercard and other cards';

export function configured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function client() {
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function createCheckout({ reference, amount, booking, siteUrl, expiresAt }) {
  const expires = Math.max(Math.floor(new Date(expiresAt).getTime() / 1000), Math.floor(Date.now() / 1000) + 1800);
  const session = await client().checkout.sessions.create({
    mode: 'payment',
    client_reference_id: reference,
    customer_email: booking.contact_email,
    line_items: [{
      quantity: 1,
      price_data: { currency: 'bdt', unit_amount: Math.round(amount * 100), product_data: { name: `Bus ticket ${booking.pnr}` } },
    }],
    metadata: { reference, booking: booking.id },
    success_url: `${siteUrl}/bookings/${booking.id}?paid=1`,
    cancel_url: `${siteUrl}/checkout/${booking.id}`,
    expires_at: Math.min(expires, Math.floor(Date.now() / 1000) + 86000),
  });
  return { url: session.url };
}
