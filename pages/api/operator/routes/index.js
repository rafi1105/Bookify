import { route, text, int, money, HttpError } from '../../../../src/server/http.js';
import { requireVendor } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';
import { COACH_CLASSES } from '../../../../src/lib/classes.js';

function points(value, label) {
  const list = (Array.isArray(value) ? value : []).map((p) => String(p).trim()).filter(Boolean);
  if (!list.length || list.length > 6 || list.some((p) => p.length < 2 || p.length > 100)) throw new HttpError(400, `Enter 1 to 6 ${label}`);
  return list;
}

export default route({
  async GET(req) {
    const { vendor } = await requireVendor(req);
    const permissions = unwrap(await db().from('route_permissions')
      .select('id,origin,destination,boarding_points,dropping_points,bus_type,proposed_fare,proposed_duration_min,approved_fare,approved_duration_min,status,note,created_at')
      .eq('vendor_id', vendor.id).order('created_at', { ascending: false }));
    return { permissions };
  },
  async POST(req) {
    const { vendor } = await requireVendor(req);
    if (vendor.status !== 'ACTIVE') throw new HttpError(403, 'Your operator account is suspended');
    const b = req.body || {};
    if (!COACH_CLASSES.includes(b.busType)) throw new HttpError(400, 'Choose Non-AC, AC or Sleeper');
    const origin = text(b.origin, { min: 2, max: 100, label: 'Start point' });
    const destination = text(b.destination, { min: 2, max: 100, label: 'Destination' });
    if (origin.toLowerCase() === destination.toLowerCase()) throw new HttpError(400, 'Start point and destination must differ');
    const created = unwrap(await db().from('route_permissions').insert({
      vendor_id: vendor.id, origin, destination, bus_type: b.busType,
      boarding_points: points(b.boardingPoints, 'boarding points'), dropping_points: points(b.droppingPoints, 'dropping points'),
      proposed_fare: money(b.fare, { min: 50, max: 20000, label: 'Fare' }),
      proposed_duration_min: int(b.durationMin, { min: 15, max: 1440, label: 'Journey time (minutes)' }),
    }).select('id').single());
    return { id: created.id };
  },
});
