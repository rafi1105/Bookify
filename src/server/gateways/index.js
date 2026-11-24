import * as sslcommerz from './sslcommerz.js';
import * as stripe from './stripe.js';

// Gateway adapters share: configured(), createCheckout({reference, amount, booking}) -> { url }
const ADAPTERS = { sslcommerz, stripe };

export function activeGateway() {
  const name = (process.env.PAYMENT_GATEWAY || '').toLowerCase();
  const adapter = ADAPTERS[name];
  return adapter?.configured() ? { name, adapter } : null;
}

export function siteUrl() {
  return (process.env.BOOKIFY_URL || 'http://localhost:3000').replace(/\/$/, '');
}
