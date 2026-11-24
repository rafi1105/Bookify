import { useState } from 'react';
import { Alert, Button, Field, Modal } from './ui.jsx';

// Ask for a short text (reason, reference, fare) then run an async action.
export default function PromptModal({ title, label, type = 'text', initial = '', min = 3, confirm, tone = 'primary', onSubmit, onClose, children }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try { await onSubmit(value); } catch (e) { setError(e.message); setBusy(false); }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <form className="stack" onSubmit={go}>
        {children}
        <Field label={label} id="prompt-value">
          {type === 'textarea' ? <textarea id="prompt-value" className="textarea" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
            : <input id="prompt-value" className="input" type={type} value={value} onChange={(e) => setValue(e.target.value)} autoFocus />}
        </Field>
        {error && <Alert kind="error">{error}</Alert>}
        <Button type="submit" variant={tone} loading={busy} disabled={String(value).trim().length < min}>{confirm}</Button>
      </form>
    </Modal>
  );
}
