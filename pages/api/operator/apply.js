import { route, text, HttpError } from '../../../src/server/http.js';
import { requireUser, ROLE } from '../../../src/server/auth.js';
import { createVendor } from '../../../src/server/vendors.js';

// A signed-in passenger turns their account into an operator account.
export default route({
  async POST(req) {
    const user = await requireUser(req);
    if (user.role_id !== ROLE.CUSTOMER) throw new HttpError(409, 'This account already has a role. Use a separate account for your company.');
    const vendor = await createVendor(user.id, text(req.body?.companyName, { min: 2, max: 150, label: 'Company name' }));
    return { vendorId: vendor.id };
  },
});
