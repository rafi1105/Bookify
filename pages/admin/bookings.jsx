import AdminShell from '../../src/components/AdminShell.jsx';
import BookingsTable from '../../src/components/BookingsTable.jsx';

export default function AdminBookings() {
  return (
    <AdminShell title="Bookings" subtitle="Every booking across all operators, with passenger, payment and refund details.">
      <BookingsTable admin endpoint="/api/admin/bookings" detailUrl={(id) => `/api/admin/bookings/${id}`} />
    </AdminShell>
  );
}
