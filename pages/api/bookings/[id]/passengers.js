import { route, uuid, HttpError } from '../../../../src/server/http.js';
import { requireUser } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';
import { normalizePhone } from '../../../../src/lib/validate.js';

export default route({
  async PUT(req) {
    const user = await requireUser(req);
    const phone = normalizePhone(req.body?.contact?.phone);
    if (!phone) throw new HttpError(400, 'Enter a valid Bangladeshi mobile number');
    if (!Array.isArray(req.body?.passengers)) throw new HttpError(400, 'Add passenger details');
    unwrap(await db().rpc('bk_save_passengers', {
      p_user: user.id, p_booking: uuid(req.query.id, 'Booking'),
      p_contact: { ...req.body.contact, phone }, p_passengers: req.body.passengers,
    }));
    return { saved: true };
  },
});
