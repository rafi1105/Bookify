import { useMemo, useState } from 'react';
import OperatorShell from '../../src/components/OperatorShell.jsx';
import SeatMap from '../../src/components/SeatMap.jsx';
import { Alert, Badge, Button, EmptyState, ErrorState, Field, Modal, Skeleton } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { buildLayout, PATTERNS } from '../../src/lib/layout.js';
import { COACH_LABEL, COACH_OPTIONS } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';
import { Bus } from 'lucide-react';

const AMENITIES = ['Wi-Fi', 'Charging port', 'Water bottle', 'Blanket', 'Snacks', 'TV', 'Toilet', 'Reclining seats'];

function AddBus({ onDone, onClose }) {
  const [f, setF] = useState({ name: '', regNo: '', modelNo: '', busType: 'AC_ECONOMY', pattern: '2+2', rows: 10, kind: 'SEAT', decks: 1, amenities: [], imageUrl: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => { try { return buildLayout({ ...f, rows: Number(f.rows), decks: Number(f.decks) }); } catch (e) { return { error: e.message }; } }, [f]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/operator/buses', { method: 'POST', body: { ...f, rows: Number(f.rows), decks: Number(f.decks) } });
      onDone();
    } catch (e) { setError(e.message); setBusy(false); }
  }

  return (
    <Modal title="Add a bus" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="form-grid">
          <Field label="Coach name" id="b-name"><input id="b-name" required className="input" value={f.name} onChange={set('name')} /></Field>
          <Field label="Registration number" id="b-reg"><input id="b-reg" required className="input" value={f.regNo} onChange={set('regNo')} /></Field>
          <Field label="Image URL" id="b-img" hint="A link to a photo of the bus (https://…)"><input id="b-img" type="url" className="input" placeholder="https://" value={f.imageUrl} onChange={set('imageUrl')} /></Field>
          <Field label="Model" id="b-model"><input id="b-model" required className="input" value={f.modelNo} onChange={set('modelNo')} /></Field>
          <Field label="Coach class" id="b-type">
            <select id="b-type" className="select" value={f.busType} onChange={(e) => setF({ ...f, busType: e.target.value, kind: e.target.value === 'SLEEPER_AC' ? 'BERTH' : 'SEAT', pattern: e.target.value === 'SLEEPER_AC' ? '2+1' : f.pattern })}>{COACH_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </Field>
          <Field label="Seat type" id="b-kind"><select id="b-kind" className="select" value={f.kind} onChange={set('kind')}><option value="SEAT">Seats</option><option value="BERTH">Sleeper berths</option></select></Field>
          <Field label="Seats per row" id="b-pattern"><select id="b-pattern" className="select" value={f.pattern} onChange={set('pattern')}>{Object.keys(PATTERNS).map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Rows" id="b-rows"><input id="b-rows" className="input" type="number" min="2" max="20" value={f.rows} onChange={set('rows')} /></Field>
          <Field label="Decks" id="b-decks"><select id="b-decks" className="select" value={f.decks} onChange={set('decks')}><option value="1">Single</option><option value="2">Double</option></select></Field>
        </div>
        <div className="stack-s"><span className="field-label">Amenities</span>
          <div className="row">{AMENITIES.map((a) => (
            <button type="button" key={a} className="chip" aria-pressed={f.amenities.includes(a)} onClick={() => setF({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a] })}>{a}</button>
          ))}</div>
        </div>
        {preview.error ? <Alert kind="error">{preview.error}</Alert> : (
          <div className="stack-s"><span className="field-label">Layout preview · {preview.seatCount} seats</span><SeatMap layout={preview.layout} readOnly /></div>
        )}
        <Button type="submit" loading={busy} disabled={Boolean(preview.error)}>Save bus</Button>
      </form>
    </Modal>
  );
}

export default function Buses() {
  const { loading, error, data, reload } = useApi('/api/operator/buses');
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState(null);
  return (
    <OperatorShell title="Buses" subtitle="Your fleet and seat layouts." actions={<Button onClick={() => setAdding(true)}>Add bus</Button>}>
      {loading ? <Skeleton lines={5} /> : error ? <ErrorState error={error} onRetry={reload} />
        : !data.buses.length ? <EmptyState icon={Bus} title="No buses yet" action={<Button onClick={() => setAdding(true)}>Add your first bus</Button>}>Add a bus with its real seat layout. It gets a unique code automatically.</EmptyState> : (
          <div className="card table-wrap"><table className="table">
            <thead><tr><th>Code</th><th>Coach</th><th>Registration</th><th>Class</th><th>Seats</th><th>Status</th><th /></tr></thead>
            <tbody>{data.buses.map((b) => (
              <tr key={b.id}><td><code className="code">{b.code}</code></td><td><div className="row">{b.image_url && <img className="bus-thumb" src={b.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" />}<span><strong>{b.name}</strong><div className="muted small">{b.model_no}</div></span></div></td><td>{b.reg_no}</td><td>{COACH_LABEL[b.bus_type]}</td><td>{b.capacity}</td>
                <td><Badge tone={b.status === 'ACTIVE' ? 'ok' : 'danger'}>{b.status === 'ACTIVE' ? 'Available' : b.status === 'OFF_DUTY' ? 'Off duty' : b.status}</Badge></td><td className="right"><Button variant="ghost" size="small" onClick={() => setView(b)}>Layout</Button></td></tr>
            ))}</tbody></table></div>
        )}
      {adding && <AddBus onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload(); }} />}
      {view && <Modal title={`${view.name} layout`} onClose={() => setView(null)}><SeatMap layout={view.layout} readOnly /></Modal>}
    </OperatorShell>
  );
}
