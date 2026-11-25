import { createHash, randomBytes } from 'node:crypto';
import { db, unwrap } from './db.js';
import { HttpError } from './http.js';
import { ROLE, requireUser } from './auth.js';
import { syncTripStatus } from './tripSync.js';
import { roadBetween } from './geo.js';
import { operatorColor } from '../lib/map/config.js';
import { haversineKm } from '../lib/map/geo.js';
import { levelFromSpeed } from '../lib/map/trafficSim.js';

export const GPS_FRESH_MS = 2 * 60000;

// Admin (sees every operator) or operator (sees only their own buses).
export async function requireStaff(req) {
  const user = await requireUser(req);
  if (user.role_id === ROLE.ADMIN) return { user, vendor: null, admin: true };
  if (user.role_id !== ROLE.VENDOR) throw new HttpError(403, 'Only operators and administrators can see the live map');
  const vendor = unwrap(await db().from('vendors').select('*').eq('user_id', user.id).maybeSingle());
  if (!vendor) throw new HttpError(403, 'Operator profile not found');
  return { user, vendor, admin: false };
}

export const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex');
export const newToken = () => randomBytes(24).toString('base64url');

// Driver phone or GPS device: "Authorization: Tracker <token>" (or X-Tracker-Token).
export async function requireTracker(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Tracker ') ? h.slice(8).trim() : String(req.headers['x-tracker-token'] || '').trim();
  if (!token || token.length < 20 || token.length > 100) throw new HttpError(401, 'This tracking link is missing or invalid');
  const t = unwrap(await db().from('bus_trackers').select('bus_id').eq('token_hash', hashToken(token)).maybeSingle());
  if (!t) throw new HttpError(401, 'This tracking link was replaced or removed. Ask your operator for a new one.');
  const bus = unwrap(await db().from('buses').select('id, code, name, model_no, reg_no, vendor_id, operator_id').eq('id', t.bus_id).maybeSingle());
  if (!bus) throw new HttpError(401, 'The bus for this link no longer exists');
  return bus;
}

export async function assertBusAccess(staff, busId) {
  const bus = unwrap(await db().from('buses').select('id, vendor_id, code').eq('id', busId).maybeSingle());
  if (!bus || (!staff.admin && bus.vendor_id !== staff.vendor.id)) throw new HttpError(404, 'Bus not found');
  return bus;
}

// Road colour from real GPS: consecutive fixes of the same bus that were slow mark that stretch.
export function gpsTraffic(fixes) {
  const byBus = new Map();
  for (const f of fixes) { if (!byBus.has(f.bus_id)) byBus.set(f.bus_id, []); byBus.get(f.bus_id).push(f); }
  const out = [];
  for (const list of byBus.values()) {
    list.sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at));
    for (let i = 1; i < list.length; i += 1) {
      const a = list[i - 1]; const b = list[i];
      const km = haversineKm([a.lat, a.lng], [b.lat, b.lng]);
      const hours = (Date.parse(b.recorded_at) - Date.parse(a.recorded_at)) / 3600000;
      if (hours <= 0 || hours > 0.25 || km > 5) continue;
      const measured = a.speed_kmh != null && b.speed_kmh != null ? (a.speed_kmh + b.speed_kmh) / 2 : km / hours;
      const level = levelFromSpeed(measured);
      if (level && km > 0.02) out.push({ coords: [[a.lat, a.lng], [b.lat, b.lng]], level, speedKmh: Math.round(measured) });
    }
  }
  return out;
}

function stopNames(trip) {
  return [trip.origin, ...(trip.stops || []).map((s) => s.name), trip.destination];
}

// Everything the live map needs in one answer. Operators get only their own buses; incident reports
// and GPS slow-traffic stretches are road information and shared with everyone, without bus names.
export async function snapshot(staff) {
  await syncTripStatus();
  const vendorId = staff.admin ? null : staff.vendor.id;
  const since = new Date(Date.now() - 15 * 60000).toISOString();
  let busQuery = db().from('buses').select('id, operator_id, vendor_id, bus_operators(id, operator_name, map_color), bus_trackers(last_seen_at)');
  if (vendorId) busQuery = busQuery.eq('vendor_id', vendorId);
  const [fleet, meta, latest, incidents, trail, sim] = await Promise.all([
    db().rpc('bk_fleet_status', { p_vendor: vendorId }).then(unwrap),
    busQuery.then(unwrap),
    db().rpc('bk_latest_positions', { p_vendor: vendorId, p_since: new Date(Date.now() - GPS_FRESH_MS).toISOString() }).then(unwrap),
    db().from('road_incidents').select('id, kind, lat, lng, note, bus_id, vendor_id, reporter_role, created_at')
      .is('resolved_at', null).gte('created_at', new Date(Date.now() - 24 * 3600000).toISOString()).order('created_at', { ascending: false }).limit(200).then(unwrap),
    db().from('bus_positions').select('bus_id, lat, lng, speed_kmh, recorded_at').gte('received_at', since).order('received_at', { ascending: false }).limit(5000).then(unwrap),
    db().from('sim_clock').select('speed, real_anchor, sim_anchor').maybeSingle().then(unwrap),
  ]);

  const metaById = new Map(meta.map((m) => [m.id, m]));
  const gpsById = new Map(latest.map((p) => [p.bus_id, p]));
  const roads = {};
  const roadFor = new Map();
  for (const bus of fleet) {
    if (!bus.current_trip) continue;
    const names = stopNames(bus.current_trip);
    const sig = names.join('|').toLowerCase();
    if (!roadFor.has(sig)) roadFor.set(sig, roadBetween(names).catch(() => null));
  }
  const operators = new Map();
  const buses = [];
  for (const bus of fleet) {
    const m = metaById.get(bus.id) || {};
    const op = m.bus_operators || {};
    const color = operatorColor(op.id || m.operator_id, op.map_color);
    if (op.id && !operators.has(op.id)) operators.set(op.id, { id: op.id, name: op.operator_name, color, chosen: Boolean(op.map_color), buses: 0, onTrip: 0 });
    const o = operators.get(op.id);
    if (o) { o.buses += 1; if (bus.current_trip) o.onTrip += 1; }
    let roadKey = null;
    if (bus.current_trip) {
      const road = await roadFor.get(stopNames(bus.current_trip).join('|').toLowerCase());
      if (road) { roads[road.key] = { coords: road.coords, distanceKm: road.distanceKm, durationMin: road.durationMin, source: road.source, waypoints: road.waypoints }; roadKey = road.key; }
    }
    const gps = gpsById.get(bus.id) || null;
    buses.push({
      id: bus.id, code: bus.code, name: bus.name, reg_no: bus.reg_no, operator_id: op.id || null, operator: bus.operator, color,
      state: bus.state, condition: bus.condition, condition_note: bus.condition_note, condition_updated_at: bus.condition_updated_at,
      current_trip: bus.current_trip, next_trip: bus.next_trip, roadKey,
      gps: gps && { lat: gps.lat, lng: gps.lng, speedKmh: gps.speed_kmh, heading: gps.heading, at: gps.recorded_at },
      tracker: m.bus_trackers ? { lastSeenAt: m.bus_trackers.last_seen_at } : null,
    });
  }
  const own = (i) => staff.admin || i.vendor_id === staff.vendor.id;
  return {
    serverNow: new Date().toISOString(),
    sim: sim ? { speed: Number(sim.speed), realAnchorMs: Date.parse(sim.real_anchor), simAnchorMs: Date.parse(sim.sim_anchor) } : null,
    admin: staff.admin,
    buses,
    roads,
    operators: [...operators.values()].sort((a, b) => a.name.localeCompare(b.name)),
    incidents: incidents.map((i) => ({ id: i.id, kind: i.kind, lat: i.lat, lng: i.lng, note: i.note, reporter: i.reporter_role, createdAt: i.created_at, busId: own(i) ? i.bus_id : null, canResolve: own(i) })),
    gpsTraffic: gpsTraffic(trail),
  };
}

// New GPS fixes since `afterIso` (received time) for the stream.
export async function fixesSince(staff, afterIso) {
  let q = db().from('bus_positions').select('id, bus_id, lat, lng, speed_kmh, heading, recorded_at, received_at, buses!inner(vendor_id)')
    .gt('received_at', afterIso).order('received_at', { ascending: true }).limit(500);
  if (!staff.admin) q = q.eq('buses.vendor_id', staff.vendor.id);
  return unwrap(await q).map((p) => ({ busId: p.bus_id, lat: p.lat, lng: p.lng, speedKmh: p.speed_kmh, heading: p.heading, at: p.recorded_at, receivedAt: p.received_at }));
}
