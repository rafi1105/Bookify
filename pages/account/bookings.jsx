import Head from 'next/head';
import Link from 'next/link';
import { ArrowRight, Ticket } from 'lucide-react';
import RequireAuth from '../../src/components/RequireAuth.jsx';
import { STATUS_LABEL, STATUS_TONE } from '../../src/components/TicketView.jsx';
import { Badge, EmptyState, ErrorState, PageHeader, Skeleton } from '../../src/components/ui.jsx';
import { useApi } from '../../src/lib/useApi.js';
import { formatBDT, formatDateTime, formatDuration } from '../../src/lib/format.js';

function List() {
  const { loading, error, data, reload } = useApi('/api/bookings');
  if (loading) return <div className="stack">{[0, 1, 2].map((i) => <div key={i} className="card card-pad"><Skeleton lines={2} /></div>)}</div>;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.bookings.length) return <EmptyState icon={Ticket} title="No bookings yet" action={<Link className="btn btn-primary" href="/">Search buses</Link>}>Your tickets will appear here after you book.</EmptyState>;
  // Trip status follows the simulation clock, so it decides what is still ahead.
  const upcoming = data.bookings.filter((b) => ['SCHEDULED', 'BOARDING', 'DELAYED', 'EN_ROUTE'].includes(b.tripStatus) && b.status !== 'CANCELLED' && b.status !== 'REFUNDED');
  const past = data.bookings.filter((b) => !upcoming.includes(b));
  const Card = ({ b }) => (
    <Link href={`/bookings/${b.id}`} className="card card-pad booking-row">
      <div className="stack-s">
        <div className="route-cities">{b.origin} <ArrowRight size={16} aria-hidden="true" /> {b.destination}</div>
        <div className="muted small">{b.operator} · {formatDateTime(b.departureAt)} · {b.seats?.length ? `Seat${b.seats.length === 1 ? '' : 's'} ${b.seats.join(', ')}` : `${b.seatCount} seat${b.seatCount === 1 ? '' : 's'}`} · PNR {b.pnr}</div>
      </div>
      <div className="stack-s right">
        <Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status] || b.status}</Badge>
        <strong>{formatBDT(b.total)}</strong>
        {b.status === 'CONFIRMED' && b.delayMin > 0 && <Badge tone="warn">Delayed {formatDuration(b.delayMin)}</Badge>}
        {b.refundStatus && b.refundStatus !== 'NONE' && <span className="muted small">Refund {formatBDT(b.refundAmount)} · {b.refundStatus.toLowerCase()}</span>}
      </div>
    </Link>
  );
  return (
    <div className="stack">
      {upcoming.length > 0 && <><h2>Upcoming</h2>{upcoming.map((b) => <Card key={b.id} b={b} />)}</>}
      {past.length > 0 && <><h2>Past and cancelled</h2>{past.map((b) => <Card key={b.id} b={b} />)}</>}
    </div>
  );
}

export default function MyBookings() {
  return (
    <RequireAuth>
      <Head><title>My bookings · Bookify</title></Head>
      <PageHeader title="My bookings" subtitle="Your tickets, in one place." />
      <div className="container narrow-wide"><List /></div>
    </RequireAuth>
  );
}
