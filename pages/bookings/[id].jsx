import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import RequireAuth from '../../src/components/RequireAuth.jsx';
import TicketView from '../../src/components/TicketView.jsx';
import { Alert, Button, ErrorState, Field, PageHeader, Skeleton } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { formatBDT } from '../../src/lib/format.js';

function Booking({ id, justPaid }) {
  const [state, setState] = useState({ loading: true, error: null, booking: null });
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const polls = useRef(0);

  const load = useCallback(async () => {
    try {
      setState({ loading: false, error: null, booking: await api(`/api/bookings/${id}`) });
    } catch (error) {
      setState({ loading: false, error, booking: null });
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // After returning from the payment page, confirmation can lag a few seconds behind.
  const waiting = justPaid && state.booking?.status === 'PENDING_PAYMENT';
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setInterval(() => { polls.current += 1; if (polls.current <= 40) load(); }, 3000);
    return () => clearInterval(timer);
  }, [waiting, load]);

  async function cancel() {
    setBusy(true);
    setFailure('');
    try {
      setState({ loading: false, error: null, booking: await api(`/api/bookings/${id}/cancel`, { method: 'POST', body: { reason } }) });
      setConfirming(false);
    } catch (error) {
      setFailure(error.message);
    }
    setBusy(false);
  }

  if (state.loading) return <div className="container section-tight"><div className="card card-pad"><Skeleton lines={8} /></div></div>;
  if (state.error) return <div className="container section-tight"><ErrorState error={state.error} onRetry={load} /></div>;
  const b = state.booking;
  const refund = b.refund;

  return (
    <>
      <Head><title>Ticket {b.pnr} · Bookify</title></Head>
      <PageHeader title={b.status === 'CONFIRMED' ? 'Your ticket' : 'Booking'} subtitle={`PNR ${b.pnr}`}
        actions={b.status === 'CONFIRMED' && <Button variant="secondary" className="no-print" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Print / save as PDF</Button>} />
      <div className="container stack narrow-wide">
        {justPaid && b.status === 'CONFIRMED' && <Alert kind="ok">Payment received. Your seats are confirmed and your ticket is ready.</Alert>}
        {waiting && <Alert kind="info">We are confirming your payment. This page updates automatically; please do not pay again.</Alert>}
        {!waiting && b.status === 'PENDING_PAYMENT' && <Alert kind="warn">This booking is not paid yet. <Link href={`/checkout/${b.id}`}>Continue to checkout</Link></Alert>}
        {b.status === 'CANCELLED' && b.refund.status === 'NONE' && <Alert kind="warn">This booking was cancelled{b.cancelReason ? `: ${b.cancelReason}` : ''}.</Alert>}
        {refund.status === 'PENDING' && <Alert kind="info">Refund of {formatBDT(refund.amount)} is being processed. It is returned to your original payment method, usually within 7 working days.</Alert>}
        {b.status === 'REFUNDED' && <Alert kind="ok">Refund of {formatBDT(refund.amount)} has been sent{refund.reference ? ` (reference ${refund.reference})` : ''}.</Alert>}
        <TicketView booking={b} />
        {b.status === 'CONFIRMED' && (
          <section className="card card-pad stack no-print">
            <h3>Cancel this ticket</h3>
            {b.refundPercentNow > 0 ? (
              <p className="muted">If you cancel now you will be refunded <strong>{b.refundPercentNow}%</strong> ({formatBDT(Math.round(b.total * b.refundPercentNow) / 100)}). See the <Link href="/policies/refunds">refund policy</Link>.</p>
            ) : (
              <p className="muted">This ticket can no longer be cancelled online because the bus leaves in less than 12 hours.</p>
            )}
            {b.refundPercentNow > 0 && !confirming && <div><Button variant="danger" onClick={() => setConfirming(true)}>Cancel ticket</Button></div>}
            {confirming && (
              <div className="stack">
                <Field label="Reason (optional)" id="reason"><textarea id="reason" className="textarea" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
                {failure && <Alert kind="error">{failure}</Alert>}
                <div className="row">
                  <Button variant="danger" loading={busy} onClick={cancel}>Yes, cancel and request refund</Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)}>Keep my ticket</Button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}

export default function BookingPage() {
  const { query } = useRouter();
  return <RequireAuth>{query.id ? <Booking id={query.id} justPaid={query.paid === '1'} /> : null}</RequireAuth>;
}
