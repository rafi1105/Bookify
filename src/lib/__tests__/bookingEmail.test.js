import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendBookingEmail } from '../../server/bookingEmail.js';

test('ticket and refund emails include the booking and use distinct stable keys', async () => {
  const order = { id: 'booking-1', contact: 'demo@example.com', passenger: 'Demo Rider', seats: ['1A'], total: 80000,
    bookify_trips: { bus_name: 'Demo Coach', origin: 'Dhaka', destination: 'Bogura', boarding: 'Gabtoli',
      dropping: 'Terminal', departure: '2030-06-01T02:00:00Z', arrival: '2030-06-01T10:00:00Z' } };
  const settings = { BOOKIFY_EMAIL_TEST_RECIPIENT: order.contact, RESEND_API_KEY: 'test', BOOKIFY_EMAIL_FROM: 'bookify@example.com' };
  const messages = [];
  const deliver = async (_url, request) => { messages.push(request); return { ok: true }; };
  await sendBookingEmail(order, 'ticket', settings, deliver);
  await sendBookingEmail(order, 'refund', settings, deliver);
  await sendBookingEmail({ ...order, contact: 'someone@example.com' }, 'ticket', settings, deliver);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].headers['Idempotency-Key'], 'bookify-ticket-booking-1');
  assert.equal(messages[1].headers['Idempotency-Key'], 'bookify-refund-booking-1');
  assert.match(JSON.parse(messages[0].body).text, /Gabtoli[\s\S]*1A/);
  assert.match(JSON.parse(messages[1].body).subject, /refund/i);
});
