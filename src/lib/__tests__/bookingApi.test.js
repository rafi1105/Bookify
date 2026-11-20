import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import Stripe from 'stripe';
import app from '../../server/app.js';

test('Express validates Stripe signatures and enforces signed demo roles', async (t) => {
  process.env.BOOKIFY_DEMO = 'true';
  process.env.DEMO_SESSION_SECRET = 'test-cookie-secret-with-at-least-32-characters';
  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fixture';
  const server = app.listen(0, '127.0.0.1');
  t.after(() => server.close());
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  const send = (path, body, headers = {}) => fetch(base + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  assert.equal((await fetch(base + '/api/workspace')).status, 403);
  const login = await send('/api/session', { role: 'passenger' });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.match(login.headers.get('set-cookie'), /HttpOnly/);
  assert.equal((await fetch(base + '/api/workspace', { headers: { cookie } })).status, 403);
  assert.equal((await (await fetch(base + '/api/session', { headers: { cookie: cookie + 'A' } })).json()).user, null);
  assert.equal((await send('/api/session', { role: 'admin' }, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  const event = { id: 'evt_test', type: 'other.event', data: { object: {} } };
  assert.equal((await send('/api/stripe/webhook', event, { 'Stripe-Signature': 'invalid' })).status, 400);
  const signature = new Stripe('sk_test_fixture').webhooks.generateTestHeaderString({
    payload: JSON.stringify(event), secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  assert.equal((await send('/api/stripe/webhook', event, { 'Stripe-Signature': signature })).status, 200);
});
