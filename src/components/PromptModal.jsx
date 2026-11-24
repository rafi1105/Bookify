import { useState } from 'react';
import { Field, Modal } from './ui.jsx';

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
    <Modal title={title} size="sm" onClose={onClose} onSubmit={go} submitLabel={confirm} submitTone={tone} busy={busy} submitDisabled={String(value).trim().length < min} error={error}>
      <div className="stack">
        {children}
        <Field label={label} id="prompt-value">
          {type === 'textarea' ? <textarea id="prompt-value" className="textarea" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
            : <input id="prompt-value" className="input" type={type} value={value} onChange={(e) => setValue(e.target.value)} autoFocus />}
        </Field>
      </div>
    </Modal>
  );
}
