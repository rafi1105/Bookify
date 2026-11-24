import { useCallback, useEffect, useState } from 'react';
import { Bus, MapPin, TriangleAlert } from 'lucide-react';
import { Alert, Badge, Button, EmptyState, ErrorState, Field, Modal, Skeleton } from './ui.jsx';
import { api } from '../lib/api.js';
import { COACH_LABEL, formatDateTime, formatDuration, formatTime } from '../lib/format.js';

export const STATE_META = {
  AVAILABLE: { label: 'Available', tone: 'ok' },
  ON_TRIP: { label: 'On trip', tone: 'info' },
  IN_TRAFFIC: { label: 'In traffic', tone: 'warn' },
  ACCIDENT: { label: 'Accident', tone: 'danger' },
  BREAKDOWN: { label: 'Breakdown', tone: 'danger' },
  OFF_DUTY: { label: 'Off duty', tone: '' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
};
const CONDITIONS = [['NORMAL', 'Normal'], ['IN_TRAFFIC', 'In traffic'], ['ACCIDENT', 'Accident'], ['BREAKDOWN', 'Breakdown']];

function UpdateModal({ bus, patchUrl, admin, onDone, onClose }) {
  const [f, setF] = useState({ status: bus.status === 'OFF_DUTY' ? 'OFF_DUTY' : bus.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE', condition: bus.condition, note: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api(patchUrl(bus.id), { method: 'PATCH', body: { status: f.status !== bus.status ? f.status : undefined, condition: f.condition !== bus.condition ? f.condition : undefined, note: f.note } });
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title={`${bus.code} · ${bus.name}`} onClose={onClose}>
      <form className="stack" onSubmit={save}>
        {error && <Alert kind="error">{error}</Alert>}
        <Field label="Availability" id="u-status" hint="Off duty buses cannot be given new trips. A bus with running or upcoming trips cannot go off duty.">
          <select id="u-status" className="select" value={f.status} disabled={bus.status === 'SUSPENDED' && !admin} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="ACTIVE">Available for trips</option><option value="OFF_DUTY">Off duty</option>{admin && <option value="SUSPENDED">Suspended</option>}
          </select>
        </Field>
        <Field label="Live condition" id="u-cond"><select id="u-cond" className="select" value={f.condition} onChange={(e) => setF({ ...f, condition: e.target.value })}>
          {CONDITIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Note" id="u-note" hint="Shown on the playground, e.g. location or cause."><input id="u-note" className="input" maxLength={200} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        <Button type="submit" loading={busy}>Save update</Button>
      </form>
    </Modal>
  );
}

function BusCard({ bus, canEdit, onEdit }) {
  const meta = STATE_META[bus.state] || STATE_META.AVAILABLE;
  const trip = bus.current_trip;
  const alarming = bus.state === 'ACCIDENT' || bus.state === 'BREAKDOWN';
  return (
    <article className={`card fleet-card fleet-${bus.state.toLowerCase()}`}>
      {bus.image_url
        ? <img className="fleet-img" src={bus.image_url} alt={`${bus.name} ${bus.code}`} loading="lazy" referrerPolicy="no-referrer" />
        : <div className="fleet-img fleet-img-empty"><Bus size={28} aria-hidden="true" /></div>}
      <div className="fleet-body stack-s">
        <div className="row-between">
          <code className="code">{bus.code}</code>
          <Badge tone={meta.tone}>{alarming && <TriangleAlert size={12} aria-hidden="true" />}{meta.label}</Badge>
        </div>
        <strong>{bus.name}</strong>
        <div className="muted small">{bus.reg_no} · {COACH_LABEL[bus.bus_type]}{bus.operator ? ` · ${bus.operator}` : ''}</div>
        {trip ? (
          <div className="fleet-trip stack-s">
            <div className="row small"><MapPin size={14} aria-hidden="true" /> {trip.origin} → {trip.destination}</div>
            <progress className="route-progress" max="100" value={trip.progress} aria-label={`Trip progress ${trip.progress}%`} />
            <div className="row-between small muted"><span>Left {formatTime(trip.departure_at)}</span><span>{Math.round(trip.progress)}% of journey time</span><span>Due {formatTime(trip.arrival_at)}</span></div>
            <div className="small muted">Free again at {formatDateTime(trip.arrival_at)}</div>
          </div>
        ) : bus.next_trip ? (
          <div className="small muted">Next: {bus.next_trip.origin} → {bus.next_trip.destination}, {formatDateTime(bus.next_trip.departure_at)}</div>
        ) : <div className="small muted">No trips scheduled</div>}
        {bus.condition !== 'NORMAL' && <div className="small fleet-note">{bus.condition_note || 'No details given'} <span className="muted">· updated {bus.condition_updated_at ? formatDateTime(bus.condition_updated_at) : ''}</span></div>}
        {canEdit && <div><Button size="small" variant="secondary" onClick={() => onEdit(bus)}>Update status</Button></div>}
      </div>
    </article>
  );
}

export default function FleetBoard({ endpoint, patchUrl, admin = false }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(async (quiet) => {
    try {
      setState({ loading: false, error: null, data: await api(endpoint) });
    } catch (error) {
      setState((s) => (quiet && s.data ? s : { loading: false, error, data: null }));
    }
  }, [endpoint]);

  useEffect(() => { load(false); }, [load]);
  // Real-time view: refresh every 15 seconds while the tab is visible.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && load(true), 15000);
    return () => clearInterval(t);
  }, [load]);

  if (state.loading) return <div className="grid-cards">{[0, 1, 2].map((i) => <div key={i} className="card card-pad"><Skeleton lines={5} /></div>)}</div>;
  if (state.error) return <ErrorState error={state.error} onRetry={() => load(false)} />;
  const buses = state.data.buses;
  if (!buses.length) return <EmptyState icon={Bus} title="No buses yet">Add a bus to see it here.</EmptyState>;
  const counts = buses.reduce((m, b) => ({ ...m, [b.state]: (m[b.state] || 0) + 1 }), {});
  const shown = filter === 'ALL' ? buses : buses.filter((b) => b.state === filter);

  return (
    <div className="stack">
      <div className="row" role="tablist" aria-label="Filter by status">
        <button className="chip" aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')}>All {buses.length}</button>
        {Object.entries(STATE_META).filter(([k]) => counts[k]).map(([k, m]) => <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{m.label} {counts[k]}</button>)}
      </div>
      <p className="muted small">Live view, refreshed every 15 seconds. Progress is calculated from each trip&apos;s departure time and journey time; conditions come from updates made by the operator or an administrator.</p>
      <div className="grid-cards fleet-grid">{shown.map((b) => <BusCard key={b.id} bus={b} canEdit onEdit={setEditing} />)}</div>
      {editing && <UpdateModal bus={editing} patchUrl={patchUrl} admin={admin} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(true); }} />}
    </div>
  );
}
