import { route } from '../../../src/server/http.js';
import { requireUser } from '../../../src/server/auth.js';
import { db, unwrap } from '../../../src/server/db.js';

const one = (v) => (Array.isArray(v) ? v[0] : v);

export default route({
  async GET(req) {
    const user = await requireUser(req);
    const rows = unwrap(await db().from('bookings')
      .select('id,pnr,status,total_amount,seat_count,created_at,confirmed_at,refund_status,refund_amount,expires_at,booking_items(seat_number,status),trips(departure_at,arrival_at,dep_delay_min,traffic_delay_min,delay_cause,status,routes(start_point,end_point),buses(bus_operators(operator_name)))')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100));
    const bookings = rows
      // Abandoned holds are noise: show only bookings that were paid for or are still payable.
      .filter((b) => b.confirmed_at || b.refund_status !== 'NONE' || (b.status === 'PENDING_PAYMENT' && new Date(b.expires_at) > new Date()))
      .map((b) => {
        const t = one(b.trips);
        return {
          seats: (b.booking_items || []).filter((i) => ['HELD', 'CONFIRMED'].includes(i.status)).map((i) => i.seat_number).sort(),
          id: b.id, pnr: b.pnr, status: b.status, total: Number(b.total_amount), seatCount: b.seat_count, refundStatus: b.refund_status,
          refundAmount: Number(b.refund_amount), departureAt: new Date(new Date(t.departure_at).getTime() + t.dep_delay_min * 60000).toISOString(), scheduledDepartureAt: t.departure_at,
          delayMin: t.dep_delay_min + t.traffic_delay_min, delayCause: t.delay_cause, tripStatus: t.status,
          origin: one(t.routes).start_point, destination: one(t.routes).end_point,
          operator: one(one(t.buses).bus_operators).operator_name,
        };
      });
    return { bookings };
  },
});
