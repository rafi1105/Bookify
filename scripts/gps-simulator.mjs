#!/usr/bin/env node
// Drives a pretend bus along a real road and sends its GPS position to Bookify through the same
// ingest API a driver's phone uses. Use it to demo or test live tracking without a bus.
//
//   1. On the live map, select a bus that is on a trip and click "Driver link". Copy the link; the
//      token is the part after "#".
//   2. node scripts/gps-simulator.mjs --url http://localhost:3000 --token <token> --from Dhaka --to Rangpur
//
// Options: --speed 20   run 20x faster than real time (default 10)
//          --every 3    seconds between positions (default 3)
//          --jams 3     number of random traffic jams on the way (default 3; 0 for none)
// The bus slows to a crawl inside each jam, so the map colours that stretch from the measured speed.
import { parseArgs } from 'node:util';
import { measure, pointAt } from '../src/lib/map/geo.js';
import { rng } from '../src/lib/map/trafficSim.js';

const { values: a } = parseArgs({ options: {
  url: { type: 'string', default: 'http://localhost:3000' }, token: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' },
  speed: { type: 'string', default: '10' }, every: { type: 'string', default: '3' }, jams: { type: 'string', default: '3' }, seed: { type: 'string', default: String(Date.now()) },
} });
if (!a.token || !a.from || !a.to) {
  console.error('Usage: node scripts/gps-simulator.mjs --url http://localhost:3000 --token <driver link token> --from Dhaka --to Rangpur [--speed 10] [--every 3] [--jams 3]');
  process.exit(1);
}
const base = a.url.replace(/\/$/, '');
const speedUp = Math.max(1, Number(a.speed));
const everyS = Math.max(1, Number(a.every));

const dir = await fetch(`${base}/api/directions?from=${encodeURIComponent(a.from)}&to=${encodeURIComponent(a.to)}`);
if (!dir.ok) { console.error('Could not get the road:', (await dir.json().catch(() => ({}))).error || dir.status); process.exit(1); }
const { road } = await dir.json();
const line = measure(road.coords);
console.log(`Road ${a.from} → ${a.to}: ${line.length.toFixed(1)} km (${road.source}). Sending every ${everyS}s at ${speedUp}x.`);

const r = rng(a.seed);
const jams = Array.from({ length: Math.max(0, Number(a.jams)) }, () => {
  const at = line.length * (0.1 + 0.8 * r());
  return { from: at, to: at + 1 + r() * 4 };
});
const cruise = 50 + r() * 15;

let km = 0;
let sent = 0;
while (km < line.length) {
  const inJam = jams.some((j) => km >= j.from && km <= j.to);
  const v = inJam ? 3 + r() * 8 : cruise * (0.85 + r() * 0.3);
  const dtH = (everyS * speedUp) / 3600;
  km = Math.min(line.length, km + v * dtH);
  const { point, heading } = pointAt(line, km);
  const res = await fetch(`${base}/api/tracking/ingest`, {
    method: 'POST', headers: { Authorization: `Tracker ${a.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: point[0], lng: point[1], speedKmh: Math.round(v), heading, accuracy: 8 }),
  });
  if (!res.ok) { console.error('Rejected:', (await res.json().catch(() => ({}))).error || res.status); process.exit(1); }
  sent += 1;
  process.stdout.write(`\r${km.toFixed(1)}/${line.length.toFixed(1)} km · ${Math.round(v)} km/h${inJam ? ' (jam)' : ''} · ${sent} positions sent   `);
  await new Promise((done) => setTimeout(done, everyS * 1000));
}
console.log('\nArrived.');
