import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import AdminShell from '../../src/components/AdminShell.jsx';
import DataTable from '../../src/components/DataTable.jsx';
import { ConfirmModal } from '../../src/components/BusActions.jsx';
import PromptModal from '../../src/components/PromptModal.jsx';
import { Badge, Button, EmptyState, ErrorState, Field, Modal, Skeleton } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { COACH_LABEL, formatBDT, formatDuration } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';

const TABS = ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'];

function Approve({ p, onDone, onClose, editing = false }) {
  const startFare = editing ? p.approved_fare : p.proposed_fare;
  const startMin = editing ? p.approved_duration_min : p.proposed_duration_min;
  const [fare, setFare] = useState(String(startFare));
  const [hours, setHours] = useState(String(Math.floor(startMin / 60)));
  const [minutes, setMinutes] = useState(String(startMin % 60));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const duration = Number(hours || 0) * 60 + Number(minutes || 0);
  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api(`/api/admin/permissions/${p.id}`, { method: 'PATCH', body: { action: editing ? 'update' : 'approve', fare: Number(fare), durationMin: duration } }); onDone(); } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title={`${editing ? 'Edit' : 'Approve'} ${p.origin} → ${p.destination}`} size="sm" onClose={onClose} onSubmit={save} submitLabel={editing ? 'Save changes' : 'Approve'} busy={busy} submitDisabled={duration < 15 || !fare} error={error}>
      <div className="stack">
        <p className="muted small">{p.vendors.company_name} proposed {formatBDT(p.proposed_fare)} and {formatDuration(p.proposed_duration_min)} for {COACH_LABEL[p.bus_type]}. You can change either before approving.</p>
        <Field label="Approved maximum fare per seat (BDT)" id="a-fare"><input id="a-fare" type="number" min="50" className="input" value={fare} onChange={(e) => setFare(e.target.value)} /></Field>
        <div className="form-grid">
          <Field label="Journey time: hours" id="a-h"><input id="a-h" type="number" min="0" max="24" className="input" value={hours} onChange={(e) => setHours(e.target.value)} /></Field>
          <Field label="minutes" id="a-m" hint={duration ? `Total ${formatDuration(duration)}` : undefined}><input id="a-m" type="number" min="0" max="59" className="input" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

export default function Approvals() {
  const [status, setStatus] = useState('PENDING');
  const { loading, error, data, reload } = useApi(`/api/admin/permissions?status=${status}`);
  const [prompt, setPrompt] = useState(null);
  const columns = [
    { key: 'operator', label: 'Operator', sort: (p) => p.vendors.company_name, render: (p) => <strong>{p.vendors.company_name}</strong> },
    { key: 'route', label: 'Route', sort: (p) => `${p.origin} ${p.destination}`, render: (p) => <>{p.origin} → {p.destination}<div className="muted small">Board: {p.boarding_points.join(', ')} · Drop: {p.dropping_points.join(', ')}</div></> },
    { key: 'class', label: 'Class', sort: (p) => p.bus_type, render: (p) => COACH_LABEL[p.bus_type] },
    { key: 'proposed', label: 'Proposed', sort: (p) => p.proposed_fare, render: (p) => <>{formatBDT(p.proposed_fare)}<div className="muted small">{formatDuration(p.proposed_duration_min)}</div></> },
    { key: 'approved', label: 'Approved', sort: (p) => p.approved_fare, render: (p) => p.approved_fare ? <><Badge tone="ok">{formatBDT(p.approved_fare)}</Badge><div className="muted small">{formatDuration(p.approved_duration_min)}</div></> : '—' },
    { key: 'actions', label: '', align: 'right', className: 'nowrap', render: (p) => (
      <>
        {p.status === 'PENDING' && <><Button size="small" onClick={() => setPrompt({ kind: 'approve', p })}>Review</Button><Button size="small" variant="ghost" onClick={() => setPrompt({ kind: 'reject', p })}>Reject</Button></>}
        {p.status === 'APPROVED' && <Button size="small" variant="secondary" onClick={() => setPrompt({ kind: 'edit', p })}>Edit</Button>}
        {p.status === 'APPROVED' && <Button size="small" variant="ghost" onClick={() => setPrompt({ kind: 'revoke', p })}>Revoke</Button>}
        <Button size="small" variant="ghost" onClick={() => setPrompt({ kind: 'delete', p })}>Delete</Button>
      </>
    ) },
  ];
  const filters = (rows) => [
    { key: 'operator', label: 'Operator', options: [...new Set(rows.map((p) => p.vendors.company_name))].sort().map((o) => [o, o]), match: (p, v) => p.vendors.company_name === v },
    { key: 'class', label: 'Class', options: Object.entries(COACH_LABEL), match: (p, v) => p.bus_type === v },
  ];
  const send = async (id, body) => { await api(`/api/admin/permissions/${id}`, { method: 'PATCH', body }); setPrompt(null); reload(); };
  return (
    <AdminShell title="Route approvals" subtitle="Operators propose routes with a price and journey time. Approve them as proposed or change the price and time.">
      <div className="tabs" role="tablist">{TABS.map((s) => <button key={s} role="tab" className="tab" aria-selected={status === s} onClick={() => setStatus(s)}>{s[0] + s.slice(1).toLowerCase()}</button>)}</div>
      {loading ? <Skeleton lines={5} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <DataTable key={status} rows={data.permissions} columns={columns} filters={filters(data.permissions)} initialSort={{ key: 'operator', dir: 'asc' }}
          searchPlaceholder="Search operator, city or point" searchText={(p) => `${p.vendors.company_name} ${p.origin} ${p.destination} ${p.boarding_points.join(' ')} ${p.dropping_points.join(' ')}`}
          empty={<EmptyState icon={ClipboardCheck} title={`No ${status.toLowerCase()} requests`} />} />
      )}
      {prompt?.kind === 'edit' && <Approve editing p={prompt.p} onClose={() => setPrompt(null)} onDone={() => { setPrompt(null); reload(); }} />}
      {prompt?.kind === 'delete' && <ConfirmModal title="Delete this route request?" message={`${prompt.p.vendors.company_name}: ${prompt.p.origin} → ${prompt.p.destination} and any unsold trips on it will be removed. A route with bookings cannot be deleted.`}
        onClose={() => setPrompt(null)} onConfirm={async () => { await api(`/api/admin/permissions/${prompt.p.id}`, { method: 'DELETE' }); setPrompt(null); reload(); }} />}
      {prompt?.kind === 'approve' && <Approve p={prompt.p} onClose={() => setPrompt(null)} onDone={() => { setPrompt(null); reload(); }} />}
      {(prompt?.kind === 'reject' || prompt?.kind === 'revoke') && <PromptModal title={prompt.kind === 'reject' ? 'Reject request' : 'Revoke approval'} label="Note for the operator" type="textarea" min={5} confirm={prompt.kind === 'reject' ? 'Reject' : 'Revoke'} tone="danger" onClose={() => setPrompt(null)} onSubmit={(v) => send(prompt.p.id, { action: prompt.kind, note: v })} />}
    </AdminShell>
  );
}
