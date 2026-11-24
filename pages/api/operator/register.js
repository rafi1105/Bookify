import { route, text, HttpError } from '../../../src/server/http.js';
import { db } from '../../../src/server/db.js';
import { createVendor } from '../../../src/server/vendors.js';
import { EMAIL_RE } from '../../../src/lib/validate.js';

// Operator sign-up: e-mail, password and company name only. No e-mail verification, no approval.
export default route({
  async POST(req) {
    const company = text(req.body?.companyName, { min: 2, max: 150, label: 'Company name' });
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid e-mail address');
    if (password.length < 8) throw new HttpError(400, 'Use a password of at least 8 characters');
    const { data, error } = await db().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: company } });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) throw new HttpError(409, 'An account with this e-mail already exists. Sign in instead.');
      console.error('Operator registration failed', error.message);
      throw new HttpError(503, 'We could not create the account. Please try again.');
    }
    try {
      await createVendor(data.user.id, company);
    } catch (e) {
      await db().auth.admin.deleteUser(data.user.id).catch(() => {});
      throw e;
    }
    return { ok: true };
  },
});
