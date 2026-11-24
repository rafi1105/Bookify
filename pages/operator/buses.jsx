import { useMemo, useState } from 'react';
import OperatorShell from '../../src/components/OperatorShell.jsx';
import SeatMap from '../../src/components/SeatMap.jsx';
import BusList from '../../src/components/BusList.jsx';
import { Alert, Button, ErrorState, Field, Modal, ModalSection, Skeleton } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { buildLayout, PATTERNS } from '../../src/lib/layout.js';
import { COACH_OPTIONS } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';

const AMENITIES = ['Wi-Fi', 'Charging port', 'Water bottle', 'Blanket', 'Snacks', 'TV', 'Toilet', 'Reclining seats'];

function AddBus({ onDone, onClose }) {
  const [f, setF] = useState({ name: '', regNo: '', modelNo: '', busType: 'AC_ECONOMY', pattern: '2+2', rows: 10, kind: 'SEAT', decks: 1, amenities: [], imageUrl: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => { try { return buildLayout({ ...f, rows: Number(f.rows), decks: Number(f.decks) }); } catch (e) { return { error: e.message }; } }, [f]);
  const set = (k) => (e) => { const v = e.target.value; setF((prev) => ({ ...prev, [k]: v })); };

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
    <Modal title="Add a bus" subtitle="A unique bus code is generated automatically." size="lg" onClose={onClose} onSubmit={save} submitLabel="Save bus" busy={busy} submitDisabled={Boolean(preview.error)} error={error}>
      <div className="modal-sections">
        <ModalSection title="Identity">
          <div className="form-grid">
            <Field label="Coach name" id="b-name"><input id="b-name" required className="input" value={f.name} onChange={set('name')} autoComplete="off" /></Field>
            <Field label="Registration number" id="b-reg"><input id="b-reg" required className="input" value={f.regNo} onChange={set('regNo')} autoComplete="off" /></Field>
            <Field label="Model" id="b-model"><input id="b-model" required className="input" value={f.modelNo} onChange={set('modelNo')} autoComplete="off" /></Field>
            <Field label="Image URL" id="b-img" hint="Optional. A link to a photo of the bus (https://…)"><input id="b-img" type="url" className="input" placeholder="https://" value={f.imageUrl} onChange={set('imageUrl')} autoComplete="off" /></Field>
          </div>
        </ModalSection>
        <ModalSection title="Class and seat layout">
          <div className="form-grid">
            <Field label="Coach class" id="b-type">
              <select id="b-type" className="select" value={f.busType} onChange={(e) => { const v = e.target.value; setF((prev) => ({ ...prev, busType: v, kind: v === 'SLEEPER_AC' ? 'BERTH' : 'SEAT', pattern: v === 'SLEEPER_AC' ? '2+1' : prev.pattern })); }}>{COACH_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </Field>
            <Field label="Seat type" id="b-kind"><select id="b-kind" className="select" value={f.kind} onChange={set('kind')}><option value="SEAT">Seats</option><option value="BERTH">Sleeper berths</option></select></Field>
            <Field label="Seats per row" id="b-pattern"><select id="b-pattern" className="select" value={f.pattern} onChange={set('pattern')}>{Object.keys(PATTERNS).map((p) => <option key={p}>{p}</option>)}</select></Field>
            <Field label="Rows" id="b-rows"><input id="b-rows" className="input" type="number" min="2" max="20" value={f.rows} onChange={set('rows')} /></Field>
            <Field label="Decks" id="b-decks"><select id="b-decks" className="select" value={f.decks} onChange={set('decks')}><option value="1">Single</option><option value="2">Double</option></select></Field>
          </div>
        </ModalSection>
        <ModalSection title="Amenities">
          <div className="row">{AMENITIES.map((a) => (
            <button type="button" key={a} className="chip" aria-pressed={f.amenities.includes(a)} onClick={() => setF((prev) => ({ ...prev, amenities: prev.amenities.includes(a) ? prev.amenities.filter((x) => x !== a) : [...prev.amenities, a] }))}>{a}</button>
          ))}</div>
        </ModalSection>
        <ModalSection title={preview.error ? 'Layout preview' : `Layout preview · ${preview.seatCount} seats`}>
          {preview.error ? <Alert kind="error">{preview.error}</Alert> : <SeatMap layout={preview.layout} readOnly />}
        </ModalSection>
      </div>
    </Modal>
  );
}

const detailHref = (id) => `/operator/buses/${id}`;
const patchUrl = (id) => `/api/operator/buses/${id}`;

export default function Buses() {
  const { loading, error, data, reload } = useApi('/api/operator/buses');
  const [adding, setAdding] = useState(false);
  return (
    <OperatorShell title="Buses" subtitle="Your fleet. Search by registration number, then open a bus for its details, position and history." actions={<Button onClick={() => setAdding(true)}>Add bus</Button>}>
      {loading ? <Skeleton lines={5} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <BusList buses={data.buses} detailHref={detailHref} patchUrl={patchUrl} onChange={reload} onAdd={() => setAdding(true)} />
      )}
      {adding && <AddBus onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload(); }} />}
    </OperatorShell>
  );
}
