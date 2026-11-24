import { useState } from 'react';
import { Building2 } from 'lucide-react';
import AdminShell from '../../src/components/AdminShell.jsx';
import PromptModal from '../../src/components/PromptModal.jsx';
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { formatDate } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';

export default function Operators() {
  const { loading, error, data, reload } = useApi('/api/admin/operators');
  const [prompt, setPrompt] = useState(null);
  const act = async (id, action, reason) => { await api(`/api/admin/operators/${id}`, { method: 'PATCH', body: { action, reason } }); reload(); };
  return (
    <AdminShell title="Operators" subtitle="Registered bus companies. You can suspend or reinstate an operator.">
      {loading ? <Skeleton lines={6} /> : error ? <ErrorState error={error} onRetry={reload} />
        : !data.operators.length ? <EmptyState icon={Building2} title="No operators yet">Companies appear here when they register.</EmptyState> : (
          <div className="card table-wrap"><table className="table">
            <thead><tr><th>Company</th><th>Contact</th><th>Registered</th><th>Status</th><th /></tr></thead>
            <tbody>{data.operators.map((o) => (
              <tr key={o.id}><td><strong>{o.company_name}</strong></td><td>{o.contact_email || o.contact_phone || '—'}</td><td>{formatDate(o.created_at)}</td>
                <td><Badge tone={o.status === 'ACTIVE' ? 'ok' : 'danger'}>{o.status === 'ACTIVE' ? 'Active' : 'Suspended'}</Badge></td>
                <td className="right nowrap">
                  {o.status === 'ACTIVE' && <Button size="small" variant="ghost" onClick={() => setPrompt({ id: o.id, action: 'suspend', title: `Suspend ${o.company_name}` })}>Suspend</Button>}
                  {o.status === 'SUSPENDED' && <Button size="small" variant="secondary" onClick={() => act(o.id, 'reinstate')}>Reinstate</Button>}
                </td></tr>
            ))}</tbody></table></div>
        )}
      {prompt && <PromptModal title={prompt.title} label="Reason (shown to the operator)" type="textarea" min={5} confirm={prompt.title.split(' ')[0]} tone="danger" onClose={() => setPrompt(null)}
        onSubmit={async (reason) => { await act(prompt.id, prompt.action, reason); setPrompt(null); }} />}
    </AdminShell>
  );
}
