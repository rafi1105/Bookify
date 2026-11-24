import { useState } from 'react';
import { Building2 } from 'lucide-react';
import AdminShell from '../../src/components/AdminShell.jsx';
import DataTable from '../../src/components/DataTable.jsx';
import PromptModal from '../../src/components/PromptModal.jsx';
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { formatDate } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';

export default function Operators() {
  const { loading, error, data, reload } = useApi('/api/admin/operators');
  const [prompt, setPrompt] = useState(null);
  const act = async (id, action, reason) => { await api(`/api/admin/operators/${id}`, { method: 'PATCH', body: { action, reason } }); reload(); };
  const columns = [
    { key: 'company', label: 'Company', sort: (o) => o.company_name, render: (o) => <strong>{o.company_name}</strong> },
    { key: 'contact', label: 'Contact', render: (o) => o.contact_email || o.contact_phone || '—' },
    { key: 'registered', label: 'Registered', sort: (o) => o.created_at, render: (o) => formatDate(o.created_at) },
    { key: 'status', label: 'Status', sort: (o) => o.status, render: (o) => <Badge tone={o.status === 'ACTIVE' ? 'ok' : 'danger'}>{o.status === 'ACTIVE' ? 'Active' : 'Suspended'}</Badge> },
    { key: 'actions', label: '', align: 'right', className: 'nowrap', render: (o) => (
      <>
        {o.status === 'ACTIVE' && <Button size="small" variant="ghost" onClick={() => setPrompt({ id: o.id, action: 'suspend', title: `Suspend ${o.company_name}` })}>Suspend</Button>}
        {o.status === 'SUSPENDED' && <Button size="small" variant="secondary" onClick={() => act(o.id, 'reinstate')}>Reinstate</Button>}
      </>
    ) },
  ];
  const filters = [{ key: 'status', label: 'Status', options: [['ACTIVE', 'Active'], ['SUSPENDED', 'Suspended']], match: (o, v) => o.status === v }];
  return (
    <AdminShell title="Operators" subtitle="Registered bus companies. You can suspend or reinstate an operator.">
      {loading ? <Skeleton lines={6} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <DataTable rows={data.operators} columns={columns} filters={filters} initialSort={{ key: 'company', dir: 'asc' }}
          searchPlaceholder="Search company or contact" searchText={(o) => `${o.company_name} ${o.contact_email || ''} ${o.contact_phone || ''}`}
          empty={<EmptyState icon={Building2} title="No operators yet">Companies appear here when they register.</EmptyState>} />
      )}
      {prompt && <PromptModal title={prompt.title} label="Reason (shown to the operator)" type="textarea" min={5} confirm={prompt.title.split(' ')[0]} tone="danger" onClose={() => setPrompt(null)}
        onSubmit={async (reason) => { await act(prompt.id, prompt.action, reason); setPrompt(null); }} />}
    </AdminShell>
  );
}
