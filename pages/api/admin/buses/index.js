import { route } from '../../../../src/server/http.js';
import { requireAdmin } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';

const one = (v) => (Array.isArray(v) ? v[0] : v);

// Every bus on the platform, for the admin bus list.
export default route({
  async GET(req) {
    await requireAdmin(req);
    const rows = unwrap(await db().from('buses')
      .select('id,code,name,model_no,reg_no,bus_type,status,condition,image_url,amenities,vendor_id,bus_capacities(capacity_value),bus_operators(operator_name)')
      .order('created_at', { ascending: false }).limit(2000));
    return { buses: rows.map((b) => ({ ...b, capacity: one(b.bus_capacities)?.capacity_value, operator: one(b.bus_operators)?.operator_name, bus_capacities: undefined, bus_operators: undefined })) };
  },
});
