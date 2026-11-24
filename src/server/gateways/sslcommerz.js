// SSLCommerz hosted checkout (bKash, Nagad, Rocket, cards, internet banking).
const sandbox = () => process.env.SSLCOMMERZ_SANDBOX !== 'false';
const host = () => (sandbox() ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com');

export const method = 'SSLCOMMERZ';
export const label = 'bKash, Nagad, Rocket, cards and internet banking';

export function configured() {
  return Boolean(process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD);
}

export async function createCheckout({ reference, amount, booking, siteUrl }) {
  const params = new URLSearchParams({
    store_id: process.env.SSLCOMMERZ_STORE_ID,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
    total_amount: Number(amount).toFixed(2),
    currency: 'BDT',
    tran_id: reference,
    success_url: `${siteUrl}/api/payments/sslcommerz/return?result=success`,
    fail_url: `${siteUrl}/api/payments/sslcommerz/return?result=fail`,
    cancel_url: `${siteUrl}/api/payments/sslcommerz/return?result=cancel`,
    ipn_url: `${siteUrl}/api/payments/sslcommerz/ipn`,
    shipping_method: 'NO',
    product_name: `Bus ticket ${booking.pnr}`,
    product_category: 'Bus ticket',
    product_profile: 'non-physical-goods',
    cus_name: booking.contact_name,
    cus_email: booking.contact_email,
    cus_phone: booking.contact_phone,
    cus_add1: 'Bangladesh',
    cus_city: 'Dhaka',
    cus_country: 'Bangladesh',
    value_a: booking.id,
  });
  const response = await fetch(`${host()}/gwprocess/v4/api.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status !== 'SUCCESS' || !body.GatewayPageURL) {
    console.error('SSLCommerz session failed', body.status, body.failedreason);
    throw new Error('The payment provider could not start the payment');
  }
  return { url: body.GatewayPageURL };
}

// Server-to-server validation of a callback. Never trust the browser post on its own.
export async function validate(valId) {
  if (!valId) return null;
  const url = `${host()}/validator/api/validationserverAPI.php?` + new URLSearchParams({
    val_id: valId, store_id: process.env.SSLCOMMERZ_STORE_ID, store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD, format: 'json',
  });
  const response = await fetch(url);
  if (!response.ok) return null;
  const body = await response.json().catch(() => null);
  if (!body || !['VALID', 'VALIDATED'].includes(body.status)) return null;
  return {
    reference: body.tran_id,
    amount: Number(body.currency_amount || body.amount),
    currency: body.currency_type === 'BDT' || body.currency === 'BDT' ? 'BDT' : body.currency_type || body.currency,
    transaction: body.bank_tran_id || body.tran_id,
    payload: body,
  };
}
