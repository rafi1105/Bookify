import { db, unwrap } from './db.js';
import { HttpError } from './http.js';

export const ROLE = { CUSTOMER: 1, VENDOR: 2, ADMIN: 3 };

// Verify the Supabase access token sent by the browser and load the profile row.
export async function authenticate(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const { data, error } = await db().auth.getUser(token);
  if (error || !data?.user) return null;
  const profile = unwrap(await db().from('users').select('*').eq('id', data.user.id).maybeSingle());
  if (!profile || profile.status !== 'ACTIVE') return null;
  return { ...profile, emailVerified: Boolean(data.user.email_confirmed_at) };
}

export async function requireUser(req) {
  const user = await authenticate(req);
  if (!user) throw new HttpError(401, 'Please sign in to continue');
  return user;
}

export async function requireAdmin(req) {
  const user = await requireUser(req);
  if (user.role_id !== ROLE.ADMIN) throw new HttpError(403, 'Administrator access is required');
  return user;
}

// Operator account. Pass approvedOnly for anything that sells or publishes.
export async function requireVendor(req, { approvedOnly = false } = {}) {
  const user = await requireUser(req);
  if (user.role_id !== ROLE.VENDOR) throw new HttpError(403, 'An operator account is required');
  const vendor = unwrap(await db().from('vendors').select('*').eq('user_id', user.id).maybeSingle());
  if (!vendor) throw new HttpError(403, 'Operator profile not found');
  if (approvedOnly && (vendor.approval_status !== 'APPROVED' || vendor.status !== 'ACTIVE')) {
    throw new HttpError(403, 'Your operator account is not approved yet');
  }
  return { user, vendor };
}
