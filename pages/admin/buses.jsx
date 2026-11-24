import AdminShell from '../../src/components/AdminShell.jsx';
import BusList from '../../src/components/BusList.jsx';
import { ErrorState, Skeleton } from '../../src/components/ui.jsx';
import { useApi } from '../../src/lib/useApi.js';

const detailHref = (id) => `/admin/buses/${id}`;
const patchUrl = (id) => `/api/admin/buses/${id}`;

export default function AdminBuses() {
  const { loading, error, data, reload } = useApi('/api/admin/buses');
  return (
    <AdminShell title="Buses" subtitle="Every bus on the platform. Search by registration number, code, name or operator.">
      {loading ? <Skeleton lines={6} /> : error ? <ErrorState error={error} onRetry={reload} /> : <BusList buses={data.buses} admin detailHref={detailHref} patchUrl={patchUrl} onChange={reload} />}
    </AdminShell>
  );
}
