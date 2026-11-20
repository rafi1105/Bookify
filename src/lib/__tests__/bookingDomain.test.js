import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paidCheckout, resumableCheckout, seatLayout, departureInstant } from '../../server/domain.js';

test('only paid card checkout with the expected identity, amount and currency can issue a ticket', () => {
  const booking = { id: 'order', total: 50000, stripe_session: 'session' };
  const session = { id: 'session', payment_status: 'paid', currency: 'bdt', amount_total: 50000,
    payment_intent: 'pi_paid', metadata: { booking: 'order' }, livemode: false };
  assert.equal(paidCheckout(session, booking), true);
  for (const change of [{ amount_total: 1 }, { currency: 'usd' }, { payment_status: 'unpaid' },
    { id: 'wrong' }, { metadata: {} }, { livemode: true }, { payment_intent: null }]) {
    assert.equal(paidCheckout({ ...session, ...change }, booking), false);
  }
});

test('coach classes have unique seats and correct row sizes', () => {
  assert.deepEqual(seatLayout('Sleeper', 3), ['1A', '1B', '2A']);
  assert.deepEqual(seatLayout('AC', 4), ['1A', '1B', '1C', '2A']);
  assert.deepEqual(seatLayout('Non-AC', 4), ['1A', '1B', '1C', '1D']);
});

test('convert Dhaka departures to UTC and reject impossible dates', () => {
  assert.equal(departureInstant('2030-06-01T00:15'), '2030-05-31T18:15:00.000Z');
  assert.throws(() => departureInstant('2030-02-30T00:15'));
});

test('resume uses only an open unpaid Stripe session for the original unexpired hold', () => {
  const order = { id: 'order', stripe_session: 'session', state: 'held', expires: '2030-01-01T00:10:00Z' };
  const stripe = { id: 'session', metadata: { booking: 'order' }, status: 'open',
    payment_status: 'unpaid', url: 'https://checkout.stripe.com/test' };
  const now = Date.parse('2030-01-01T00:05:00Z');
  assert.equal(resumableCheckout(order, stripe, now), true);
  assert.equal(resumableCheckout(order, stripe, Date.parse(order.expires)), false);
  assert.equal(resumableCheckout({ ...order, state: 'confirmed' }, stripe, now), false);
  for (const change of [{ status: 'expired' }, { payment_status: 'paid' }, { id: 'other' },
    { metadata: { booking: 'other' } }, { url: null }]) {
    assert.equal(resumableCheckout(order, { ...stripe, ...change }, now), false);
  }
});
