export function paidCheckout(session, booking) {
  return session.livemode === false && session.id === booking.stripe_session &&
    session.metadata?.booking === booking.id && session.payment_status === 'paid' &&
    session.amount_total === booking.total && session.currency === 'bdt' &&
    typeof session.payment_intent === 'string';
}

export function seatLayout(type, count) {
  const columns = { AC: 3, 'Non-AC': 4, Sleeper: 2 }[type];
  if (!columns || !Number.isInteger(count) || count < 1 || count > 60) throw new Error('Invalid coach layout');
  return Array.from({ length: count }, (_, index) =>
    String(Math.floor(index / columns) + 1) + 'ABCD'[index % columns]);
}

export function departureInstant(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Enter a valid Dhaka departure');
  const local = new Date(value + ':00Z');
  if (!Number.isFinite(+local) || !local.toISOString().startsWith(value + ':00')) {
    throw new Error('Enter a valid Dhaka departure');
  }
  return new Date(+local - 6 * 3600000).toISOString();
}

export function resumableCheckout(order, checkout, now = Date.now()) {
  return order.state === 'held' && Date.parse(order.expires) > now &&
    checkout.id === order.stripe_session && checkout.metadata?.booking === order.id &&
    checkout.status === 'open' && checkout.payment_status === 'unpaid' && Boolean(checkout.url);
}
