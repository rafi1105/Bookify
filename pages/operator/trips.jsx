import TripStatus from '../../src/components/TripStatus.jsx';
import Link from 'next/link';
import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import DataTable from '../../src/components/DataTable.jsx';
import { ConfirmModal } from '../../src/components/BusActions.jsx';
import OperatorShell from '../../src/components/OperatorShell.jsx';
import { Alert, Button, EmptyState, ErrorState, Field, Modal, ModalSection, Skeleton } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { COACH_LABEL, addDays, dhakaToday, formatBDT, formatDateTime, formatDuration } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Schedule({ onDone, onClose }) {
  const routes = useApi('/api/operator/routes');
  const buses = useApi('/api/operator/buses');
  const [f, setF] = useState({ permissionId: '', busId: '', time: '08:00', days: [0, 1, 2, 3, 4, 5, 6], from: dhakaToday(1), until: addDays(dhakaToday(1), 6), fare: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const approved = (routes.data?.permissions || []).filter((p) => p.status === 'APPROVED');
  const perm = approved.find((p) => p.id === f.permissionId);
  const ready = !(routes.loading || buses.loading) && approved.length > 0;
  const matching = (buses.data?.buses || []).filter((b) => b.status === 'ACTIVE' && (!perm || b.bus_type === perm.bus_type));

  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const res = await api('/api/operator/trips', { method: 'POST', body: { ...f, fare: Number(f.fare || perm?.approved_fare) } });
      onDone(res.trips_created);
    } catch (err) { setError(err.message); setBusy(false); }
  }
  const toggle = (d) => setF({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] });

  return (
    <Modal title="Publish trips" subtitle="Create departures for a route across a date range." size="lg" onClose={onClose}
      {...(ready ? { onSubmit: save, submitLabel: 'Publish trips', busy, error } : {})}>
      {(routes.loading || buses.loading) ? <Skeleton lines={5} /> : !approved.length ? (
        <Alert kind="warn">You need an approved route first. Request one under Routes and fares and wait for the admin to approve it.</Alert>
      ) : (
        <div className="modal-sections">
          <ModalSection title="Route and bus">
            <div className="form-grid">
              <Field label="Route and class" id="s-route"><select id="s-route" required className="select" value={f.permissionId} onChange={(e) => { const p = approved.find((x) => x.id === e.target.value); setF({ ...f, permissionId: e.target.value, busId: '', fare: p ? String(p.approved_fare) : '' }); }}>
                <option value="">Select…</option>{approved.map((p) => <option key={p.id} value={p.id}>{p.origin} → {p.destination} · {COACH_LABEL[p.bus_type]} · {formatDuration(p.approved_duration_min)} (max {formatBDT(p.approved_fare)})</option>)}</select></Field>
              <Field label="Bus" id="s-bus" hint={perm && !matching.length ? `Add an available ${COACH_LABEL[perm.bus_type]} bus first.` : perm ? `A bus is free again ${formatDuration(perm.approved_duration_min)} after it departs.` : undefined}><select id="s-bus" required className="select" value={f.busId} onChange={(e) => setF({ ...f, busId: e.target.value })}>
                <option value="">Select…</option>{matching.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.reg_no}</option>)}</select></Field>
            </div>
          </ModalSection>
          <ModalSection title="Schedule">
            <div className="form-grid">
              <Field label="Departure time (Dhaka)" id="s-time"><input id="s-time" type="time" required className="input" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
              <Field label="Fare per seat (BDT)" id="s-fare"><input id="s-fare" type="number" required className="input" value={f.fare} onChange={(e) => setF({ ...f, fare: e.target.value })} /></Field>
              <Field label="First date" id="s-from"><input id="s-from" type="date" required min={dhakaToday()} className="input" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
              <Field label="Last date" id="s-until"><input id="s-until" type="date" required min={f.from} max={addDays(f.from, 90)} className="input" value={f.until} onChange={(e) => setF({ ...f, until: e.target.value })} /></Field>
            </div>
            <div className="stack-s"><span className="field-label">Runs on</span><div className="row">{DAYS.map((d, i) => <button type="button" key={d} className="chip" aria-pressed={f.days.includes(i)} onClick={() => toggle(i)}>{d}</button>)}</div></div>
          </ModalSection>
        </div>
      )}
    </Modal>
  );
}

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

function Manifest({ trip, onClose }) {
  const { loading, error, data } = useApi(`/api/operator/trips/${trip.id}/manifest`);
  return (
    <Modal title={`Manifest · ${trip.origin} → ${trip.destination}`} subtitle={`${formatDateTime(trip.departureAt)} · ${trip.bus} · ${trip.regNo}`} size="xl" onClose={onClose}
      footer={<><Button type="button" variant="secondary" onClick={onClose}>Close</Button><Button type="button" onClick={() => window.print()}>Print</Button></>}>
      {loading ? <Skeleton lines={4} /> : error ? <ErrorState error={error} /> : !data.passengers.length ? <p className="muted">No confirmed passengers yet.</p> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Seat</th><th>Passenger</th><th>Phone</th><th>Boards at</th><th>PNR</th></tr></thead>
          <tbody>{data.passengers.map((p) => <tr key={p.seat}><td><strong>{p.seat}</strong></td><td>{p.passenger}<div className="muted small">{p.age} · {p.gender}</div></td><td>{p.contact_phone}</td><td>{p.boarding}</td><td><Link href={`/operator/bookings?q=${p.pnr}`}><code className="code">{p.pnr}</code></Link></td></tr>)}</tbody></table></div>
      )}
    </Modal>
  );
}

function CancelTrip({ trip, onDone, onClose }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api(`/api/operator/trips/${trip.id}/cancel`, { method: 'POST', body: { reason } }); onDone(); } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title="Cancel this trip" size="sm" onClose={onClose} onSubmit={go} submitLabel="Cancel trip" cancelLabel="Keep trip" submitTone="danger" busy={busy} submitDisabled={reason.trim().length < 5} error={error}>
      <div className="stack">
        <Alert kind="warn">All {trip.sold} confirmed passenger{trip.sold === 1 ? '' : 's'} will receive a full refund. This cannot be undone.</Alert>
        <Field label="Reason shown to passengers" id="c-reason"><textarea id="c-reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

export default function OperatorTrips() {
  const [scope, setScope] = useState('upcoming');
  const { loading, error, data, reload } = useApi(`/api/operator/trips?scope=${scope}`);
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const columns = (sc) => [
    { key: 'dep', label: 'Departure', sort: (t) => t.departureAt, className: 'nowrap', render: (t) => formatDateTime(t.departureAt) },
    { key: 'route', label: 'Route', sort: (t) => `${t.origin} ${t.destination}`, render: (t) => <strong>{t.origin} → {t.destination}</strong> },
    { key: 'bus', label: 'Bus', sort: (t) => t.regNo, render: (t) => <>{t.bus}<div className="muted small">{t.regNo}</div></> },
    { key: 'sold', label: 'Sold', sort: (t) => t.sold, render: (t) => <>{t.sold}/{t.capacity}</> },
    { key: 'fare', label: 'Fare', sort: (t) => t.fare, render: (t) => formatBDT(t.fare) },
    { key: 'status', label: 'Status', sort: (t) => t.status, render: (t) => <TripStatus trip={t} /> },
    { key: 'actions', label: '', align: 'right', className: 'nowrap', render: (t) => (
      <>
        <Button variant="ghost" size="small" onClick={() => setModal({ kind: 'manifest', trip: t })}>Manifest</Button>
        {sc === 'upcoming' && ['SCHEDULED', 'DELAYED'].includes(t.status) && <Button variant="ghost" size="small" onClick={() => setModal({ kind: 'fare', trip: t })}>Fare</Button>}
        {sc === 'upcoming' && ['SCHEDULED', 'DELAYED'].includes(t.status) && <Button variant="ghost" size="small" onClick={() => setModal({ kind: 'cancel', trip: t })}>Cancel</Button>}
        {t.sold === 0 && <Button variant="ghost" size="small" onClick={() => setModal({ kind: 'delete', trip: t })}>Delete</Button>}
      </>
    ) },
  ];
  const filters = [{ key: 'status', label: 'Status', options: [['SCHEDULED', 'Scheduled'], ['DELAYED', 'Delayed'], ['EN_ROUTE', 'En route'], ['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled']], match: (t, v) => t.status === v }];
  return (
    <OperatorShell title="Trips" subtitle="Published departures, passenger manifests and cancellations." actions={<Button onClick={() => setModal({ kind: 'schedule' })}>Publish trips</Button>}>
      {notice && <Alert kind="ok">{notice}</Alert>}
      <div className="tabs" role="tablist">{['upcoming', 'past'].map((s) => <button key={s} role="tab" className="tab" aria-selected={scope === s} onClick={() => setScope(s)}>{s === 'upcoming' ? 'Upcoming' : 'Past'}</button>)}</div>
      {loading ? <Skeleton lines={6} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <DataTable rows={data.trips} columns={columns(scope)} filters={filters} dateField={(t) => t.departureAt} initialSort={{ key: 'dep', dir: scope === 'past' ? 'desc' : 'asc' }} key={scope}
          searchPlaceholder="Search route, bus or registration" searchText={(t) => `${t.origin} ${t.destination} ${t.bus} ${t.regNo}`}
          empty={<EmptyState icon={CalendarClock} title={`No ${scope} trips`}>{scope === 'upcoming' ? 'Publish trips to put your buses on sale.' : 'Completed trips appear here.'}</EmptyState>} />
      )}
      {modal?.kind === 'schedule' && <Schedule onClose={() => setModal(null)} onDone={(n) => { setModal(null); setNotice(`${n} trip${n === 1 ? '' : 's'} published.`); reload(); }} />}
      {modal?.kind === 'fare' && <EditFare trip={modal.trip} url={`/api/operator/trips/${modal.trip.id}`} onClose={() => setModal(null)} onDone={() => { setModal(null); setNotice('Fare updated.'); reload(); }} />}
      {modal?.kind === 'delete' && <ConfirmModal title="Delete this trip?" message={`${modal.trip.origin} → ${modal.trip.destination}, ${formatDateTime(modal.trip.departureAt)} has no bookings and will be removed. This cannot be undone.`}
        onClose={() => setModal(null)} onConfirm={async () => { await api(`/api/operator/trips/${modal.trip.id}`, { method: 'DELETE' }); setModal(null); setNotice('Trip deleted.'); reload(); }} />}
      {modal?.kind === 'manifest' && <Manifest trip={modal.trip} onClose={() => setModal(null)} />}
      {modal?.kind === 'cancel' && <CancelTrip trip={modal.trip} onClose={() => setModal(null)} onDone={() => { setModal(null); setNotice('Trip cancelled. Passenger refunds have been queued.'); reload(); }} />}
    </OperatorShell>
  );
}
