import AdminShell from '../../src/components/AdminShell.jsx';
import FleetBoard from '../../src/components/FleetBoard.jsx';

export default function AdminFleet() {
  return (
    <AdminShell title="Fleet" subtitle="Every operator's buses and their live status.">
      <FleetBoard endpoint="/api/admin/fleet" patchUrl={(id) => `/api/admin/buses/${id}`} admin />
    </AdminShell>
  );
}
