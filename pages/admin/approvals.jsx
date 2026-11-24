import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import AdminShell from '../../src/components/AdminShell.jsx';
import PromptModal from '../../src/components/PromptModal.jsx';
import { Alert, Badge, Button, EmptyState, ErrorState, Field, Modal, Skeleton } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { COACH_LABEL, formatBDT, formatDuration } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';

const TABS = ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'];

function Approve({ p, onDone, onClose }) {
  const [fare, setFare] = useState(String(p.proposed_fare));
  const [hours, setHours] = useState(String(Math.floor(p.proposed_duration_min / 60)));
  const [minutes, setMinutes] = useState(String(p.proposed_duration_min % 60));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const duration = Number(hours || 0) * 60 + Number(minutes || 0);
  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api(`/api/admin/permissions/${p.id}`, { method: 'PATCH', body: { action: 'approve', fare: Number(fare), durationMin: duration } }); onDone(); } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title={`Approve ${p.origin} → ${p.destination}`} onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <p className="muted small">{p.vendors.company_name} proposed {formatBDT(p.proposed_fare)} and {formatDuration(p.proposed_duration_min)} for {COACH_LABEL[p.bus_type]}. You can change either before approving.</p>
        {error && <Alert kind="error">{error}</Alert>}
        <Field label="Approved maximum fare per seat (BDT)" id="a-fare"><input id="a-fare" type="number" min="50" className="input" value={fare} onChange={(e) => setFare(e.target.value)} /></Field>
        <div className="form-grid">
          <Field label="Journey time: hours" id="a-h"><input id="a-h" type="number" min="0" max="24" className="input" value={hours} onChange={(e) => setHours(e.target.value)} /></Field>
          <Field label="minutes" id="a-m" hint={duration ? `Total ${formatDuration(duration)}` : undefined}><input id="a-m" type="number" min="0" max="59" className="input" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
        </div>
        <Button type="submit" loading={busy} disabled={duration < 15 || !fare}>Approve</Button>
      </form>
    </Modal>
  );
}

export default function Approvals() {
  const [status, setStatus] = useState('PENDING');
  const { loading, error, data, reload } = useApi(`/api/admin/permissions?status=${status}`);
  const [prompt, setPrompt] = useState(null);
  const send = async (id, body) => { await api(`/api/admin/permissions/${id}`, { method: 'PATCH', body }); setPrompt(null); reload(); };
  return (
    <AdminShell title="Route approvals" subtitle="Operators propose routes with a price and journey time. Approve them as proposed or change the price and time.">
      <div className="tabs" role="tablist">{TABS.map((s) => <button key={s} role="tab" className="tab" aria-selected={status === s} onClick={() => setStatus(s)}>{s[0] + s.slice(1).toLowerCase()}</button>)}</div>
      {loading ? <Skeleton lines={5} /> : error ? <ErrorState error={error} onRetry={reload} />
        : !data.permissions.length ? <EmptyState icon={ClipboardCheck} title={`No ${status.toLowerCase()} requests`} /> : (
          <div className="card table-wrap"><table className="table">
            <thead><tr><th>Operator</th><th>Route</th><th>Class</th><th>Proposed</th><th>Approved</th><th /></tr></thead>
            <tbody>{data.permissions.map((p) => (
              <tr key={p.id}><td><strong>{p.vendors.company_name}</strong></td>
                <td>{p.origin} → {p.destination}<div className="muted small">Board: {p.boarding_points.join(', ')} · Drop: {p.dropping_points.join(', ')}</div></td>
                <td>{COACH_LABEL[p.bus_type]}</td><td>{formatBDT(p.proposed_fare)}<div className="muted small">{formatDuration(p.proposed_duration_min)}</div></td>
                <td>{p.approved_fare ? <><Badge tone="ok">{formatBDT(p.approved_fare)}</Badge><div className="muted small">{formatDuration(p.approved_duration_min)}</div></> : '—'}</td>
                <td className="right nowrap">
                  {p.status === 'PENDING' && <><Button size="small" onClick={() => setPrompt({ kind: 'approve', p })}>Review</Button><Button size="small" variant="ghost" onClick={() => setPrompt({ kind: 'reject', p })}>Reject</Button></>}
                  {p.status === 'APPROVED' && <Button size="small" variant="ghost" onClick={() => setPrompt({ kind: 'revoke', p })}>Revoke</Button>}
                </td></tr>
            ))}</tbody></table></div>
        )}
      {prompt?.kind === 'approve' && <Approve p={prompt.p} onClose={() => setPrompt(null)} onDone={() => { setPrompt(null); reload(); }} />}
      {(prompt?.kind === 'reject' || prompt?.kind === 'revoke') && <PromptModal title={prompt.kind === 'reject' ? 'Reject request' : 'Revoke approval'} label="Note for the operator" type="textarea" min={5} confirm={prompt.kind === 'reject' ? 'Reject' : 'Revoke'} tone="danger" onClose={() => setPrompt(null)} onSubmit={(v) => send(prompt.p.id, { action: prompt.kind, note: v })} />}
    </AdminShell>
  );
}
