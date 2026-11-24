import { route, uuid, text, int, money, HttpError } from '../../../../src/server/http.js';
import { requireVendor } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';
import { removePermission } from '../../../../src/server/crud.js';
import { COACH_CLASSES } from '../../../../src/lib/classes.js';

function points(value, label) {
  const list = (Array.isArray(value) ? value : []).map((p) => String(p).trim()).filter(Boolean);
  if (!list.length || list.length > 6 || list.some((p) => p.length < 2 || p.length > 100)) throw new HttpError(400, `Enter 1 to 6 ${label}`);
  return list;
}

// Operators can edit a request until the admin decides on it, and withdraw/delete it any time no passenger has booked.
export default route({
  async PATCH(req) {
    const { vendor } = await requireVendor(req);
    const id = uuid(req.query.id, 'Route request');
    const cur = unwrap(await db().from('route_permissions').select('id,status').eq('id', id).eq('vendor_id', vendor.id).maybeSingle());
    if (!cur) throw new HttpError(404, 'Route request not found');
    if (cur.status !== 'PENDING') throw new HttpError(409, 'Only requests waiting for approval can be edited. Delete it and send a new one, or ask the admin to change the fare or time.');
    const b = req.body || {};
    if (!COACH_CLASSES.includes(b.busType)) throw new HttpError(400, 'Choose Non-AC, AC or Sleeper');
    const origin = text(b.origin, { min: 2, max: 100, label: 'Start point' });
    const destination = text(b.destination, { min: 2, max: 100, label: 'Destination' });
    if (origin.toLowerCase() === destination.toLowerCase()) throw new HttpError(400, 'Start point and destination must differ');
    unwrap(await db().from('route_permissions').update({
      origin, destination, bus_type: b.busType, boarding_points: points(b.boardingPoints, 'boarding points'), dropping_points: points(b.droppingPoints, 'dropping points'),
      proposed_fare: money(b.fare, { min: 50, max: 20000, label: 'Fare' }), proposed_duration_min: int(b.durationMin, { min: 15, max: 1440, label: 'Journey time (minutes)' }),
    }).eq('id', id));
    return { ok: true };
  },
  async DELETE(req) {
    const { user, vendor } = await requireVendor(req);
    await removePermission(user.id, vendor.id, uuid(req.query.id, 'Route request'));
    return { ok: true };
  },
});
