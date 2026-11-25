import { HttpError } from '../../../src/server/http.js';
import { fixesSince, requireStaff, snapshot } from '../../../src/server/tracking.js';

// Server-sent events for the live map: a full snapshot at once and every 30 seconds, and each new GPS
// fix within about 2 seconds of it arriving. The browser reads it with fetch (so the sign-in token goes
// in a header, not the URL) and reconnects when the stream ends. A stream lasts under a minute so it
// fits serverless time limits (Vercel Hobby).
export const config = { maxDuration: 60, api: { responseLimit: false } };

const LIFETIME_MS = 50000;
const FIX_POLL_MS = 2000;
const SNAPSHOT_MS = 30000;

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  let staff;
  try { staff = await requireStaff(req); } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({ error: error instanceof HttpError ? error.message : 'Something went wrong on our side.' });
  }
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  let open = true;
  req.on('close', () => { open = false; });
  const send = (event, data) => { if (open) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };

  const started = Date.now();
  let lastFix = new Date().toISOString();
  let lastSnapshot = 0;
  try {
    while (open && Date.now() - started < LIFETIME_MS) {
      if (Date.now() - lastSnapshot >= SNAPSHOT_MS) {
        send('snapshot', await snapshot(staff));
        lastSnapshot = Date.now();
      } else {
        const fixes = await fixesSince(staff, lastFix);
        if (fixes.length) { lastFix = fixes[fixes.length - 1].receivedAt; send('fixes', fixes); } else if (open) res.write(': ping\n\n');
      }
      await new Promise((r) => setTimeout(r, FIX_POLL_MS));
    }
    send('reconnect', { afterMs: 500 });
  } catch (error) {
    console.error('Live map stream failed', error.message);
    send('failure', { error: error instanceof HttpError ? error.message : 'The live feed stopped. Reconnecting.' });
  }
  res.end();
}
