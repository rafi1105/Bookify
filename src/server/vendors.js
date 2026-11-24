import { db, unwrap } from './db.js';
import { ROLE } from './auth.js';

// Operators need no approval: the account is usable immediately.
export async function createVendor(userId, company) {
  const vendor = unwrap(await db().from('vendors').insert({ user_id: userId, company_name: company, approval_status: 'APPROVED' }).select().single());
  unwrap(await db().from('bus_operators').insert({ vendor_id: vendor.id, operator_name: company }));
  unwrap(await db().from('users').update({ role_id: ROLE.VENDOR }).eq('id', userId));
  return vendor;
}
