import { useMemo, useState } from 'react';
import { Route as RouteIcon } from 'lucide-react';
import DataTable from '../../src/components/DataTable.jsx';
import { ConfirmModal } from '../../src/components/BusActions.jsx';
import OperatorShell from '../../src/components/OperatorShell.jsx';
import { Badge, Button, EmptyState, ErrorState, Field, Modal, ModalSection, Skeleton } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { COACH_LABEL, COACH_OPTIONS, formatBDT, formatDuration } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';

const TONE = { PENDING: 'warn', APPROVED: 'ok', REJECTED: 'danger', REVOKED: 'danger' };
const lines = (v) => v.split('\n').map((x) => x.trim()).filter(Boolean);

function Request({ existing, onDone, onClose }) {
  const [f, setF] = useState(existing ? {
    origin: existing.origin, destination: existing.destination, busType: existing.bus_type, fare: String(existing.proposed_fare),
    hours: String(Math.floor(existing.proposed_duration_min / 60)), minutes: String(existing.proposed_duration_min % 60),
    boarding: existing.boarding_points.join('\n'), dropping: existing.dropping_points.join('\n'),
  } : { origin: '', destination: '', busType: 'AC_ECONOMY', fare: '', hours: '', minutes: '0', boarding: '', dropping: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const duration = Number(f.hours || 0) * 60 + Number(f.minutes || 0);

  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api(existing ? `/api/operator/routes/${existing.id}` : '/api/operator/routes', { method: existing ? 'PATCH' : 'POST', body: { origin: f.origin, destination: f.destination, busType: f.busType, fare: Number(f.fare), durationMin: duration, boardingPoints: lines(f.boarding), droppingPoints: lines(f.dropping) } });
      onDone();
    } catch (err) { setError(err.status === 409 ? 'You already have an open request for this route and class.' : err.message); setBusy(false); }
  }

  return (
    <Modal title={existing ? 'Edit route request' : 'Request a route'} subtitle="An administrator reviews your price and journey time and may adjust them before approving." size="lg" onClose={onClose} onSubmit={save} submitLabel={existing ? 'Save changes' : 'Send request'} busy={busy} submitDisabled={duration < 15} error={error}>
      <div className="modal-sections">
        <ModalSection title="Route">
        <div className="form-grid">
          <Field label="Start point (city)" id="r-from"><input id="r-from" required className="input" placeholder="Dhaka" value={f.origin} onChange={set('origin')} /></Field>
          <Field label="Destination (city)" id="r-to"><input id="r-to" required className="input" placeholder="Bogura" value={f.destination} onChange={set('destination')} /></Field>
          <Field label="Bus class" id="r-type"><select id="r-type" className="select" value={f.busType} onChange={set('busType')}>{COACH_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          </div></ModalSection>
        <ModalSection title="Fare and journey time">
        <div className="form-grid">
          <Field label="Fare per seat (BDT)" id="r-fare"><input id="r-fare" type="number" min="50" required className="input" value={f.fare} onChange={set('fare')} /></Field>
          <Field label="Journey time: hours" id="r-h"><input id="r-h" type="number" min="0" max="24" required className="input" value={f.hours} onChange={set('hours')} /></Field>
          <Field label="minutes" id="r-m" hint={duration ? `Total ${formatDuration(duration)}. The bus is free again when this time is over.` : undefined}><input id="r-m" type="number" min="0" max="59" className="input" value={f.minutes} onChange={set('minutes')} /></Field>
        </div></ModalSection>
        <ModalSection title="Stops" hint="One per line.">
        <div className="form-grid">
        <Field label="Boarding points (one per line)" id="r-b"><textarea id="r-b" required className="textarea" placeholder={'Gabtoli\nSayedabad'} value={f.boarding} onChange={set('boarding')} /></Field>
        <Field label="Dropping points (one per line)" id="r-d"><textarea id="r-d" required className="textarea" placeholder="Bogura bus terminal" value={f.dropping} onChange={set('dropping')} /></Field>
        </div></ModalSection>
      </div>
    </Modal>
  );
}

export default function OperatorRoutes() {
  const { loading, error, data, reload } = useApi('/api/operator/routes');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const columns = useMemo(() => [
    { key: 'route', label: 'Route', sort: (p) => `${p.origin} ${p.destination}`, render: (p) => <><strong>{p.origin} → {p.destination}</strong><div className="muted small">Board: {p.boarding_points.join(', ')} · Drop: {p.dropping_points.join(', ')}</div></> },
    { key: 'class', label: 'Class', sort: (p) => p.bus_type, render: (p) => COACH_LABEL[p.bus_type] },
    { key: 'proposed', label: 'You proposed', sort: (p) => p.proposed_fare, render: (p) => <>{formatBDT(p.proposed_fare)}<div className="muted small">{formatDuration(p.proposed_duration_min)}</div></> },
    { key: 'approved', label: 'Approved', sort: (p) => p.approved_fare, render: (p) => p.approved_fare ? <>{formatBDT(p.approved_fare)}<div className="muted small">{formatDuration(p.approved_duration_min)}</div></> : '—' },
    { key: 'status', label: 'Status', sort: (p) => p.status, render: (p) => <><Badge tone={TONE[p.status]}>{p.status}</Badge>{p.note && <div className="muted small">{p.note}</div>}</> },
    { key: 'actions', label: '', align: 'right', className: 'nowrap', render: (p) => <>{p.status === 'PENDING' && <Button variant="ghost" size="small" onClick={() => setEditing(p)}>Edit</Button>}<Button variant="ghost" size="small" onClick={() => setRemoving(p)}>Delete</Button></> },
  ], []);
  const filters = useMemo(() => [
    { key: 'status', label: 'Status', options: Object.keys(TONE).map((k) => [k, k[0] + k.slice(1).toLowerCase()]), match: (p, v) => p.status === v },
    { key: 'class', label: 'Class', options: COACH_OPTIONS, match: (p, v) => p.bus_type === v },
  ], []);
  return (
    <OperatorShell title="Routes and fares" subtitle="Propose any route with your price and journey time. The admin approves it, and may change the price or time." actions={<Button onClick={() => setOpen(true)}>Request a route</Button>}>
      {loading ? <Skeleton lines={5} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <DataTable rows={data.permissions} columns={columns} filters={filters} initialSort={{ key: 'route', dir: 'asc' }}
          searchPlaceholder="Search city, boarding or dropping point"
          searchText={(p) => `${p.origin} ${p.destination} ${p.boarding_points.join(' ')} ${p.dropping_points.join(' ')}`}
          empty={<EmptyState icon={RouteIcon} title="No route requests yet" action={<Button onClick={() => setOpen(true)}>Request your first route</Button>}>Request a route such as Dhaka to Bogura for Non-AC, AC or Sleeper coaches.</EmptyState>} />
      )}
      {editing && <Request existing={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
      {removing && <ConfirmModal title="Delete this route request?" message={`${removing.origin} → ${removing.destination} (${COACH_LABEL[removing.bus_type]}) and any unsold trips on it will be removed. A route with bookings cannot be deleted.`}
        onClose={() => setRemoving(null)} onConfirm={async () => { await api(`/api/operator/routes/${removing.id}`, { method: 'DELETE' }); setRemoving(null); reload(); }} />}
      {open && <Request onClose={() => setOpen(false)} onDone={() => { setOpen(false); reload(); }} />}
    </OperatorShell>
  );
}
