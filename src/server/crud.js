import { db, unwrap } from './db.js';
import { HttpError, text } from './http.js';
import { imageUrl } from './validate.js';

// Shared edit/delete rules for buses, trips and route permissions.
// `vendorId` limits an operator to their own rows; administrators pass null.

const scoped = (query, vendorId) => (vendorId ? query.eq('vendor_id', vendorId) : query);

async function bookingCount(tripIds) {
  if (!tripIds.length) return 0;
  const { count, error } = await db().from('bookings').select('id', { count: 'exact', head: true }).in('trip_id', tripIds);
  unwrap({ data: null, error });
  return count || 0;
}

async function audit(actor, action, entity, id, details = {}) {
  unwrap(await db().from('audit_logs').insert({ actor_id: actor, action, entity, entity_id: id, details }));
}

export async function updateBus(actor, vendorId, id, b) {
  const patch = {};
  if ('name' in b) patch.name = text(b.name, { min: 2, max: 100, label: 'Coach name' });
  if ('regNo' in b) patch.reg_no = text(b.regNo, { min: 4, max: 100, label: 'Registration number' }).toUpperCase();
  if ('modelNo' in b) patch.model_no = text(b.modelNo, { min: 1, max: 100, label: 'Model' });
  if ('imageUrl' in b) patch.image_url = imageUrl(b.imageUrl);
  if ('amenities' in b) patch.amenities = (Array.isArray(b.amenities) ? b.amenities : []).filter((a) => typeof a === 'string').map((a) => a.trim().slice(0, 40)).filter(Boolean).slice(0, 10);
  if (!Object.keys(patch).length) return;
  const rows = unwrap(await scoped(db().from('buses').update(patch).eq('id', id), vendorId).select('id'));
  if (!rows.length) throw new HttpError(404, 'Bus not found');
  await audit(actor, 'BUS_UPDATED', 'bus', id, patch);
}

export async function removeBus(actor, vendorId, id) {
  const bus = unwrap(await scoped(db().from('buses').select('id,capacity_id,code').eq('id', id), vendorId).maybeSingle());
  if (!bus) throw new HttpError(404, 'Bus not found');
  const trips = unwrap(await db().from('trips').select('id').eq('bus_id', id));
  const sold = await bookingCount(trips.map((t) => t.id));
  if (sold) throw new HttpError(409, `This bus has ${sold} booking${sold === 1 ? '' : 's'} on its trips. Cancel those trips and finish the refunds first, or set the bus Off duty instead.`);
  unwrap(await db().from('trips').delete().eq('bus_id', id));
  unwrap(await db().from('trip_schedules').delete().eq('bus_id', id));
  unwrap(await db().from('buses').delete().eq('id', id));
  const shared = await db().from('buses').select('id', { count: 'exact', head: true }).eq('capacity_id', bus.capacity_id);
  if (!shared.count) unwrap(await db().from('bus_capacities').delete().eq('id', bus.capacity_id));
  await audit(actor, 'BUS_DELETED', 'bus', id, { code: bus.code, trips_removed: trips.length });
}

export async function updateTripFare(actor, vendorId, id, fare) {
  const trip = unwrap(await scoped(db().from('trips').select('id,permission_id,route_permissions(approved_fare)').eq('id', id), vendorId).maybeSingle());
  if (!trip) throw new HttpError(404, 'Trip not found');
  const perm = Array.isArray(trip.route_permissions) ? trip.route_permissions[0] : trip.route_permissions;
  const max = perm?.approved_fare != null ? Number(perm.approved_fare) : 20000;
  if (!Number.isFinite(fare) || fare < 50 || fare > max) throw new HttpError(400, `Fare must be between 50 and ${max} BDT`);
  unwrap(await db().from('trips').update({ fare }).eq('id', id));
  await audit(actor, 'TRIP_FARE_UPDATED', 'trip', id, { fare });
}

export async function removeTrip(actor, vendorId, id) {
  const trip = unwrap(await scoped(db().from('trips').select('id').eq('id', id), vendorId).maybeSingle());
  if (!trip) throw new HttpError(404, 'Trip not found');
  const sold = await bookingCount([id]);
  if (sold) throw new HttpError(409, `This trip has ${sold} booking${sold === 1 ? '' : 's'}. Cancel the trip instead so passengers are refunded.`);
  unwrap(await db().from('trips').delete().eq('id', id));
  await audit(actor, 'TRIP_DELETED', 'trip', id);
}

export async function removePermission(actor, vendorId, id) {
  const perm = unwrap(await scoped(db().from('route_permissions').select('id,origin,destination').eq('id', id), vendorId).maybeSingle());
  if (!perm) throw new HttpError(404, 'Route not found');
  const trips = unwrap(await db().from('trips').select('id').eq('permission_id', id));
  const sold = await bookingCount(trips.map((t) => t.id));
  if (sold) throw new HttpError(409, `${sold} booking${sold === 1 ? '' : 's'} exist on trips for this route. Cancel those trips and finish the refunds first.`);
  unwrap(await db().from('trips').delete().eq('permission_id', id));
  unwrap(await db().from('trip_schedules').delete().eq('permission_id', id));
  unwrap(await db().from('route_permissions').delete().eq('id', id));
  await audit(actor, 'ROUTE_REQUEST_DELETED', 'route_permission', id, { route: `${perm.origin} to ${perm.destination}`, trips_removed: trips.length });
}
