import { db, unwrap } from './db.js';

const one = (v) => (Array.isArray(v) ? v[0] : v);

// One plain-language payment status for the operator and admin booking lists.
export function paymentLabel(b, payment) {
  if (b.refund_status === 'PROCESSED') return 'REFUNDED';
  if (b.refund_status === 'PENDING') return 'REFUND_PENDING';
  if (b.confirmed_at) return 'PAID';
  if (b.status === 'CANCELLED') return 'CANCELLED';
  if (payment?.status === 'FAILED') return 'FAILED';
  if (b.status === 'PENDING_PAYMENT') return new Date(b.expires_at) > new Date() ? 'AWAITING_PAYMENT' : 'EXPIRED';
  return b.status;
}

// Bookings on trips, newest first. Pass vendorId to limit an operator to their own trips.
export async function listBookings({ vendorId = null } = {}) {
  let query = db().from('bookings')
    .select('id,pnr,status,total_amount,seat_count,created_at,confirmed_at,expires_at,cancelled_at,contact_name,contact_phone,contact_email,refund_status,refund_amount,'
      + 'trips!inner(id,vendor_id,departure_at,routes(start_point,end_point),buses(name,reg_no,bus_operators(operator_name))),'
      + 'payments(status,payment_method,transaction_id,payment_time),booking_items(seat_number,status)')
    .order('created_at', { ascending: false }).limit(2000);
  if (vendorId) query = query.eq('trips.vendor_id', vendorId);
  const rows = unwrap(await query);
  return rows.map((b) => {
    const t = one(b.trips);
    const pay = one(b.payments);
    const bus = one(t.buses);
    const live = (b.booking_items || []).filter((i) => ['HELD', 'CONFIRMED'].includes(i.status));
    return {
      id: b.id, pnr: b.pnr, status: b.status, paymentStatus: paymentLabel(b, pay), total: Number(b.total_amount), seatCount: b.seat_count,
      seats: (live.length ? live : b.booking_items || []).map((i) => i.seat_number).sort(),
      createdAt: b.created_at, paidAt: pay?.payment_time || b.confirmed_at, method: pay?.payment_method || null, transactionId: pay?.transaction_id || null,
      refundStatus: b.refund_status, refundAmount: Number(b.refund_amount || 0),
      passenger: b.contact_name, phone: b.contact_phone, email: b.contact_email,
      tripId: t.id, departureAt: t.departure_at, origin: one(t.routes).start_point, destination: one(t.routes).end_point,
      bus: bus.name, regNo: bus.reg_no, operator: one(bus.bus_operators).operator_name,
    };
  });
}
