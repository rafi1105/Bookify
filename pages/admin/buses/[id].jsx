import { useRouter } from 'next/router';
import AdminShell from '../../../src/components/AdminShell.jsx';
import BusDetail from '../../../src/components/BusDetail.jsx';

export default function AdminBus() {
  const { query } = useRouter();
  return (
    <AdminShell title="Bus details" subtitle="Details, current position and history of one bus.">
      {query.id && <BusDetail endpoint={`/api/admin/buses/${query.id}`} backHref="/admin/buses" backLabel="All buses" patchUrl={(id) => `/api/admin/buses/${id}`} />}
    </AdminShell>
  );
}
