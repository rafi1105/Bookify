import { route, text, int, HttpError } from '../../../../src/server/http.js';
import { requireVendor } from '../../../../src/server/auth.js';
import { db, unwrap } from '../../../../src/server/db.js';
import { buildLayout } from '../../../../src/lib/layout.js';

import { COACH_CLASSES as BUS_TYPES } from '../../../../src/lib/classes.js';
import { imageUrl } from '../../../../src/server/validate.js';

export default route({
  async GET(req) {
    const { vendor } = await requireVendor(req);
    const rows = unwrap(await db().from('buses')
      .select('id,code,name,model_no,reg_no,bus_type,status,condition,image_url,amenities,bus_capacities(capacity_value,seat_layout_json)')
      .eq('vendor_id', vendor.id).order('created_at', { ascending: false }));
    return { buses: rows.map((b) => ({ ...b, capacity: b.bus_capacities?.capacity_value, layout: b.bus_capacities?.seat_layout_json, bus_capacities: undefined })) };
  },
  async POST(req) {
    const { vendor } = await requireVendor(req);
    const b = req.body || {};
    const busType = BUS_TYPES.includes(b.busType) ? b.busType : null;
    if (!busType) throw new HttpError(400, 'Choose a coach class');
    let built;
    try {
      built = buildLayout({ pattern: b.pattern, rows: int(b.rows, { min: 2, max: 20, label: 'Rows' }), kind: b.kind, decks: int(b.decks ?? 1, { min: 1, max: 2, label: 'Decks' }) });
    } catch (error) {
      throw new HttpError(400, error.message);
    }
    const brand = unwrap(await db().from('bus_operators').select('id').eq('vendor_id', vendor.id).limit(1).single());
    const amenities = Array.isArray(b.amenities) ? b.amenities.filter((a) => typeof a === 'string').map((a) => a.trim().slice(0, 40)).filter(Boolean).slice(0, 10) : [];
    const capacity = unwrap(await db().from('bus_capacities').insert({
      capacity_value: built.seatCount, seat_layout_json: built.layout, vendor_id: vendor.id, name: `${b.pattern} ${built.seatCount} seats`,
    }).select('id').single());
    const bus = unwrap(await db().from('buses').insert({
      operator_id: brand.id, vendor_id: vendor.id, reg_no: text(b.regNo, { min: 4, max: 100, label: 'Registration number' }).toUpperCase(),
      model_no: text(b.modelNo, { min: 1, max: 100, label: 'Model' }), name: text(b.name, { min: 2, max: 100, label: 'Coach name' }),
      bus_type: busType, capacity_id: capacity.id, amenities, status: 'ACTIVE', image_url: imageUrl(b.imageUrl),
    }).select('id,code').single());
    return { id: bus.id, code: bus.code };
  },
});
