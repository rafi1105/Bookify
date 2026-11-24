import { route, text, HttpError } from '../../src/server/http.js';
import { requireUser } from '../../src/server/auth.js';
import { db, unwrap } from '../../src/server/db.js';
import { normalizePhone } from '../../src/lib/validate.js';

function present(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role_id: user.role_id, emailVerified: user.emailVerified };
}

export default route({
  async GET(req) {
    return present(await requireUser(req));
  },
  async PATCH(req) {
    const user = await requireUser(req);
    const name = text(req.body?.name, { min: 2, max: 100, label: 'Name' });
    const phone = normalizePhone(req.body?.phone);
    if (!phone) throw new HttpError(400, 'Enter a valid Bangladeshi mobile number');
    const saved = unwrap(await db().from('users').update({ name, phone }).eq('id', user.id).select().single());
    return present({ ...saved, emailVerified: user.emailVerified });
  },
});
