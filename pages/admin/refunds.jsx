import { useState } from 'react';
import { Wallet } from 'lucide-react';
import AdminShell from '../../src/components/AdminShell.jsx';
import PromptModal from '../../src/components/PromptModal.jsx';
import { Button, EmptyState, ErrorState, Skeleton } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { formatBDT, formatDateTime } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';

export default function Refunds() {
  const { loading, error, data, reload } = useApi('/api/admin/refunds');
  const [item, setItem] = useState(null);
  return (
    <AdminShell title="Refunds" subtitle="Send each refund from the payment provider's dashboard, then record the provider's reference here.">
      {loading ? <Skeleton lines={5} /> : error ? <ErrorState error={error} onRetry={reload} />
        : !data.refunds.length ? <EmptyState icon={Wallet} title="No refunds waiting" /> : (
          <div className="card table-wrap"><table className="table">
            <thead><tr><th>PNR</th><th>Passenger</th><th>Trip</th><th>Paid via</th><th>Cancelled</th><th className="right">Refund</th><th /></tr></thead>
            <tbody>{data.refunds.map((b) => (
              <tr key={b.id}><td><strong>{b.pnr}</strong></td><td>{b.contact_name}<div className="muted small">{b.contact_phone}</div></td>
                <td>{b.trips.routes.start_point} → {b.trips.routes.end_point}<div className="muted small">{formatDateTime(b.trips.departure_at)}</div></td>
                <td>{b.payments?.payment_method}<div className="muted small">{b.payments?.transaction_id}</div></td><td>{b.cancelled_at ? formatDateTime(b.cancelled_at) : ''}<div className="muted small">{b.cancel_reason}</div></td>
                <td className="right"><strong>{formatBDT(b.refund_amount)}</strong><div className="muted small">of {formatBDT(b.total_amount)}</div></td>
                <td className="right"><Button size="small" onClick={() => setItem(b)}>Mark refunded</Button></td></tr>
            ))}</tbody></table></div>
        )}
      {item && <PromptModal title={`Record refund for ${item.pnr}`} label="Provider refund reference" confirm={`Confirm ${formatBDT(item.refund_amount)} refunded`} onClose={() => setItem(null)}
        onSubmit={async (reference) => { await api(`/api/admin/refunds/${item.id}`, { method: 'POST', body: { reference } }); setItem(null); reload(); }} />}
    </AdminShell>
  );
}
