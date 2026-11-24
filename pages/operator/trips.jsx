import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import OperatorShell from '../../src/components/OperatorShell.jsx';
import { Alert, Badge, Button, EmptyState, ErrorState, Field, Modal, Skeleton } from '../../src/components/ui.jsx';
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
    <Modal title="Publish trips" onClose={onClose}>
      {(routes.loading || buses.loading) ? <Skeleton lines={5} /> : !approved.length ? (
        <Alert kind="warn">You need an approved route first. Request one under Routes and fares and wait for the admin to approve it.</Alert>
      ) : (
        <form className="stack" onSubmit={save}>
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Route and class" id="s-route"><select id="s-route" required className="select" value={f.permissionId} onChange={(e) => { const p = approved.find((x) => x.id === e.target.value); setF({ ...f, permissionId: e.target.value, busId: '', fare: p ? String(p.approved_fare) : '' }); }}>
            <option value="">Select…</option>{approved.map((p) => <option key={p.id} value={p.id}>{p.origin} → {p.destination} · {COACH_LABEL[p.bus_type]} · {formatDuration(p.approved_duration_min)} (max {formatBDT(p.approved_fare)})</option>)}</select></Field>
          <Field label="Bus" id="s-bus" hint={perm && !matching.length ? `Add an available ${COACH_LABEL[perm.bus_type]} bus first.` : perm ? `A bus is free again ${formatDuration(perm.approved_duration_min)} after it departs.` : undefined}><select id="s-bus" required className="select" value={f.busId} onChange={(e) => setF({ ...f, busId: e.target.value })}>
            <option value="">Select…</option>{matching.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.reg_no}</option>)}</select></Field>
          <div className="form-grid">
            <Field label="Departure time (Dhaka)" id="s-time"><input id="s-time" type="time" required className="input" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
            <Field label="Fare per seat (BDT)" id="s-fare"><input id="s-fare" type="number" required className="input" value={f.fare} onChange={(e) => setF({ ...f, fare: e.target.value })} /></Field>
            <Field label="First date" id="s-from"><input id="s-from" type="date" required min={dhakaToday()} className="input" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
            <Field label="Last date" id="s-until"><input id="s-until" type="date" required min={f.from} max={addDays(f.from, 90)} className="input" value={f.until} onChange={(e) => setF({ ...f, until: e.target.value })} /></Field>
          </div>
          <div className="stack-s"><span className="field-label">Runs on</span><div className="row">{DAYS.map((d, i) => <button type="button" key={d} className="chip" aria-pressed={f.days.includes(i)} onClick={() => toggle(i)}>{d}</button>)}</div></div>
          <Button type="submit" loading={busy}>Publish trips</Button>
        </form>
      )}
    </Modal>
  );
}

function Manifest({ trip, onClose }) {
  const { loading, error, data } = useApi(`/api/operator/trips/${trip.id}/manifest`);
  return (
    <Modal title={`Manifest · ${trip.origin} → ${trip.destination}`} onClose={onClose}>
      <p className="muted small">{formatDateTime(trip.departureAt)} · {trip.bus} · {trip.regNo}</p>
      {loading ? <Skeleton lines={4} /> : error ? <ErrorState error={error} /> : !data.passengers.length ? <p className="muted">No confirmed passengers yet.</p> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Seat</th><th>Passenger</th><th>Phone</th><th>Boards at</th><th>PNR</th></tr></thead>
          <tbody>{data.passengers.map((p) => <tr key={p.seat}><td><strong>{p.seat}</strong></td><td>{p.passenger}<div className="muted small">{p.age} · {p.gender}</div></td><td>{p.contact_phone}</td><td>{p.boarding}</td><td>{p.pnr}</td></tr>)}</tbody></table></div>
      )}
      <div className="no-print"><Button variant="secondary" onClick={() => window.print()}>Print</Button></div>
    </Modal>
  );
}

function CancelTrip({ trip, onDone, onClose }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setError('');
    try { await api(`/api/operator/trips/${trip.id}/cancel`, { method: 'POST', body: { reason } }); onDone(); } catch (e) { setError(e.message); setBusy(false); }
  }
  return (
    <Modal title="Cancel this trip" onClose={onClose}>
      <Alert kind="warn">All {trip.sold} confirmed passenger{trip.sold === 1 ? '' : 's'} will receive a full refund. This cannot be undone.</Alert>
      <Field label="Reason shown to passengers" id="c-reason"><textarea id="c-reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      {error && <Alert kind="error">{error}</Alert>}
      <Button variant="danger" loading={busy} disabled={reason.trim().length < 5} onClick={go}>Cancel trip</Button>
    </Modal>
  );
}

export default function OperatorTrips() {
  const [scope, setScope] = useState('upcoming');
  const { loading, error, data, reload } = useApi(`/api/operator/trips?scope=${scope}`);
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  return (
    <OperatorShell title="Trips" subtitle="Published departures, passenger manifests and cancellations." actions={<Button onClick={() => setModal({ kind: 'schedule' })}>Publish trips</Button>}>
      {notice && <Alert kind="ok">{notice}</Alert>}
      <div className="tabs" role="tablist">{['upcoming', 'past'].map((s) => <button key={s} role="tab" className="tab" aria-selected={scope === s} onClick={() => setScope(s)}>{s === 'upcoming' ? 'Upcoming' : 'Past'}</button>)}</div>
      {loading ? <Skeleton lines={6} /> : error ? <ErrorState error={error} onRetry={reload} />
        : !data.trips.length ? <EmptyState icon={CalendarClock} title={`No ${scope} trips`}>{scope === 'upcoming' ? 'Publish trips to put your buses on sale.' : 'Completed trips appear here.'}</EmptyState> : (
          <div className="card table-wrap"><table className="table">
            <thead><tr><th>Departure</th><th>Route</th><th>Bus</th><th>Sold</th><th>Fare</th><th>Status</th><th /></tr></thead>
            <tbody>{data.trips.map((t) => (
              <tr key={t.id}><td className="nowrap">{formatDateTime(t.departureAt)}</td><td>{t.origin} → {t.destination}</td><td>{t.bus}<div className="muted small">{t.regNo}</div></td>
                <td>{t.sold}/{t.capacity}</td><td>{formatBDT(t.fare)}</td><td><Badge tone={t.status === 'CANCELLED' ? 'danger' : 'ok'}>{t.status}</Badge></td>
                <td className="right nowrap"><Button variant="ghost" size="small" onClick={() => setModal({ kind: 'manifest', trip: t })}>Manifest</Button>
                  {scope === 'upcoming' && t.status !== 'CANCELLED' && <Button variant="ghost" size="small" onClick={() => setModal({ kind: 'cancel', trip: t })}>Cancel</Button>}</td></tr>
            ))}</tbody></table></div>
        )}
      {modal?.kind === 'schedule' && <Schedule onClose={() => setModal(null)} onDone={(n) => { setModal(null); setNotice(`${n} trip${n === 1 ? '' : 's'} published.`); reload(); }} />}
      {modal?.kind === 'manifest' && <Manifest trip={modal.trip} onClose={() => setModal(null)} />}
      {modal?.kind === 'cancel' && <CancelTrip trip={modal.trip} onClose={() => setModal(null)} onDone={() => { setModal(null); setNotice('Trip cancelled. Passenger refunds have been queued.'); reload(); }} />}
    </OperatorShell>
  );
}
