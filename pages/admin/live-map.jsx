import AdminShell from '../../src/components/AdminShell.jsx';
import LiveTracking from '../../src/components/map/LiveTracking.jsx';

export default function AdminLiveMap() {
  return (
    <AdminShell title="Live map" subtitle="Every operator's buses on the road, in their colours, with speed, arrival countdown and whether they run on schedule.">
      <LiveTracking />
    </AdminShell>
  );
}
