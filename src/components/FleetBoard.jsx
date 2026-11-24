import { useState } from 'react';
import Link from 'next/link';
import { Bus, MapPin, Search, TriangleAlert } from 'lucide-react';
import { Badge, Button, EmptyState, ErrorState, Field, Modal, Skeleton } from './ui.jsx';
import { ConfirmModal, EditBusModal } from './BusActions.jsx';
import RouteTrack from './RouteTrack.jsx';
import { Until } from './Clock.jsx';
import { api } from '../lib/api.js';
import { useLive } from '../lib/useLive.js';
import { reloadSim, useSim } from '../lib/sim.js';
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
  const [delay, setDelay] = useState('60');
  const [f, setF] = useState({ status: bus.status === 'OFF_DUTY' ? 'OFF_DUTY' : bus.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE', condition: bus.condition, note: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api(patchUrl(bus.id), { method: 'PATCH', body: { status: f.status !== bus.status ? f.status : undefined, condition: f.condition !== bus.condition || (f.condition === 'IN_TRAFFIC' && bus.current_trip) ? f.condition : undefined, note: f.note, delayMin: f.condition === 'IN_TRAFFIC' && bus.current_trip ? Number(delay) : undefined } });
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title={bus.name} subtitle={`Bus code ${bus.code}`} size="sm" onClose={onClose} onSubmit={save} submitLabel="Save update" busy={busy} error={error}>
      <div className="stack">
        <Field label="Availability" id="u-status" hint="Off duty buses cannot be given new trips. A bus with running or upcoming trips cannot go off duty.">
          <select id="u-status" className="select" value={f.status} disabled={bus.status === 'SUSPENDED' && !admin} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="ACTIVE">Available for trips</option><option value="OFF_DUTY">Off duty</option>{admin && <option value="SUSPENDED">Suspended</option>}
          </select>
        </Field>
        <Field label="Live condition" id="u-cond"><select id="u-cond" className="select" value={f.condition} onChange={(e) => setF({ ...f, condition: e.target.value })}>
          {CONDITIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        {f.condition === 'IN_TRAFFIC' && bus.current_trip && (
          <Field label="Expected delay" id="u-delay" hint="The bus stops for this long. Its arrival, and the departure of its next trip, move later by the same amount.">
            <select id="u-delay" className="select" value={delay} onChange={(e) => setDelay(e.target.value)}>
              {[['30', '30 minutes'], ['60', '1 hour'], ['90', '1 hour 30 minutes'], ['120', '2 hours'], ['180', '3 hours'], ['240', '4 hours']].map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        )}
        <Field label="Note" id="u-note" hint="Shown on the playground, e.g. location or cause."><input id="u-note" className="input" maxLength={200} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function SimControl({ speed }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function send(body) {
    setBusy(true); setError('');
    try { await api('/api/admin/simulation', { method: 'POST', body }); await reloadSim(); window.location.reload(); } catch (e) { setError(e.message); setBusy(false); }
  }
  return (
    <div className="card card-pad row-between sim-control">
      <div><strong>Simulation clock</strong> <span className="muted small">Fleet movement runs {speed}x real time. Ticketing stays on real time.</span></div>
      <div className="row">
        {[1, 10, 60, 120].map((v) => <button key={v} type="button" className="chip" aria-pressed={speed === v} disabled={busy} onClick={() => send({ speed: v })}>{v}x</button>)}
        <Button size="small" variant="secondary" disabled={busy} onClick={() => send({ speed: 1, reset: true })}>Reset to real time</Button>
      </div>
      {error && <span className="small field-error">{error}</span>}
    </div>
  );
}

function BusCard({ bus, canEdit, onEdit, onDetails, onDelete, detailsHref }) {
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
            <RouteTrack trip={trip} state={bus.state} conditionAt={bus.condition_updated_at} conditionNote={bus.condition_note} />
            <div className="small"><Until at={trip.arrival_at} prefix="Arrives in" doneLabel="arriving" /> <span className="muted">· free again {formatDateTime(trip.arrival_at)}</span></div>
          </div>
        ) : <div className="small muted">{bus.next_trip ? 'Parked' : 'No trips scheduled'}</div>}
        {bus.next_trip && (
          <div className={`small stack-s${bus.next_trip.dep_delay_min > 0 ? ' fleet-note fleet-note-alert' : ''}`}>
            <span className="muted">Next: {bus.next_trip.origin} → {bus.next_trip.destination}, {formatDateTime(bus.next_trip.departure_at)} · <Until at={bus.next_trip.departure_at} prefix="departs in" /></span>
            {bus.next_trip.dep_delay_min > 0 && (
              <strong>Delayed {formatDuration(bus.next_trip.dep_delay_min)} (scheduled {formatTime(bus.next_trip.scheduled_departure_at)}){bus.next_trip.waiting_for_bus ? ': bus not yet arrived from previous trip' : ''}</strong>
            )}
          </div>
        )}
        {bus.condition !== 'NORMAL' && !trip && <div className="small fleet-note">{bus.condition_note || 'No details given'} <span className="muted">· updated {bus.condition_updated_at ? formatDateTime(bus.condition_updated_at) : ''}</span></div>}
        {canEdit && <div className="row"><Link href={detailsHref(bus.id)} className="btn btn-secondary btn-small">Details</Link><Button size="small" variant="secondary" onClick={() => onEdit(bus)}>Update status</Button><Button size="small" variant="ghost" onClick={() => onDetails(bus)}>Edit</Button><Button size="small" variant="ghost" onClick={() => onDelete(bus)}>Delete</Button></div>}
      </div>
    </article>
  );
}

export default function FleetBoard({ endpoint, patchUrl, admin = false }) {
  const sim = useSim();
  const state = useLive(endpoint, { interval: sim.speed > 1 ? 5000 : 60000 });
  const load = (quiet) => (quiet ? state.refresh() : state.reload());
  const [editing, setEditing] = useState(null);
  const [details, setDetails] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');

  if (state.loading) return <div className="grid-cards">{[0, 1, 2].map((i) => <div key={i} className="card card-pad"><Skeleton lines={5} /></div>)}</div>;
  if (state.error) return <ErrorState error={state.error} onRetry={() => load(false)} />;
  const buses = state.data.buses;
  if (!buses.length) return <EmptyState icon={Bus} title="No buses yet">Add a bus to see it here.</EmptyState>;
  const counts = buses.reduce((m, b) => ({ ...m, [b.state]: (m[b.state] || 0) + 1 }), {});
  const q = query.trim().toLowerCase();
  const shown = buses.filter((b) => (filter === 'ALL' || b.state === filter) && (!q || `${b.reg_no} ${b.code} ${b.name} ${b.operator || ''}`.toLowerCase().includes(q)));

  return (
    <div className="stack">
      {admin && <SimControl speed={sim.speed} />}
      <div className="toolbar toolbar-plain">
        <label className="search-box"><Search size={16} aria-hidden="true" /><input type="search" className="table-search-input" placeholder="Search registration, code, name or operator" aria-label="Search buses" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <span className="toolbar-count muted small">{shown.length} of {buses.length} buses</span>
      </div>
      <div className="row" role="tablist" aria-label="Filter by status">
        <button className="chip" aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')}>All {buses.length}</button>
        {Object.entries(STATE_META).filter(([k]) => counts[k]).map(([k, m]) => <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{m.label} {counts[k]}</button>)}
      </div>
      <p className="muted small live-stamp"><span className="live-dot" aria-hidden="true" /> Live view, refreshed every {sim.speed > 1 ? '5 seconds' : 'minute'}{sim.speed > 1 ? ` · simulation ${sim.speed}x: one real second is one minute of bus time` : ''}{state.updatedAt ? ` · last updated ${state.updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}. Trips start and finish by themselves on the simulation clock. Bus positions are estimated from the schedule and reported delays, not GPS. Accidents, breakdowns and traffic come from updates by the operator or an administrator.</p>
      <div className="grid-cards fleet-grid">{shown.map((b) => <BusCard key={b.id} bus={b} canEdit onEdit={setEditing} onDetails={setDetails} onDelete={setRemoving} detailsHref={(id) => `${admin ? '/admin' : '/operator'}/buses/${id}`} />)}</div>
      {details && <EditBusModal bus={details} patchUrl={patchUrl} onClose={() => setDetails(null)} onDone={() => { setDetails(null); load(true); }} />}
      {removing && <ConfirmModal title={`Delete ${removing.code}?`} message={`${removing.name} (${removing.reg_no}) and its unsold trips will be removed. This cannot be undone. A bus with bookings cannot be deleted: set it Off duty instead.`}
        onClose={() => setRemoving(null)} onConfirm={async () => { await api(patchUrl(removing.id), { method: 'DELETE' }); setRemoving(null); load(true); }} />}
      {editing && <UpdateModal bus={editing} patchUrl={patchUrl} admin={admin} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(true); }} />}
    </div>
  );
}
