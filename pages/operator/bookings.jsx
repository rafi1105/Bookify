import OperatorShell from '../../src/components/OperatorShell.jsx';
import BookingsTable from '../../src/components/BookingsTable.jsx';

export default function OperatorBookings() {
  return (
    <OperatorShell title="Bookings" subtitle="Who bought tickets on your trips: passenger, seats, payment status and refunds. Unpaid reservations appear as Awaiting payment until paid or expired.">
      <BookingsTable endpoint="/api/operator/bookings" detailUrl={(id) => `/api/operator/bookings/${id}`} />
    </OperatorShell>
  );
}
