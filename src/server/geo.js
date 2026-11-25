import { createHash } from 'node:crypto';
import { db } from './db.js';
import { lookupPlace, placeKey } from '../lib/map/places.js';
import { haversineKm, simplify } from '../lib/map/geo.js';

// Geocoding and road routing with free services, cached in the database so each place and each
// road costs one call:
//   1. OpenRouteService (ORS_API_KEY, free key from account.heigit.org; daily quota per its plans page)
//   2. the public OSRM server (OSRM_URL; no key, light use only) when ORS has no key or fails
//   3. a straight line between the stops, drawn dashed, when neither answers (not cached)
// Place names: the built-in list of Bangladesh towns, then ORS geocoding, then Nominatim.

const TIMEOUT = 8000;
const memory = new Map();

function cfg() {
  return {
    orsKey: process.env.ORS_API_KEY || '',
    // openrouteservice moved from api.openrouteservice.org to api.heigit.org in 2026.
    orsBase: (process.env.ORS_BASE_URL || 'https://api.heigit.org').replace(/\/$/, ''),
    profile: process.env.ORS_PROFILE || 'driving-car',
    osrm: process.env.OSRM_URL === 'off' ? '' : (process.env.OSRM_URL || 'https://router.project-osrm.org'),
    nominatim: process.env.NOMINATIM_URL === 'off' ? '' : (process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org'),
    userAgent: `Bookify/2.0 (${process.env.BOOKIFY_URL || 'bus ticketing'})`,
  };
}

// Database access is optional here: without it (tests, misconfigured env) only memory caching is used.
async function cacheGet(table, column, key) {
  try {
    const { data } = await db().from(table).select('*').eq(column, key).maybeSingle();
    return data || null;
  } catch { return null; }
}
async function cachePut(table, row) {
  try { await db().from(table).upsert(row); } catch { /* cache only */ }
}

async function getJson(url, init, fetchImpl) {
  const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return res.json();
}

export async function geocode(name, { fetchImpl = fetch } = {}) {
  const key = placeKey(name);
  if (!key) return null;
  const known = lookupPlace(name);
  if (known) return { point: known, source: 'GAZETTEER' };
  if (memory.has(`p:${key}`)) return memory.get(`p:${key}`);
  const cached = await cacheGet('geo_places', 'name_key', key);
  if (cached) return { point: [cached.lat, cached.lng], source: cached.source };

  const c = cfg();
  let found = null;
  if (c.orsKey) {
    try {
      const q = new URLSearchParams({ api_key: c.orsKey, text: name, 'boundary.country': 'BD', size: '1' });
      const j = await getJson(`${c.orsBase}/pelias/v1/search?${q}`, { headers: { Authorization: c.orsKey } }, fetchImpl);
      const g = j.features?.[0]?.geometry?.coordinates;
      if (g) found = { point: [g[1], g[0]], source: 'ORS' };
    } catch (e) { console.warn('ORS geocoding failed', e.message); }
  }
  if (!found && c.nominatim) {
    try {
      const q = new URLSearchParams({ q: name, countrycodes: 'bd', format: 'json', limit: '1' });
      const j = await getJson(`${c.nominatim}/search?${q}`, { headers: { 'User-Agent': c.userAgent } }, fetchImpl);
      if (j[0]) found = { point: [Number(j[0].lat), Number(j[0].lon)], source: 'NOMINATIM' };
    } catch (e) { console.warn('Nominatim geocoding failed', e.message); }
  }
  memory.set(`p:${key}`, found);
  if (found) await cachePut('geo_places', { name_key: key, name, lat: found.point[0], lng: found.point[1], source: found.source });
  return found;
}

async function viaOrs(points, c, fetchImpl) {
  const body = { coordinates: points.map(([lat, lng]) => [lng, lat]), radiuses: points.map(() => -1), instructions: false };
  const j = await getJson(`${c.orsBase}/openrouteservice/v2/directions/${c.profile}/geojson`, {
    method: 'POST', headers: { Authorization: c.orsKey, 'Content-Type': 'application/json', Accept: 'application/geo+json' }, body: JSON.stringify(body),
  }, fetchImpl);
  const f = j.features?.[0];
  if (!f?.geometry?.coordinates?.length) throw new Error('ORS returned no route');
  return { coords: f.geometry.coordinates.map(([lng, lat]) => [lat, lng]), distanceKm: f.properties.summary.distance / 1000, durationMin: f.properties.summary.duration / 60, source: 'ORS' };
}

async function viaOsrm(points, c, fetchImpl) {
  const path = points.map(([lat, lng]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join(';');
  const j = await getJson(`${c.osrm}/route/v1/driving/${path}?overview=full&geometries=geojson`, { headers: { 'User-Agent': c.userAgent } }, fetchImpl);
  const r = j.routes?.[0];
  if (!r?.geometry?.coordinates?.length) throw new Error('OSRM returned no route');
  return { coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]), distanceKm: r.distance / 1000, durationMin: r.duration / 60, source: 'OSRM' };
}

function straight(points) {
  let km = 0;
  for (let i = 1; i < points.length; i += 1) km += haversineKm(points[i - 1], points[i]);
  // Roads are roughly a quarter longer than the straight line; 45 km/h average.
  return { coords: points, distanceKm: km * 1.25, durationMin: (km * 1.25 / 45) * 60, source: 'STRAIGHT' };
}

// Road line through the named places in order. Unknown intermediate stops are skipped; returns null
// when the first or last place cannot be found.
export async function roadBetween(names, { fetchImpl = fetch } = {}) {
  const clean = names.filter((n) => typeof n === 'string' && n.trim());
  if (clean.length < 2) return null;
  const located = [];
  for (const [i, name] of clean.entries()) {
    const g = await geocode(name, { fetchImpl });
    if (!g && (i === 0 || i === clean.length - 1)) return null;
    if (g && !located.some((p) => haversineKm(p.point, g.point) < 1)) located.push({ name, point: g.point });
    else if (g && i === clean.length - 1) { located.pop(); located.push({ name, point: g.point }); }
  }
  if (located.length < 2) return null;
  const c = cfg();
  const key = createHash('sha1').update(`${c.profile}|${located.map((p) => p.point.map((v) => v.toFixed(4)).join(',')).join('|')}`).digest('hex');
  if (memory.has(`r:${key}`)) { const m = memory.get(`r:${key}`); if (m.expires > Date.now()) return m.value; }
  const cached = await cacheGet('route_geometries', 'key', key);
  if (cached) return { key, waypoints: cached.waypoints, coords: cached.coords, distanceKm: Number(cached.distance_km), durationMin: cached.duration_min, source: cached.source };

  const points = located.map((p) => p.point);
  let road = null;
  if (c.orsKey) { try { road = await viaOrs(points, c, fetchImpl); } catch (e) { console.warn('OpenRouteService routing failed', e.message); } }
  if (!road && c.osrm) { try { road = await viaOsrm(points, c, fetchImpl); } catch (e) { console.warn('OSRM routing failed', e.message); } }
  const fallback = !road;
  if (fallback) road = straight(points);
  const value = {
    key, waypoints: located, coords: simplify(road.coords, 0.0003).map(([a, b]) => [Number(a.toFixed(5)), Number(b.toFixed(5))]),
    distanceKm: Math.round(road.distanceKm * 10) / 10, durationMin: Math.round(road.durationMin), source: road.source,
  };
  memory.set(`r:${key}`, { value, expires: Date.now() + (fallback ? 10 * 60000 : 24 * 3600000) });
  if (!fallback) {
    await cachePut('route_geometries', { key, waypoints: value.waypoints, coords: value.coords, distance_km: value.distanceKm, duration_min: value.durationMin, source: value.source });
  }
  return value;
}

export function resetGeoMemory() { memory.clear(); }
