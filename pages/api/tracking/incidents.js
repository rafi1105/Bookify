import { route, uuid, HttpError } from '../../../src/server/http.js';
import { db, unwrap } from '../../../src/server/db.js';
import { assertBusAccess, requireStaff, requireTracker } from '../../../src/server/tracking.js';

const KINDS = ['ACCIDENT', 'TRAFFIC_JAM', 'BREAKDOWN', 'ROAD_BLOCK', 'OTHER'];

function point(b) {
  const lat = Number(b?.lat); const lng = Number(b?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// Road incidents. Admins and operators report from the live map (click a spot, or attach to a bus);
// drivers report from their tracking page with their tracking link, at their last GPS position.
export default route({
  async POST(req) {
    const b = req.body || {};
    const kind = String(b.kind || '');
    if (!KINDS.includes(kind)) throw new HttpError(400, 'Choose what happened');
    const note = typeof b.note === 'string' ? b.note.trim().slice(0, 300) || null : null;
    const isDriver = (req.headers.authorization || '').startsWith('Tracker ') || req.headers['x-tracker-token'];
    let row;
    if (isDriver) {
      const bus = await requireTracker(req);
      let at = point(b);
      if (!at) {
        const last = unwrap(await db().from('bus_positions').select('lat, lng').eq('bus_id', bus.id).order('recorded_at', { ascending: false }).limit(1).maybeSingle());
        if (!last) throw new HttpError(400, 'Your position is not known yet. Allow location access and try again.');
        at = last;
      }
      row = { kind, ...at, note, bus_id: bus.id, vendor_id: bus.vendor_id, reporter_role: 'DRIVER' };
    } else {
      const staff = await requireStaff(req);
      const at = point(b);
      if (!at) throw new HttpError(400, 'Pick the place on the map');
      const bus = b.busId ? await assertBusAccess(staff, uuid(b.busId, 'Bus')) : null;
      row = { kind, ...at, note, bus_id: bus?.id || null, vendor_id: bus?.vendor_id || staff.vendor?.id || null, reported_by: staff.user.id, reporter_role: staff.admin ? 'ADMIN' : 'OPERATOR' };
    }
    return { incident: unwrap(await db().from('road_incidents').insert(row).select('id, kind, lat, lng, note, created_at').single()) };
  },
  // Mark an incident cleared. Operators can clear their own reports; admins any.
  async PATCH(req) {
    const staff = await requireStaff(req);
    const id = uuid(req.body?.id, 'Incident');
    const inc = unwrap(await db().from('road_incidents').select('id, vendor_id').eq('id', id).maybeSingle());
    if (!inc || (!staff.admin && inc.vendor_id !== staff.vendor.id)) throw new HttpError(404, 'Incident not found');
    unwrap(await db().from('road_incidents').update({ resolved_at: new Date().toISOString(), resolved_by: staff.user.id }).eq('id', id));
    return { ok: true };
  },
});
