import { db, unwrap } from './db.js';
import { HttpError } from './http.js';

const TRIP = 'id,status,departure_at,arrival_at,fare,vendor_id,routes(start_point,end_point),buses(name,model_no,reg_no,bus_type,amenities,bus_operators(operator_name))';

function one(value) {
  return Array.isArray(value) ? value[0] : value;
}

// Normalised booking used by checkout, tickets and account pages.
export async function loadBooking({ id, pnr, userId, phone }) {
  let query = db().from('bookings').select('*');
  query = id ? query.eq('id', id) : query.eq('pnr', String(pnr || '').toUpperCase());
  const booking = unwrap(await query.maybeSingle());
  if (!booking) throw new HttpError(404, 'Booking not found');
  if (userId && booking.user_id !== userId) throw new HttpError(404, 'Booking not found');
  if (phone && (booking.contact_phone || '').replace(/\D/g, '').slice(-10) !== phone.replace(/\D/g, '').slice(-10)) {
    throw new HttpError(404, 'Booking not found');
  }

  const [trip, items, payment, stops] = await Promise.all([
    db().from('trips').select(TRIP).eq('id', booking.trip_id).single().then(unwrap),
    db().from('booking_items').select('seat_number,status,price,passengers(name,age,gender)').eq('booking_id', booking.id).order('seat_number').then(unwrap),
    db().from('payments').select('status,payment_method,transaction_id,payment_time').eq('booking_id', booking.id).maybeSingle().then(unwrap),
    db().from('route_stops').select('id,stop_name,address,travel_time_min').in('id', [booking.boarding_stop_id, booking.dropping_stop_id].filter(Boolean)).then(unwrap),
  ]);
  const stop = (sid) => {
    const s = stops.find((x) => x.id === sid);
    return s ? { name: s.stop_name, address: s.address, time: new Date(new Date(trip.departure_at).getTime() + s.travel_time_min * 60000).toISOString() } : null;
  };
  const bus = one(trip.buses);

  const live = items.filter((i) => ['HELD', 'CONFIRMED'].includes(i.status));
  const shown = live.length ? live : items;
  let refundPercent = null;
  if (booking.status === 'CONFIRMED') {
    const hours = (new Date(trip.departure_at) - Date.now()) / 3600000;
    refundPercent = unwrap(await db().rpc('bk_refund_percent', { hours_left: hours }));
  }

  return {
    id: booking.id,
    pnr: booking.pnr,
    status: booking.status,
    total: Number(booking.total_amount),
    seatCount: booking.seat_count,
    expiresAt: booking.expires_at,
    confirmedAt: booking.confirmed_at,
    createdAt: booking.created_at,
    cancelledAt: booking.cancelled_at,
    cancelReason: booking.cancel_reason,
    refund: { amount: Number(booking.refund_amount || 0), status: booking.refund_status, reference: booking.refund_reference },
    refundPercentNow: refundPercent,
    contact: { name: booking.contact_name, phone: booking.contact_phone, email: booking.contact_email },
    trip: {
      id: trip.id, status: trip.status, departureAt: trip.departure_at, arrivalAt: trip.arrival_at, fare: Number(trip.fare),
      origin: one(trip.routes).start_point, destination: one(trip.routes).end_point,
      busName: bus.name || bus.model_no, regNo: bus.reg_no, busType: bus.bus_type,
      operator: one(bus.bus_operators).operator_name,
    },
    boarding: stop(booking.boarding_stop_id),
    dropping: stop(booking.dropping_stop_id),
    seats: shown.map((i) => ({ seat: i.seat_number, status: i.status, price: Number(i.price), passenger: one(i.passengers) || null })),
    payment: payment ? { status: payment.status, method: payment.payment_method, transactionId: payment.transaction_id, paidAt: payment.payment_time } : null,
  };
}
