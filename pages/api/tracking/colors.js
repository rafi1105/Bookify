import { route, uuid, HttpError } from '../../../src/server/http.js';
import { db, unwrap } from '../../../src/server/db.js';
import { requireStaff } from '../../../src/server/tracking.js';
import { isHexColor } from '../../../src/lib/map/config.js';

// Set an operator's bus colour on the map. Admins for any operator, operators for their own.
export default route({
  async PATCH(req) {
    const staff = await requireStaff(req);
    const id = uuid(req.body?.operatorId, 'Operator');
    const color = req.body?.color === null ? null : String(req.body?.color || '');
    if (color !== null && !isHexColor(color)) throw new HttpError(400, 'Choose a colour like #1d4ed8');
    const op = unwrap(await db().from('bus_operators').select('id, vendor_id').eq('id', id).maybeSingle());
    if (!op || (!staff.admin && op.vendor_id !== staff.vendor.id)) throw new HttpError(404, 'Operator not found');
    unwrap(await db().from('bus_operators').update({ map_color: color && color.toLowerCase() }).eq('id', id));
    return { ok: true };
  },
});
