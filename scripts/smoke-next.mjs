import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import Stripe from 'stripe';

const socket = createServer().listen(0, '127.0.0.1');
await once(socket, 'listening');
const { port } = socket.address();
await new Promise((resolve) => socket.close(resolve));
const host = 'http://127.0.0.1:' + port;
const require = createRequire(import.meta.url);
const secret = 'whsec_next_smoke';
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
  stdio: 'inherit',
  env: { ...process.env, BOOKIFY_DEMO: 'true', DEMO_SESSION_SECRET: 'smoke-test-secret-with-over-32-characters',
    STRIPE_SECRET_KEY: 'sk_test_smoke', STRIPE_WEBHOOK_SECRET: secret },
});

try {
  const request = (path, options = {}) => fetch(host + path, { ...options, signal: AbortSignal.timeout(6000) });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error('Next.js exited before starting');
    if (await request('/api/session').then(() => true, () => false)) break;
    await delay(150);
  }

  for (const path of ['/', '/search?from=Dhaka&to=Bogura&class=sleeper', '/fleet', '/routes', '/operators',
    '/my-bookings?payment=processing', '/demo-tracker', '/workspace', '/contact']) {
    const result = await request(path);
    assert.equal(result.status, 200, path);
    assert.match(await result.text(), /<main\b/, path);
  }
  assert.equal((await request('/unknown-bookify-route')).status, 404);
  assert.equal((await request('/api/unknown')).status, 404);
  assert.equal((await request('/api/workspace')).status, 403);

  const login = await request('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'passenger' }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const session = await request('/api/session', { headers: { cookie } });
  assert.equal((await session.json()).user.role, 'passenger');

  const payload = '{ "id": "evt_next_smoke", "type": "ignored.smoke", "data": { "object": {} } }';
  const stripe = new Stripe('sk_test_smoke');
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  const webhook = (header) => request('/api/stripe/webhook', { method: 'POST', body: payload,
    headers: { 'Content-Type': 'application/json', 'Stripe-Signature': header } });
  assert.equal((await webhook(signature)).status, 200);
  assert.equal((await webhook('invalid')).status, 400);
  console.log('Next.js routes, session cookies, API authorization and raw Stripe signatures passed.');
} finally {
  child.kill();
}
