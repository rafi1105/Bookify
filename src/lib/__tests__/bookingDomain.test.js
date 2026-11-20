import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paidCheckout, seatLayout, departureInstant } from '../../server/domain.js';

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
