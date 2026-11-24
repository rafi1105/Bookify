import { useState } from 'react';
import { Route as RouteIcon } from 'lucide-react';
import OperatorShell from '../../src/components/OperatorShell.jsx';
import { Alert, Badge, Button, EmptyState, ErrorState, Field, Modal, Skeleton } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { COACH_LABEL, COACH_OPTIONS, formatBDT, formatDuration } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';

const TONE = { PENDING: 'warn', APPROVED: 'ok', REJECTED: 'danger', REVOKED: 'danger' };
const lines = (v) => v.split('\n').map((x) => x.trim()).filter(Boolean);

function Request({ onDone, onClose }) {
  const [f, setF] = useState({ origin: '', destination: '', busType: 'AC_ECONOMY', fare: '', hours: '', minutes: '0', boarding: '', dropping: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const duration = Number(f.hours || 0) * 60 + Number(f.minutes || 0);

  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api('/api/operator/routes', { method: 'POST', body: { origin: f.origin, destination: f.destination, busType: f.busType, fare: Number(f.fare), durationMin: duration, boardingPoints: lines(f.boarding), droppingPoints: lines(f.dropping) } });
      onDone();
    } catch (err) { setError(err.status === 409 ? 'You already have an open request for this route and class.' : err.message); setBusy(false); }
  }

  return (
    <Modal title="Request a route" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="form-grid">
          <Field label="Start point (city)" id="r-from"><input id="r-from" required className="input" placeholder="Dhaka" value={f.origin} onChange={set('origin')} /></Field>
          <Field label="Destination (city)" id="r-to"><input id="r-to" required className="input" placeholder="Bogura" value={f.destination} onChange={set('destination')} /></Field>
          <Field label="Bus class" id="r-type"><select id="r-type" className="select" value={f.busType} onChange={set('busType')}>{COACH_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Fare per seat (BDT)" id="r-fare"><input id="r-fare" type="number" min="50" required className="input" value={f.fare} onChange={set('fare')} /></Field>
          <Field label="Journey time: hours" id="r-h"><input id="r-h" type="number" min="0" max="24" required className="input" value={f.hours} onChange={set('hours')} /></Field>
          <Field label="minutes" id="r-m" hint={duration ? `Total ${formatDuration(duration)}. The bus is free again when this time is over.` : undefined}><input id="r-m" type="number" min="0" max="59" className="input" value={f.minutes} onChange={set('minutes')} /></Field>
        </div>
        <Field label="Boarding points (one per line)" id="r-b"><textarea id="r-b" required className="textarea" placeholder={'Gabtoli\nSayedabad'} value={f.boarding} onChange={set('boarding')} /></Field>
        <Field label="Dropping points (one per line)" id="r-d"><textarea id="r-d" required className="textarea" placeholder="Bogura bus terminal" value={f.dropping} onChange={set('dropping')} /></Field>
        <p className="muted small">An administrator reviews your price and journey time and may adjust them before approving.</p>
        <Button type="submit" loading={busy} disabled={duration < 15}>Send request</Button>
      </form>
    </Modal>
  );
}

export default function OperatorRoutes() {
  const { loading, error, data, reload } = useApi('/api/operator/routes');
  const [open, setOpen] = useState(false);
  return (
    <OperatorShell title="Routes and fares" subtitle="Propose any route with your price and journey time. The admin approves it, and may change the price or time." actions={<Button onClick={() => setOpen(true)}>Request a route</Button>}>
      {loading ? <Skeleton lines={5} /> : error ? <ErrorState error={error} onRetry={reload} />
        : !data.permissions.length ? <EmptyState icon={RouteIcon} title="No route requests yet" action={<Button onClick={() => setOpen(true)}>Request your first route</Button>}>Request a route such as Dhaka to Bogura for Non-AC, AC or Sleeper coaches.</EmptyState> : (
          <div className="card table-wrap"><table className="table">
            <thead><tr><th>Route</th><th>Class</th><th>You proposed</th><th>Approved</th><th>Status</th></tr></thead>
            <tbody>{data.permissions.map((p) => (
              <tr key={p.id}><td><strong>{p.origin} → {p.destination}</strong><div className="muted small">Board: {p.boarding_points.join(', ')} · Drop: {p.dropping_points.join(', ')}</div></td>
                <td>{COACH_LABEL[p.bus_type]}</td>
                <td>{formatBDT(p.proposed_fare)}<div className="muted small">{formatDuration(p.proposed_duration_min)}</div></td>
                <td>{p.approved_fare ? <>{formatBDT(p.approved_fare)}<div className="muted small">{formatDuration(p.approved_duration_min)}</div></> : '—'}</td>
                <td><Badge tone={TONE[p.status]}>{p.status}</Badge>{p.note && <div className="muted small">{p.note}</div>}</td></tr>
            ))}</tbody></table></div>
        )}
      {open && <Request onClose={() => setOpen(false)} onDone={() => { setOpen(false); reload(); }} />}
    </OperatorShell>
  );
}
