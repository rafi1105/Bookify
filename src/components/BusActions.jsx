import { useState } from 'react';
import { Field, Modal } from './ui.jsx';
import { api } from '../lib/api.js';

const AMENITIES = ['Wi-Fi', 'Charging port', 'Water bottle', 'Blanket', 'Snacks', 'TV', 'Toilet', 'Reclining seats'];

// Generic confirmation dialog for destructive actions. The server refuses unsafe deletes with a clear message.
export function ConfirmModal({ title, message, confirm = 'Delete', onConfirm, onClose, children }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function go(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await onConfirm(); } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title={title} size="sm" onClose={onClose} onSubmit={go} submitLabel={confirm} submitTone="danger" busy={busy} error={error}>
      <p>{message}</p>
      {children}
    </Modal>
  );
}

// Edit the details of a bus. Model and amenities appear only when the caller has them.
export function EditBusModal({ bus, patchUrl, onDone, onClose }) {
  const hasExtras = bus.model_no !== undefined;
  const [f, setF] = useState({ name: bus.name || '', regNo: bus.reg_no || '', modelNo: bus.model_no || '', imageUrl: bus.image_url || '', amenities: bus.amenities || [] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { const v = e.target.value; setF((p) => ({ ...p, [k]: v })); };
  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    const body = { name: f.name, regNo: f.regNo, imageUrl: f.imageUrl };
    if (hasExtras) { body.modelNo = f.modelNo; body.amenities = f.amenities; }
    try { await api(patchUrl(bus.id), { method: 'PATCH', body }); onDone(); } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title="Edit bus" subtitle={`Bus code ${bus.code}. Class and seat layout cannot change: delete and re-add the bus for that.`} size="md" onClose={onClose} onSubmit={save} submitLabel="Save changes" busy={busy} error={error}>
      <div className="form-grid">
        <Field label="Coach name" id="e-name"><input id="e-name" required className="input" value={f.name} onChange={set('name')} autoComplete="off" /></Field>
        <Field label="Registration number" id="e-reg"><input id="e-reg" required className="input" value={f.regNo} onChange={set('regNo')} autoComplete="off" /></Field>
        {hasExtras && <Field label="Model" id="e-model"><input id="e-model" required className="input" value={f.modelNo} onChange={set('modelNo')} autoComplete="off" /></Field>}
        <Field label="Image URL" id="e-img" hint="Leave empty for no photo."><input id="e-img" type="url" className="input" placeholder="https://" value={f.imageUrl} onChange={set('imageUrl')} autoComplete="off" /></Field>
      </div>
      {hasExtras && (
        <div className="stack-s"><span className="field-label">Amenities</span>
          <div className="row">{AMENITIES.map((a) => (
            <button type="button" key={a} className="chip" aria-pressed={f.amenities.includes(a)} onClick={() => setF((p) => ({ ...p, amenities: p.amenities.includes(a) ? p.amenities.filter((x) => x !== a) : [...p.amenities, a] }))}>{a}</button>
          ))}</div>
        </div>
      )}
    </Modal>
  );
}
