import { sendBookingEmail } from './bookingEmail.js';
import express from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { departureInstant, paidCheckout, resumableCheckout, seatLayout } from './domain.js';

const app = express();
app.disable('x-powered-by');
const vendors = ['Demo Express', 'Demo Transit'];
const settings = process.env;

function failure(status, message) {
  throw Object.assign(new Error(message), { status });
}

function database() {
  if (!settings.SUPABASE_URL || !settings.SUPABASE_SERVICE_ROLE_KEY) failure(503, 'Supabase is not configured');
  return createClient(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function stripeClient() {
  if (!/^(sk|rk)_test_/.test(settings.STRIPE_SECRET_KEY || '')) failure(503, 'Stripe test checkout is not configured');
  return new Stripe(settings.STRIPE_SECRET_KEY);
}

async function read(query, conflict = false) {
  const { data, error } = await query;
  if (error) {
    if (conflict && ['P0001', '23505', '23514'].includes(error.code)) failure(409, error.message);
    console.error('Database operation failed', error.code);
    failure(503, 'The booking database could not complete the request');
  }
  return data;
}

function table(db, name) {
  return db.from('bookify_' + name);
}

function sign(token) {
  return createHmac('sha256', settings.DEMO_SESSION_SECRET).update(token).digest('base64url');
}

function session(req) {
  if (settings.BOOKIFY_DEMO !== 'true' || (settings.DEMO_SESSION_SECRET || '').length < 32) return null;
  const value = req.headers.cookie?.split(/; */).find((cookie) => cookie.startsWith('bookify='))?.slice(8);
  const [token, signature] = value?.split('.') || [];
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(signature || '')) return null;
  const expected = sign(token);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const user = JSON.parse(Buffer.from(token, 'base64url').toString());
  return user.expiry > Date.now() ? user : null;
}

function requireRole(req, ...roles) {
  const user = session(req);
  if (!user || !roles.includes(user.role)) failure(403, 'Sign in with the required role');
  return user;
}

function value(input, max = 100) {
  if (typeof input !== 'string' || !input.trim() || input.trim().length > max) failure(400, 'Check required text fields');
  return input.trim();
}

function uuid(input) {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input)) failure(400, 'Invalid record reference');
  return input;
}

function integer(input, min, max) {
  const number = Number(input);
  if (!Number.isInteger(number) || number < min || number > max) failure(400, 'A numeric field is outside its allowed range');
  return number;
}

const orderFields = 'id,trip_id,passenger,contact,seats,total,state,expires,created_at,bookify_trips(*)';

async function notifyBooking(db, kind, column, reference) {
  if (!settings.RESEND_API_KEY || !settings.BOOKIFY_EMAIL_FROM || !settings.BOOKIFY_EMAIL_TEST_RECIPIENT) return;
  const order = await read(table(db, 'orders').select(orderFields).eq(column, reference)
    .eq('state', kind === 'ticket' ? 'confirmed' : 'refunded').maybeSingle());
  if (order) await sendBookingEmail(order, kind);
}

async function refundOrder(db, stripe, order) {
  const refund = await stripe.refunds.create({ payment_intent: order.payment_intent }, {
    idempotencyKey: 'bookify-refund-' + order.id,
  });
  if (refund.status === 'succeeded') {
    await read(table(db, 'orders').update({ state: 'refunded' }).eq('id', order.id).eq('state', 'refund_required'));
    await notifyBooking(db, 'refund', 'id', order.id).catch(() => console.error('Refund email will be retried by the Stripe webhook'));
  } else if (refund.status !== 'pending') {
    failure(502, 'Stripe could not process the refund');
  }
}

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = stripeClient();
  if (!settings.STRIPE_WEBHOOK_SECRET) failure(503, 'Stripe webhook is not configured');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.get('stripe-signature'), settings.STRIPE_WEBHOOK_SECRET);
  } catch {
    failure(400, 'Invalid Stripe signature');
  }
  if (['refund.created', 'refund.updated'].includes(event.type) && !event.livemode && event.data.object.status === 'succeeded') {
    const refund = event.data.object;
    if (typeof refund.payment_intent === 'string') {
      const db = database();
      await read(table(db, 'orders').update({ state: 'refunded' })
        .eq('payment_intent', refund.payment_intent).eq('state', 'refund_required').eq('total', refund.amount));
      await notifyBooking(db, 'refund', 'payment_intent', refund.payment_intent);
    }
  }
  if (event.type === 'checkout.session.completed' && !event.livemode) {
    const payment = event.data.object;
    if (payment.metadata?.booking) {
      const db = database();
      const booking = await read(table(db, 'orders').select('*').eq('id', uuid(payment.metadata.booking)).maybeSingle());
      if (booking && paidCheckout(payment, booking)) {
        const order = await read(db.rpc('bookify_fulfill', { order_id: booking.id, intent: payment.payment_intent }).single());
        if (order.state === 'refund_required') await refundOrder(db, stripe, order);
        if (order.state === 'confirmed') await notifyBooking(db, 'ticket', 'id', order.id);
      }
    }
  }
  res.sendStatus(200);
});

app.use(express.json({ limit: '2mb' }));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'GET' && (!req.is('application/json') ||
      req.get('sec-fetch-site') === 'cross-site')) failure(403, 'Use the Bookify application to make changes');
  next();
});

app.get('/api/session', (req, res) => res.json({ user: session(req), vendors }));
app.post('/api/session', (req, res) => {
  if (settings.BOOKIFY_DEMO !== 'true' || (settings.DEMO_SESSION_SECRET || '').length < 32) {
    failure(503, 'Demo login is disabled');
  }
  const { role, vendor } = req.body;
  if (!['passenger', 'vendor', 'admin'].includes(role) || (role === 'vendor' && !vendors.includes(vendor))) {
    failure(400, 'Choose an available demo role');
  }
  const existing = session(req);
  const passengerId = existing?.passengerId || randomUUID();
  const user = { role, vendor: role === 'vendor' ? vendor : null, passengerId,
    id: role === 'passenger' ? passengerId : randomUUID(),
    expiry: Date.now() + 86400000 };
  const token = Buffer.from(JSON.stringify(user)).toString('base64url');
  res.cookie('bookify', token + '.' + sign(token), {
    httpOnly: true, sameSite: 'lax', secure: Boolean(settings.VERCEL), maxAge: 86400000,
  }).json({ user });
});
app.delete('/api/session', (req, res) => {
  res.clearCookie('bookify', { httpOnly: true, sameSite: 'lax', secure: Boolean(settings.VERCEL) }).json({});
});

app.get('/api/trips', async (req, res) => {
  const db = database();
  let query = table(db, 'trips').select('*').eq('cancelled', false)
    .gt('departure', new Date(Date.now() + 600000).toISOString()).order('departure').limit(100);
  for (const [filter, column] of [['from', 'origin'], ['to', 'destination'], ['coach', 'coach']]) {
    if (req.query[filter]) query = query.ilike(column, value(req.query[filter]).replace(/[%_\\]/g, ''));
  }
  if (req.query.date) {
    let start;
    try { start = departureInstant(req.query.date + 'T00:00'); } catch (error) { failure(400, error.message); }
    query = query.gte('departure', start).lt('departure', new Date(Date.parse(start) + 86400000).toISOString());
  }
  const [trips, suspended, buses] = await Promise.all([
    read(query), read(table(db, 'suspensions').select('vendor')),
    read(table(db, 'buses').select('id').eq('suspended', true)),
  ]);
  res.json(trips.filter((trip) => !suspended.some(({ vendor }) => vendor === trip.vendor) &&
    !buses.some(({ id }) => id === trip.bus_id)));
});

app.get('/api/trips/:id/seats', async (req, res) => {
  const db = database();
  const id = uuid(req.params.id);
  const [trip, orders] = await Promise.all([
    read(table(db, 'trips').select('seats,cancelled').eq('id', id).maybeSingle()),
    read(table(db, 'orders').select('seats,state,expires').eq('trip_id', id)),
  ]);
  if (!trip || trip.cancelled) failure(404, 'Trip is unavailable');
  const taken = new Set(orders.filter((order) => order.state === 'confirmed' ||
    (order.state === 'held' && Date.parse(order.expires) > Date.now())).flatMap((order) => order.seats));
  res.json(trip.seats.map((seat) => ({ seat, available: !taken.has(seat) })));
});

app.post('/api/checkout', async (req, res) => {
  const user = requireRole(req, 'passenger');
  const stripe = stripeClient();
  const db = database();
  if (settings.VERCEL && !settings.BOOKIFY_URL) failure(503, 'Bookify public URL is not configured');
  const base = new URL(settings.BOOKIFY_URL || 'http://localhost:5173').origin;
  const { trip, seats, passenger, contact } = req.body;
  const email = value(contact, 150);
  if (!/^\S+@\S+\.\S+$/.test(email) || !Array.isArray(seats) || seats.length < 1 || seats.length > 6 ||
      seats.some((seat) => typeof seat !== 'string' || !/^\d{1,2}[A-D]$/.test(seat))) failure(400, 'Check seats and email');
  const booking = await read(db.rpc('bookify_hold', {
    order_id: randomUUID(), trip: uuid(trip), buyer: user.id, requested: seats, rider: value(passenger), email,
  }).single(), true);
  let checkout;
  try {
    checkout = await stripe.checkout.sessions.create({
      mode: 'payment', payment_method_types: ['card'], customer_email: email,
      metadata: { booking: booking.id },
      success_url: base + '/my-bookings?payment=processing',
      cancel_url: base + '/my-bookings?payment=cancelled',
      expires_at: Math.floor(Date.now() / 1000) + 1860,
      line_items: [{ quantity: 1, price_data: { currency: 'bdt', unit_amount: booking.total,
        product_data: { name: 'Bookify bus ticket', description: 'Seats ' + booking.seats.join(', ') } } }],
    }, { idempotencyKey: booking.id });
    await read(table(db, 'orders').update({ stripe_session: checkout.id }).eq('id', booking.id));
  } catch (error) {
    if (checkout?.id) await stripe.checkout.sessions.expire(checkout.id).catch(() => {});
    await read(table(db, 'orders').update({ expires: new Date().toISOString() }).eq('id', booking.id).eq('state', 'held'));
    throw error;
  }
  res.status(201).json({ url: checkout.url });
});

app.get('/api/bookings', async (req, res) => {
  const user = requireRole(req, 'passenger');
  res.json(await read(table(database(), 'orders').select(orderFields).eq('customer', user.id)
    .order('created_at', { ascending: false }).limit(100)));
});

app.post('/api/bookings/:id/resume', async (req, res) => {
  const user = requireRole(req, 'passenger');
  const order = await read(table(database(), 'orders').select('id,state,expires,stripe_session')
    .eq('id', uuid(req.params.id)).eq('customer', user.id).maybeSingle());
  if (!order) failure(404, 'Booking not found');
  if (order.state !== 'held' || !order.stripe_session || Date.parse(order.expires) <= Date.now()) {
    failure(409, 'This seat hold is no longer available for payment');
  }
  const checkout = await stripeClient().checkout.sessions.retrieve(order.stripe_session);
  if (!resumableCheckout(order, checkout)) failure(409, 'This checkout is closed. Check your booking status.');
  res.json({ url: checkout.url });
});

app.post('/api/bookings/:id/cancel', async (req, res) => {
  const user = requireRole(req, 'passenger');
  const db = database();
  const stripe = stripeClient();
  const id = uuid(req.params.id);
  let order = await read(table(db, 'orders').select('*,bookify_trips(departure)').eq('id', id)
    .eq('customer', user.id).maybeSingle());
  if (!order) failure(404, 'Booking not found');
  if (order.state === 'confirmed' && Date.parse(order.bookify_trips.departure) > Date.now()) {
    const changed = await read(table(db, 'orders').update({ state: 'refund_required' })
      .eq('id', id).eq('state', 'confirmed').select().maybeSingle());
    if (changed) order = changed;
    else order = await read(table(db, 'orders').select('*').eq('id', id).single());
  }
  if (order.state === 'refund_required') await refundOrder(db, stripe, order);
  else if (order.state !== 'refunded') failure(409, 'Only tickets for future departures can be cancelled');
  res.json({});
});

app.post('/api/bookings/:id/review', async (req, res) => {
  const user = requireRole(req, 'passenger');
  const db = database();
  const order = await read(table(db, 'orders').select('id,bookify_trips(bus_id,arrival,cancelled)')
    .eq('id', uuid(req.params.id)).eq('customer', user.id).eq('state', 'confirmed').maybeSingle());
  if (!order || order.bookify_trips.cancelled || Date.parse(order.bookify_trips.arrival) > Date.now()) {
    failure(409, 'Reviews are available after a completed trip');
  }
  await read(table(db, 'reviews').upsert({ order_id: order.id, bus_id: order.bookify_trips.bus_id,
    rating: integer(req.body.rating, 1, 5) }));
  res.json({});
});

app.get('/api/workspace', async (req, res) => {
  const user = requireRole(req, 'vendor', 'admin');
  const db = database();
  function scope(query, column = 'vendor') {
    return user.role === 'vendor' ? query.eq(column, user.vendor) : query;
  }
  const [buses, proposals, trips, orders, suspensions] = await Promise.all([
    read(scope(table(db, 'buses').select('*')).limit(100)),
    read(scope(table(db, 'proposals').select('*')).limit(100)),
    read(scope(table(db, 'trips').select('*')).order('departure', { ascending: false }).limit(100)),
    read(scope(table(db, 'orders').select(orderFields.replace('bookify_trips(*)', 'bookify_trips!inner(*)')),
      'bookify_trips.vendor').order('created_at', { ascending: false }).limit(250)),
    read(scope(table(db, 'suspensions').select('*'))),
  ]);
  const ids = buses.map(({ id }) => id);
  const [incidents, reviews] = ids.length ? await Promise.all([
    read(table(db, 'incidents').select('*').in('bus_id', ids).order('created_at', { ascending: false }).limit(250)),
    read(table(db, 'reviews').select('bus_id,rating').in('bus_id', ids).limit(1000)),
  ]) : [[], []];
  res.json({ buses, proposals, trips, orders, incidents, reviews, suspensions, vendors });
});

app.post('/api/workspace/photos', async (req, res) => {
  const { vendor } = requireRole(req, 'vendor');
  const { mime, base64 } = req.body;
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mime];
  if (typeof extension !== 'string' || typeof base64 !== 'string' || base64.length > 1398104) {
    failure(400, 'Choose a JPEG, PNG or WebP photo under 1 MB');
  }
  const photo = Buffer.from(base64, 'base64');
  const valid = mime === 'image/jpeg' ? photo.subarray(0, 3).equals(Buffer.from([255, 216, 255])) :
    mime === 'image/png' ? photo.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) :
      photo.toString('ascii', 0, 4) === 'RIFF' && photo.toString('ascii', 8, 12) === 'WEBP';
  if (!valid || photo.length > 1048576) failure(400, 'Invalid image file');
  const bucket = database().storage.from('bookify-coaches');
  const path = vendor.toLowerCase().replaceAll(' ', '-') + '/' + randomUUID() + '.' + extension;
  const { error } = await bucket.upload(path, photo, { contentType: mime });
  if (error) failure(503, 'Could not upload photo');
  res.status(201).json({ url: bucket.getPublicUrl(path).data.publicUrl });
});

app.post('/api/workspace/buses', async (req, res) => {
  const { vendor } = requireRole(req, 'vendor');
  const { name, registration, coach, count, image } = req.body;
  if (!['AC', 'Non-AC', 'Sleeper'].includes(coach)) failure(400, 'Choose a coach class');
  let photo = null;
  if (image) {
    photo = value(image, 500);
    if (!/^https:\/\/[^\s]+$/i.test(photo)) failure(400, 'Use an HTTPS image URL');
  }
  const seats = seatLayout(coach, integer(count, 1, 60));
  await read(table(database(), 'buses').insert({ vendor, name: value(name), registration: value(registration).toUpperCase(),
    coach, seats, image: photo }), true);
  res.status(201).json({});
});

app.post('/api/workspace/proposals', async (req, res) => {
  const { vendor } = requireRole(req, 'vendor');
  const { origin, destination, boarding, dropping, fare } = req.body;
  await read(table(database(), 'proposals').insert({ vendor, origin: value(origin), destination: value(destination),
    boarding: value(boarding), dropping: value(dropping), fare: integer(fare, 100, 10000) * 100 }), true);
  res.status(201).json({});
});

app.post('/api/workspace/proposals/:id', async (req, res) => {
  requireRole(req, 'admin');
  const { decision, duration, reason } = req.body;
  if (!['approved', 'rejected'].includes(decision)) failure(400, 'Choose approve or reject');
  await read(database().rpc('bookify_decide_proposal', {
    proposal: uuid(req.params.id), accept: decision === 'approved',
    minutes: decision === 'approved' ? integer(duration, 15, 1440) : null,
    note: reason ? value(reason, 300) : null,
  }), true);
  res.json({});
});

app.post('/api/workspace/trips', async (req, res) => {
  const user = requireRole(req, 'vendor');
  let starts;
  try { starts = departureInstant(req.body.departure); } catch (error) { failure(400, error.message); }
  await read(database().rpc('bookify_publish_schedule', {
    bus: uuid(req.body.bus), proposal: uuid(req.body.proposal), operator: user.vendor, starts, occurrences: integer(req.body.occurrences ?? 1, 1, 14),
  }), true);
  res.status(201).json({});
});

app.post('/api/workspace/buses/:id', async (req, res) => {
  requireRole(req, 'admin');
  const db = database();
  const id = uuid(req.params.id);
  const { suspended, incident } = req.body;
  if (typeof suspended === 'boolean') await read(table(db, 'buses').update({ suspended }).eq('id', id));
  if (incident) await read(table(db, 'incidents').insert({ bus_id: id, note: value(incident, 400) }));
  res.json({});
});

app.post('/api/workspace/vendors', async (req, res) => {
  requireRole(req, 'admin');
  const { vendor, suspended, reason } = req.body;
  if (!vendors.includes(vendor) || typeof suspended !== 'boolean') failure(400, 'Invalid operator update');
  const db = database();
  await read(suspended ? table(db, 'suspensions').upsert({ vendor, reason: value(reason, 300) }) :
    table(db, 'suspensions').delete().eq('vendor', vendor));
  res.json({});
});

app.post('/api/workspace/trips/:id/cancel', async (req, res) => {
  const user = requireRole(req, 'vendor', 'admin');
  const db = database();
  const stripe = stripeClient();
  const id = uuid(req.params.id);
  const outstanding = await read(db.rpc('bookify_cancel_trip', {
    trip: id, operator: user.role === 'vendor' ? user.vendor : null,
  }), true);
  for (const order of outstanding) await refundOrder(db, stripe, order);
  res.json({});
});

app.use((req, res) => res.status(404).json({ error: 'API route not found' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status >= 400 && error.status < 600 ? error.status : 500;
  if (status === 500) console.error('Bookify request failed', error.type || error.name);
  res.status(status).json({ error: status === 500 ? 'The request could not be completed' : error.message });
});

export default app;
