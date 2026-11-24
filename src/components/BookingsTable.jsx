import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Ticket } from 'lucide-react';
import DataTable from './DataTable.jsx';
import { Badge, Button, EmptyState, ErrorState, Modal, ModalSection, Skeleton } from './ui.jsx';
import { useApi } from '../lib/useApi.js';
import { formatBDT, formatDateTime } from '../lib/format.js';

const PAYMENT = {
  PAID: ['Paid', 'ok'], AWAITING_PAYMENT: ['Awaiting payment', 'warn'], EXPIRED: ['Hold expired', ''], FAILED: ['Payment failed', 'danger'],
  CANCELLED: ['Cancelled', 'danger'], REFUND_PENDING: ['Refund pending', 'warn'], REFUNDED: ['Refunded', 'info'],
};

function Item({ label, children }) {
  return <div className="kv"><dt>{label}</dt><dd>{children || '—'}</dd></div>;
}

function Detail({ url, onClose }) {
  const { loading, error, data: b, reload } = useApi(url);
  const pay = b && (PAYMENT[b.paymentStatus] || [b.paymentStatus, '']);
  return (
    <Modal title={b ? `Booking ${b.pnr}` : 'Booking'} subtitle={b && `${b.trip.origin} → ${b.trip.destination} · ${formatDateTime(b.trip.departureAt)}`} size="lg" onClose={onClose}
      footer={<Button type="button" variant="secondary" onClick={onClose}>Close</Button>}>
      {loading ? <Skeleton lines={8} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <div className="modal-sections">
          <ModalSection title="Passenger and contact">
            <dl className="kv-list"><Item label="Name">{b.contact.name}</Item><Item label="Phone">{b.contact.phone}</Item><Item label="E-mail">{b.contact.email}</Item><Item label="Booked">{formatDateTime(b.createdAt)}</Item></dl>
          </ModalSection>
          <ModalSection title="Trip">
            <dl className="kv-list">
              <Item label="Operator">{b.trip.operator}</Item><Item label="Bus">{b.trip.busName} · {b.trip.regNo}</Item>
              <Item label="Boarding">{b.boarding ? `${b.boarding.name} · ${formatDateTime(b.boarding.time)}` : null}</Item>
              <Item label="Dropping">{b.dropping ? `${b.dropping.name} · ${formatDateTime(b.dropping.time)}` : null}</Item>
            </dl>
          </ModalSection>
          <ModalSection title={`Seats (${b.seats.length})`}>
            <div className="table-wrap"><table className="table"><thead><tr><th>Seat</th><th>Passenger</th><th>Age</th><th>Gender</th><th className="right">Price</th></tr></thead>
              <tbody>{b.seats.map((s) => <tr key={s.seat}><td><strong>{s.seat}</strong></td><td>{s.passenger?.name || '—'}</td><td>{s.passenger?.age || '—'}</td><td>{s.passenger?.gender || '—'}</td><td className="right">{formatBDT(s.price)}</td></tr>)}</tbody></table></div>
          </ModalSection>
          <ModalSection title="Payment and refund">
            <dl className="kv-list">
              <Item label="Status"><Badge tone={pay[1]}>{pay[0]}</Badge></Item>
              <Item label="Total">{formatBDT(b.total)}</Item>
              <Item label="Method">{b.payment?.method}</Item>
              <Item label="Transaction">{b.payment?.transactionId}</Item>
              <Item label="Paid at">{b.payment?.paidAt ? formatDateTime(b.payment.paidAt) : null}</Item>
              {b.status === 'CANCELLED' && <Item label="Cancelled">{b.cancelledAt ? formatDateTime(b.cancelledAt) : 'Yes'}{b.cancelReason ? ` · ${b.cancelReason}` : ''}</Item>}
              {b.refund.status !== 'NONE' && <Item label="Refund">{formatBDT(b.refund.amount)} · {b.refund.status.toLowerCase()}{b.refund.reference ? ` · ref ${b.refund.reference}` : ''}</Item>}
            </dl>
          </ModalSection>
        </div>
      )}
    </Modal>
  );
}

// Searchable booking history for operators (own trips) and admin (all trips).
export default function BookingsTable({ endpoint, detailUrl, admin = false }) {
  const { query } = useRouter();
  const { loading, error, data, reload } = useApi(endpoint);
  const [open, setOpen] = useState(null);
  const columns = useMemo(() => [
    { key: 'booked', label: 'Booked', sort: (b) => b.createdAt, className: 'nowrap', render: (b) => formatDateTime(b.createdAt) },
    { key: 'pnr', label: 'PNR', sort: (b) => b.pnr, render: (b) => <code className="code">{b.pnr}</code> },
    { key: 'passenger', label: 'Passenger', sort: (b) => b.passenger, render: (b) => <><strong>{b.passenger || '—'}</strong><div className="muted small">{b.phone}</div></> },
    { key: 'trip', label: 'Trip', sort: (b) => b.departureAt, render: (b) => <>{b.origin} → {b.destination}<div className="muted small">{formatDateTime(b.departureAt)}</div></> },
    { key: 'bus', label: admin ? 'Operator / bus' : 'Bus', sort: (b) => b.regNo, render: (b) => <>{admin && <strong>{b.operator}<br /></strong>}{b.regNo}</> },
    { key: 'seats', label: 'Seats', sort: (b) => b.seatCount, render: (b) => <>{b.seats.join(', ')}</> },
    { key: 'total', label: 'Amount', sort: (b) => b.total, align: 'right', render: (b) => formatBDT(b.total) },
    { key: 'payment', label: 'Payment', sort: (b) => b.paymentStatus, render: (b) => { const p = PAYMENT[b.paymentStatus] || [b.paymentStatus, '']; return <Badge tone={p[1]}>{p[0]}</Badge>; } },
    { key: 'actions', label: '', align: 'right', render: (b) => <Button size="small" variant="ghost" onClick={() => setOpen(b)}>Details</Button> },
  ], [admin]);
  const filters = useMemo(() => {
    const rows = data?.bookings || [];
    const routes = [...new Set(rows.map((b) => `${b.origin} → ${b.destination}`))].sort();
    return [
      { key: 'payment', label: 'Payment', options: Object.entries(PAYMENT).map(([k, v]) => [k, v[0]]), match: (b, v) => b.paymentStatus === v },
      { key: 'route', label: 'Route', options: routes.map((r) => [r, r]), match: (b, v) => `${b.origin} → ${b.destination}` === v },
      ...(admin ? [{ key: 'operator', label: 'Operator', options: [...new Set(rows.map((b) => b.operator))].sort().map((o) => [o, o]), match: (b, v) => b.operator === v }] : []),
    ];
  }, [data, admin]);

  if (loading) return <Skeleton lines={8} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <>
      <DataTable key={String(query.q || '')} rows={data.bookings} columns={columns} filters={filters} dateField={(b) => b.createdAt} initialSort={{ key: 'booked', dir: 'desc' }} initialQuery={String(query.q || '')}
        searchPlaceholder="Search PNR, passenger name, phone, e-mail or bus registration"
        searchText={(b) => `${b.pnr} ${b.passenger || ''} ${b.phone || ''} ${b.email || ''} ${b.regNo} ${b.operator} ${b.origin} ${b.destination}`}
        empty={<EmptyState icon={Ticket} title="No bookings yet">Bookings appear here as soon as passengers reserve seats on your trips. Unpaid reservations show as Awaiting payment.</EmptyState>} />
      {open && <Detail url={detailUrl(open.id)} onClose={() => setOpen(null)} />}
    </>
  );
}
