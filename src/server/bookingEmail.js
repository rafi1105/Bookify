import { dhakaTime, money } from '../lib/bookifyApi.js';

export async function sendBookingEmail(order, kind, settings = process.env, deliver = fetch) {
  const recipient = settings.BOOKIFY_EMAIL_TEST_RECIPIENT?.trim().toLowerCase();
  if (!settings.RESEND_API_KEY || !settings.BOOKIFY_EMAIL_FROM ||
      !recipient || recipient !== order.contact.toLowerCase()) return;

  const trip = order.bookify_trips;
  const route = trip.origin + ' → ' + trip.destination;
  const ticket = kind === 'ticket';
  const lines = ticket ? [
    'Bookify demo e-ticket',
    'Booking reference ' + order.id,
    route + ' · ' + trip.bus_name,
    'Departure ' + dhakaTime(trip.departure) + ' (Dhaka time)',
    'Arrival ' + dhakaTime(trip.arrival) + ' (Dhaka time)',
    'Board at ' + trip.boarding + ' · Drop off at ' + trip.dropping,
    order.passenger + ' · Seats ' + order.seats.join(', '),
    'Paid ' + money(order.total) + ' in Stripe test mode',
    'Cancel before departure for a full refund.',
  ] : [
    'Stripe confirmed your full test-mode refund of ' + money(order.total) + '.',
    'Booking reference ' + order.id,
    route,
    'The booking is closed.',
  ];

  const result = await deliver('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + settings.RESEND_API_KEY,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'bookify-' + kind + '-' + order.id,
    },
    body: JSON.stringify({
      from: settings.BOOKIFY_EMAIL_FROM,
      to: [recipient],
      subject: ticket ? 'Your Bookify demo e-ticket' : 'Your Bookify demo refund',
      text: lines.join('\n'),
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!result.ok) throw new Error('Booking email could not be sent');
}
