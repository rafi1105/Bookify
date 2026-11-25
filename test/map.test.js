import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, measure, pointAt, slice, locate, simplify } from '../src/lib/map/geo.js';
import { jamsAt, createRun, advance, remainingMs, punctuality, cruiseKmh, SLOT_MS } from '../src/lib/map/trafficSim.js';
import { lookupPlace } from '../src/lib/map/places.js';
import { operatorColor, OPERATOR_PALETTE } from '../src/lib/map/config.js';
import { BusTracker, movingMs } from '../src/lib/map/movement.js';
import { roadBetween, resetGeoMemory } from '../src/server/geo.js';
import { gpsTraffic } from '../src/server/tracking.js';

const DHAKA = [23.8103, 90.4125];
const BOGURA = [24.8481, 89.373];
const line = measure([DHAKA, [24.25, 89.92], BOGURA]);

test('geometry: distance, point along a line, slicing and locating', () => {
  const d = haversineKm(DHAKA, BOGURA);
  assert.ok(d > 150 && d < 160, `Dhaka-Bogura straight line ${d}`);
  assert.deepEqual(pointAt(line, 0).point, DHAKA);
  assert.deepEqual(pointAt(line, 1e6).point, BOGURA);
  const mid = pointAt(line, line.length / 2).point;
  assert.ok(Math.abs(locate(line, mid).km - line.length / 2) < 0.01);
  const part = slice(line, 10, 20);
  assert.ok(Math.abs(measure(part).length - 10) < 0.01);
  assert.equal(simplify([[0, 0], [0, 0.5], [0, 1]]).length, 2);
});

test('place names: aliases and stop names resolve to town coordinates', () => {
  assert.deepEqual(lookupPlace('Bogra'), BOGURA);
  assert.deepEqual(lookupPlace('Dhaka (Gabtoli)'), DHAKA);
  assert.deepEqual(lookupPlace("Cox's Bazar"), lookupPlace('Coxs Bazar'));
  assert.deepEqual(lookupPlace('Chittagong'), lookupPlace('Chattogram'));
  assert.equal(lookupPlace('Atlantis'), null);
});

test('operator colours: chosen colour wins, otherwise a stable palette colour', () => {
  assert.equal(operatorColor('x', '#ABCDEF'), '#abcdef');
  assert.ok(OPERATOR_PALETTE.includes(operatorColor('op-1')));
  assert.equal(operatorColor('op-1'), operatorColor('op-1'));
});

test('simulated jams are the same on every screen, change over time and can be turned off', () => {
  const t = Date.UTC(2026, 10, 25, 6);
  assert.deepEqual(jamsAt('road', 200, t), jamsAt('road', 200, t));
  assert.deepEqual(jamsAt('road', 200, t, { enabled: false }), []);
  let seen = 0; const ids = new Set();
  for (let i = 0; i < 48; i += 1) for (const j of jamsAt('road', 200, t + i * SLOT_MS)) { seen += 1; ids.add(j.id); assert.ok(j.fromKm >= 0 && j.toKm <= 200 && j.toKm > j.fromKm); }
  assert.ok(seen > 5 && ids.size > 5, 'a day has several different jams');
});

test('a simulated bus covers the road on time without jams and is slowed by jams', () => {
  const dep = Date.UTC(2026, 10, 25, 3);
  const free = createRun({ key: 'k', lengthKm: line.length, durationMin: 300, departMs: dep, jams: false });
  assert.ok(advance(free, 300 * 60000).arrived, 'arrives within the scheduled time');
  const half = createRun({ key: 'k', lengthKm: line.length, durationMin: 300, departMs: dep, jams: false });
  const p = advance(half, 150 * 60000);
  assert.ok(p.km > line.length * 0.35 && p.km < line.length * 0.7, `halfway-ish: ${p.km}`);
  assert.ok(p.speedKmh > 10 && p.speedKmh < 90);
  assert.ok(cruiseKmh(10, 600) === 20 && cruiseKmh(1000, 60) === 90);
  // Run many days: with jams the bus is never ahead of the jam-free run.
  for (let d = 0; d < 10; d += 1) {
    const a = createRun({ key: `k${d}`, lengthKm: line.length, durationMin: 300, departMs: dep + d * 864e5, jams: true });
    const b = createRun({ key: `k${d}`, lengthKm: line.length, durationMin: 300, departMs: dep + d * 864e5, jams: false });
    assert.ok(advance(a, 200 * 60000).km <= advance(b, 200 * 60000).km + 1e-9);
  }
  assert.ok(remainingMs(half, p.km, dep + 150 * 60000) > 0);
});

test('punctuality labels', () => {
  const s = Date.UTC(2026, 0, 1, 12);
  assert.equal(punctuality(s + 5 * 60000, s).status, 'ON_TIME');
  assert.equal(punctuality(s + 12 * 60000, s).status, 'ON_TIME');
  assert.equal(punctuality(s + 20 * 60000, s).status, 'LATE');
  assert.deepEqual(punctuality(s + 95 * 60000, s), { status: 'VERY_LATE', label: '1h 35m late', delayMin: 95 });
  assert.equal(punctuality(s, s, true).status, 'STOPPED');
});

const trip = (over = {}) => ({ id: 't1', origin: 'Dhaka', destination: 'Bogura', departure_at: new Date(Date.UTC(2026, 10, 25, 3)).toISOString(), arrival_at: new Date(Date.UTC(2026, 10, 25, 8)).toISOString(), scheduled_arrival_at: new Date(Date.UTC(2026, 10, 25, 8)).toISOString(), duration_min: 300, traffic_delay_min: 0, jam_prior_min: 0, ...over });

test('moving time stops in a reported jam and at an accident', () => {
  const dep = Date.UTC(2026, 10, 25, 3);
  const jam = trip({ traffic_delay_min: 60, jam_started_at: new Date(dep + 60 * 60000).toISOString() });
  const m = movingMs(jam, { state: 'IN_TRAFFIC' }, dep + 90 * 60000);
  assert.equal(m.moving, 60 * 60000);
  assert.equal(m.jamLeft, 30 * 60000);
  const acc = movingMs(trip(), { state: 'ACCIDENT', conditionAt: new Date(dep + 45 * 60000).toISOString() }, dep + 120 * 60000);
  assert.equal(acc.moving, 45 * 60000);
  assert.ok(acc.halted);
});

test('the tracker prefers a fresh GPS fix over the simulation', () => {
  const t = new BusTracker({ jams: false });
  const roads = { r1: { coords: line.coords, source: 'ORS' } };
  const bus = { id: 'b1', code: 'BUS-1', state: 'ON_TRIP', current_trip: trip(), roadKey: 'r1' };
  t.sync([bus], roads);
  const now = Date.UTC(2026, 10, 25, 5);
  const sim = t.frame(now)[0];
  assert.equal(sim.source, 'SIMULATED');
  assert.ok(sim.etaMs > now);
  const real = 1_000_000;
  t.fix('b1', { lat: 24.25, lng: 89.92, speedKmh: 8, at: new Date(now).toISOString() }, real);
  const g = t.frame(now, real + 1000)[0];
  assert.equal(g.source, 'GPS');
  assert.equal(g.speedKmh, 8);
  assert.equal(t.frame(now, real + 3 * 60000)[0].source, 'SIMULATED', 'falls back after 2 minutes without GPS');
  t.sync([], roads);
  assert.equal(t.frame(now).length, 0);
});

test('slow GPS stretches become traffic segments', () => {
  const at = (s) => new Date(Date.UTC(2026, 0, 1, 0, 0, s)).toISOString();
  const segs = gpsTraffic([
    { bus_id: 'a', lat: 23.8, lng: 90.4, speed_kmh: 6, recorded_at: at(0) },
    { bus_id: 'a', lat: 23.8005, lng: 90.4, speed_kmh: 8, recorded_at: at(30) },
    { bus_id: 'a', lat: 23.81, lng: 90.4, speed_kmh: 60, recorded_at: at(60) },
  ]);
  assert.equal(segs.length, 1);
  assert.equal(segs[0].level, 'heavy');
});

test('road routing: OpenRouteService, then OSRM, then a straight line', async () => {
  const calls = [];
  const ok = (body) => ({ ok: true, json: async () => body });
  process.env.ORS_API_KEY = 'test-key';
  resetGeoMemory();
  const ors = await roadBetween(['Dhaka', 'Bogura'], { fetchImpl: async (url, init) => {
    calls.push(url);
    assert.equal(init.headers.Authorization, 'test-key');
    return ok({ features: [{ geometry: { coordinates: [[90.4125, 23.8103], [89.92, 24.25], [89.373, 24.8481]] }, properties: { summary: { distance: 198000, duration: 14400 } } }] });
  } });
  assert.equal(ors.source, 'ORS');
  assert.equal(ors.distanceKm, 198);
  assert.equal(ors.durationMin, 240);
  assert.match(calls[0], /api\.heigit\.org\/openrouteservice\/v2\/directions\/driving-car\/geojson/);

  resetGeoMemory();
  const osrm = await roadBetween(['Dhaka', 'Rangpur'], { fetchImpl: async (url) => {
    if (url.includes('heigit')) return { ok: false, status: 429 };
    return ok({ routes: [{ geometry: { coordinates: [[90.4125, 23.8103], [89.2752, 25.7439]] }, distance: 300000, duration: 21600 }] });
  } });
  assert.equal(osrm.source, 'OSRM');

  resetGeoMemory();
  delete process.env.ORS_API_KEY;
  process.env.OSRM_URL = 'off';
  const line2 = await roadBetween(['Dhaka', 'Sylhet'], { fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal(line2.source, 'STRAIGHT');
  assert.equal(await roadBetween(['Dhaka', 'Nowhere Town'], { fetchImpl: async () => ({ ok: true, json: async () => [] }) }), null);
  delete process.env.OSRM_URL;
});
