import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import AdminShell from '../../src/components/AdminShell.jsx';
import PromptModal from '../../src/components/PromptModal.jsx';
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { formatBDT, formatDateTime } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';

export default function AdminTrips() {
  const { loading, error, data, reload } = useApi('/api/admin/trips');
  const [trip, setTrip] = useState(null);
  return (
    <AdminShell title="Trips" subtitle="Upcoming departures across all operators.">
      {loading ? <Skeleton lines={6} /> : error ? <ErrorState error={error} onRetry={reload} />
        : !data.trips.length ? <EmptyState icon={CalendarClock} title="No upcoming trips" /> : (
          <div className="card table-wrap"><table className="table">
            <thead><tr><th>Departure</th><th>Operator</th><th>Route</th><th>Bus</th><th>Fare</th><th>Status</th><th /></tr></thead>
            <tbody>{data.trips.map((t) => (
              <tr key={t.id}><td className="nowrap">{formatDateTime(t.departureAt)}</td><td>{t.operator}</td><td>{t.origin} → {t.destination}</td><td>{t.bus}<div className="muted small">{t.regNo}</div></td><td>{formatBDT(t.fare)}</td>
                <td><Badge tone={t.status === 'CANCELLED' ? 'danger' : 'ok'}>{t.status}</Badge></td>
                <td className="right">{t.status !== 'CANCELLED' && <Button size="small" variant="ghost" onClick={() => setTrip(t)}>Cancel</Button>}</td></tr>
            ))}</tbody></table></div>
        )}
      {trip && <PromptModal title={`Cancel ${trip.origin} → ${trip.destination}`} label="Reason shown to passengers" type="textarea" min={5} confirm="Cancel trip and queue refunds" tone="danger" onClose={() => setTrip(null)}
        onSubmit={async (reason) => { await api(`/api/admin/trips/${trip.id}/cancel`, { method: 'POST', body: { reason } }); setTrip(null); reload(); }}>
        <p className="muted small">Every confirmed passenger gets a full refund.</p></PromptModal>}
    </AdminShell>
  );
}
