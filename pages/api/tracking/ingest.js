import { route, HttpError } from '../../../src/server/http.js';
import { db, unwrap } from '../../../src/server/db.js';
import { requireTracker } from '../../../src/server/tracking.js';
import { haversineKm } from '../../../src/lib/map/geo.js';

// GPS ingest. A driver's phone (the /drive page) or any GPS device posts its position here with
// "Authorization: Tracker <token>" from the bus's tracking link. Body: one fix
// { lat, lng, speedKmh?, speed? (m/s, as browsers report it), heading?, accuracy?, recordedAt? }
// or { fixes: [ ...up to 50 ] } for devices that buffer.
function fix(raw, now) {
  const lat = Number(raw?.lat); const lng = Number(raw?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new HttpError(400, 'Latitude and longitude are required');
  const at = raw.recordedAt ? Date.parse(raw.recordedAt) : now;
  if (!Number.isFinite(at) || at > now + 60000 || at < now - 24 * 3600000) throw new HttpError(400, 'recordedAt must be within the last 24 hours');
  const kmh = raw.speedKmh != null ? Number(raw.speedKmh) : raw.speed != null ? Number(raw.speed) * 3.6 : null;
  const heading = raw.heading != null && Number.isFinite(Number(raw.heading)) ? ((Number(raw.heading) % 360) + 360) % 360 : null;
  const accuracy = raw.accuracy != null && Number.isFinite(Number(raw.accuracy)) ? Math.max(0, Number(raw.accuracy)) : null;
  return { lat, lng, speed_kmh: kmh != null && Number.isFinite(kmh) ? Math.min(200, Math.max(0, kmh)) : null, heading, accuracy_m: accuracy, recorded_at: new Date(at).toISOString() };
}

export default route({
  allowCrossSite: true,
  // The driver page asks which bus its link belongs to.
  async GET(req) {
    const bus = await requireTracker(req);
    const trip = unwrap(await db().from('trips').select('id, routes(start_point, end_point)').eq('bus_id', bus.id).eq('status', 'EN_ROUTE').order('departure_at', { ascending: false }).limit(1).maybeSingle());
    return { bus: { code: bus.code, name: bus.name || bus.model_no, reg_no: bus.reg_no }, trip: trip ? { id: trip.id, origin: trip.routes?.start_point, destination: trip.routes?.end_point } : null };
  },
  async POST(req) {
    const bus = await requireTracker(req);
    const now = Date.now();
    const list = Array.isArray(req.body?.fixes) ? req.body.fixes : [req.body];
    if (!list.length || list.length > 50) throw new HttpError(400, 'Send between 1 and 50 positions');
    const fixes = list.map((r) => fix(r, now)).sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at));
    const trip = unwrap(await db().from('trips').select('id').eq('bus_id', bus.id).eq('status', 'EN_ROUTE').order('departure_at', { ascending: false }).limit(1).maybeSingle());
    // Fill in speed from the previous fix when the device does not report it.
    let prev = unwrap(await db().from('bus_positions').select('lat, lng, recorded_at').eq('bus_id', bus.id).order('recorded_at', { ascending: false }).limit(1).maybeSingle());
    for (const f of fixes) {
      if (f.speed_kmh == null && prev) {
        const h = (Date.parse(f.recorded_at) - Date.parse(prev.recorded_at)) / 3600000;
        if (h > 0 && h < 0.25) f.speed_kmh = Math.min(200, haversineKm([prev.lat, prev.lng], [f.lat, f.lng]) / h);
      }
      prev = f;
    }
    unwrap(await db().from('bus_positions').insert(fixes.map((f) => ({ ...f, bus_id: bus.id, trip_id: trip?.id || null }))));
    await db().from('bus_trackers').update({ last_seen_at: new Date().toISOString() }).eq('bus_id', bus.id);
    if (Math.random() < 0.01) await db().rpc('bk_prune_positions');
    return { ok: true, saved: fixes.length, bus: bus.code, tripId: trip?.id || null };
  },
});
