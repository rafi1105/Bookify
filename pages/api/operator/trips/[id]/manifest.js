import { route, uuid, HttpError } from '../../../../../src/server/http.js';
import { requireVendor } from '../../../../../src/server/auth.js';
import { db, unwrap } from '../../../../../src/server/db.js';

export default route({
  async GET(req) {
    const { vendor } = await requireVendor(req);
    const id = uuid(req.query.id, 'Trip');
    const trip = unwrap(await db().from('trips').select('id,departure_at,routes(start_point,end_point),buses(name,reg_no)').eq('id', id).eq('vendor_id', vendor.id).maybeSingle());
    if (!trip) throw new HttpError(404, 'Trip not found');
    return { trip, passengers: unwrap(await db().rpc('bk_trip_manifest', { p_trip: id })) };
  },
});
