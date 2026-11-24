import TripStatus from '../../src/components/TripStatus.jsx';
import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import AdminShell from '../../src/components/AdminShell.jsx';
import DataTable from '../../src/components/DataTable.jsx';
import { ConfirmModal } from '../../src/components/BusActions.jsx';
import PromptModal from '../../src/components/PromptModal.jsx';
import { Button, EmptyState, ErrorState, Field, Modal, Skeleton } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { formatBDT, formatDateTime } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';

function EditFare({ trip, url, onDone, onClose }) {
  const [fare, setFare] = useState(String(trip.fare));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api(url, { method: 'PATCH', body: { fare: Number(fare) } }); onDone(); } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title="Change fare" subtitle={`${trip.origin} → ${trip.destination} · ${formatDateTime(trip.departureAt)}`} size="sm" onClose={onClose} onSubmit={save} submitLabel="Save fare" busy={busy} submitDisabled={!fare} error={error}>
      <Field label="Fare per seat (BDT)" id="f-fare" hint="Cannot exceed the approved fare for the route. Booked passengers keep what they paid."><input id="f-fare" type="number" min="50" className="input" value={fare} onChange={(e) => setFare(e.target.value)} /></Field>
    </Modal>
  );
}

export default function AdminTrips() {
  const { loading, error, data, reload } = useApi('/api/admin/trips');
  const [trip, setTrip] = useState(null);
  const [fareTrip, setFareTrip] = useState(null);
  const [removing, setRemoving] = useState(null);
  const columns = [
    { key: 'dep', label: 'Departure', sort: (t) => t.departureAt, className: 'nowrap', render: (t) => formatDateTime(t.departureAt) },
    { key: 'operator', label: 'Operator', sort: (t) => t.operator, render: (t) => t.operator },
    { key: 'route', label: 'Route', sort: (t) => `${t.origin} ${t.destination}`, render: (t) => <strong>{t.origin} → {t.destination}</strong> },
    { key: 'bus', label: 'Bus', sort: (t) => t.regNo, render: (t) => <>{t.bus}<div className="muted small">{t.regNo}</div></> },
    { key: 'fare', label: 'Fare', sort: (t) => t.fare, render: (t) => formatBDT(t.fare) },
    { key: 'status', label: 'Status', sort: (t) => t.status, render: (t) => <TripStatus trip={t} /> },
    { key: 'actions', label: '', align: 'right', className: 'nowrap', render: (t) => (
      <>{['SCHEDULED', 'DELAYED'].includes(t.status) && <Button size="small" variant="ghost" onClick={() => setFareTrip(t)}>Fare</Button>}{['SCHEDULED', 'DELAYED'].includes(t.status) && <Button size="small" variant="ghost" onClick={() => setTrip(t)}>Cancel</Button>}<Button size="small" variant="ghost" onClick={() => setRemoving(t)}>Delete</Button></>
    ) },
  ];
  const filters = (rows) => [
    { key: 'operator', label: 'Operator', options: [...new Set(rows.map((t) => t.operator))].sort().map((o) => [o, o]), match: (t, v) => t.operator === v },
    { key: 'status', label: 'Status', options: [['SCHEDULED', 'Scheduled'], ['DELAYED', 'Delayed'], ['EN_ROUTE', 'En route'], ['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled']], match: (t, v) => t.status === v },
  ];
  return (
    <AdminShell title="Trips" subtitle="Upcoming departures across all operators.">
      {loading ? <Skeleton lines={6} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <DataTable rows={data.trips} columns={columns} filters={filters(data.trips)} dateField={(t) => t.departureAt} initialSort={{ key: 'dep', dir: 'asc' }}
          searchPlaceholder="Search operator, route, bus or registration" searchText={(t) => `${t.operator} ${t.origin} ${t.destination} ${t.bus} ${t.regNo}`}
          empty={<EmptyState icon={CalendarClock} title="No upcoming trips" />} />
      )}
      {fareTrip && <EditFare trip={fareTrip} url={`/api/admin/trips/${fareTrip.id}`} onClose={() => setFareTrip(null)} onDone={() => { setFareTrip(null); reload(); }} />}
      {removing && <ConfirmModal title="Delete this trip?" message={`${removing.origin} → ${removing.destination}, ${formatDateTime(removing.departureAt)}. A trip with bookings cannot be deleted: cancel it instead so passengers are refunded.`}
        onClose={() => setRemoving(null)} onConfirm={async () => { await api(`/api/admin/trips/${removing.id}`, { method: 'DELETE' }); setRemoving(null); reload(); }} />}
      {trip && <PromptModal title={`Cancel ${trip.origin} → ${trip.destination}`} label="Reason shown to passengers" type="textarea" min={5} confirm="Cancel trip and queue refunds" tone="danger" onClose={() => setTrip(null)}
        onSubmit={async (reason) => { await api(`/api/admin/trips/${trip.id}/cancel`, { method: 'POST', body: { reason } }); setTrip(null); reload(); }}>
        <p className="muted small">Every confirmed passenger gets a full refund.</p></PromptModal>}
    </AdminShell>
  );
}
