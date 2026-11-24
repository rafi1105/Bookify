import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import RequireAuth from '../../src/components/RequireAuth.jsx';
import DelayNotice from '../../src/components/DelayNotice.jsx';
import HoldBar from '../../src/components/HoldBar.jsx';
import { Alert, Button, EmptyState, ErrorState, Field, PageHeader, Skeleton } from '../../src/components/ui.jsx';
import { api } from '../../src/lib/api.js';
import { COACH_LABEL, formatBDT, formatDate, formatTime } from '../../src/lib/format.js';
import { EMAIL_RE, normalizePhone } from '../../src/lib/validate.js';
import { Timer } from 'lucide-react';

function Checkout({ id }) {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, error: null, booking: null });
  const [config, setConfig] = useState(null);
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [passengers, setPassengers] = useState({});
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);

  const load = useCallback(async () => {
    try {
      const booking = await api(`/api/bookings/${id}`);
      if (booking.status === 'CONFIRMED') return router.replace(`/bookings/${id}`);
      setContact({ name: booking.contact.name || '', phone: booking.contact.phone || '', email: booking.contact.email || '' });
      setPassengers(Object.fromEntries(booking.seats.map((s) => [s.seat, { name: s.passenger?.name || '', age: s.passenger?.age ?? '', gender: s.passenger?.gender || '' }])));
      setState({ loading: false, error: null, booking });
    } catch (error) {
      setState({ loading: false, error, booking: null });
    }
  }, [id, router]);

  useEffect(() => { if (id) { load(); api('/api/payments/config', { auth: false }).then(setConfig).catch(() => setConfig({ available: false })); } }, [id, load]);

  const { booking } = state;
  const holdOver = expired || (booking && (booking.status !== 'PENDING_PAYMENT' || new Date(booking.expiresAt) <= new Date()));

  async function pay(event) {
    event.preventDefault();
    const found = {};
    if (contact.name.trim().length < 2) found.name = 'Enter the contact name';
    if (!normalizePhone(contact.phone)) found.phone = 'Enter a Bangladeshi mobile number';
    if (!EMAIL_RE.test(contact.email.trim())) found.email = 'Enter a valid e-mail address';
    for (const seat of booking.seats) {
      const p = passengers[seat.seat] || {};
      if ((p.name || '').trim().length < 2) found[`${seat.seat}-name`] = 'Enter the passenger name';
      if (!/^\d{1,3}$/.test(String(p.age)) || Number(p.age) > 120) found[`${seat.seat}-age`] = 'Enter a valid age';
      if (!p.gender) found[`${seat.seat}-gender`] = 'Choose a gender';
    }
    if (!accept) found.accept = 'Please accept the refund policy to continue';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFailure('');
    try {
      await api(`/api/bookings/${id}/passengers`, { method: 'PUT', body: {
        contact: { name: contact.name.trim(), phone: contact.phone, email: contact.email.trim() },
        passengers: booking.seats.map((s) => ({ seat: s.seat, name: passengers[s.seat].name.trim(), age: Number(passengers[s.seat].age), gender: passengers[s.seat].gender })),
      } });
      const { url } = await api(`/api/bookings/${id}/pay`, { method: 'POST' });
      window.location.assign(url);
    } catch (error) {
      setFailure(error.message);
      setBusy(false);
    }
  }

  async function release() {
    await api(`/api/bookings/${id}/release`, { method: 'POST' }).catch(() => {});
    router.push('/');
  }

  if (state.loading) return <div className="container section-tight"><div className="card card-pad"><Skeleton lines={8} /></div></div>;
  if (state.error) return <div className="container section-tight"><ErrorState error={state.error} onRetry={load} /></div>;
  const t = booking.trip;

  if (holdOver) {
    return (
      <div className="container">
        <EmptyState icon={Timer} title="Your seat hold has expired" action={<Link className="btn btn-primary" href={`/trips/${t.id}`}>Choose seats again</Link>}>
          Seats are held for 10 minutes. They have been released for other passengers.
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      <Head><title>Checkout · Bookify</title></Head>
      <HoldBar seats={booking.seats.map((x) => x.seat)} until={booking.expiresAt} onExpire={() => setExpired(true)} />
      <PageHeader title="Passenger details and payment" subtitle={`${t.origin} → ${t.destination} · ${formatDate(t.departureAt)}, ${formatTime(t.departureAt)}`} />
      <div className="container"><DelayNotice scheduledDepartureAt={t.scheduledDepartureAt} departureAt={t.departureAt} delayMin={t.delayMin} /></div>
      <form className="container trip-layout" onSubmit={pay} noValidate>
        <div className="stack">
          <section className="card card-pad stack">
            <h2>Contact</h2>
            <p className="muted small">Your ticket and any trip updates are sent here.</p>
            <div className="form-grid">
              <Field label="Name" id="c-name" error={errors.name}><input id="c-name" className="input" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} /></Field>
              <Field label="Mobile number" id="c-phone" error={errors.phone}><input id="c-phone" className="input" type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></Field>
              <Field label="E-mail" id="c-email" error={errors.email}><input id="c-email" className="input" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></Field>
            </div>
          </section>
          {booking.seats.map((s) => {
            const p = passengers[s.seat] || {};
            const set = (patch) => setPassengers({ ...passengers, [s.seat]: { ...p, ...patch } });
            return (
              <section key={s.seat} className="card card-pad stack">
                <h3>Passenger for seat {s.seat}</h3>
                <div className="form-grid">
                  <Field label="Full name" id={`${s.seat}-name`} error={errors[`${s.seat}-name`]}><input id={`${s.seat}-name`} className="input" value={p.name || ''} onChange={(e) => set({ name: e.target.value })} /></Field>
                  <Field label="Age" id={`${s.seat}-age`} error={errors[`${s.seat}-age`]}><input id={`${s.seat}-age`} className="input" inputMode="numeric" value={p.age} onChange={(e) => set({ age: e.target.value })} /></Field>
                  <Field label="Gender" id={`${s.seat}-gender`} error={errors[`${s.seat}-gender`]}>
                    <select id={`${s.seat}-gender`} className="select" value={p.gender || ''} onChange={(e) => set({ gender: e.target.value })}>
                      <option value="">Select</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                    </select>
                  </Field>
                </div>
              </section>
            );
          })}
        </div>
        <aside className="card card-pad stack trip-summary">
          <h3>Order summary</h3>
          <div className="stack-s small">
            <div><strong>{t.operator}</strong> · {COACH_LABEL[t.busType] || t.busType}</div>
            <div className="muted">Board: {booking.boarding?.name} · Drop: {booking.dropping?.name}</div>
          </div>
          <hr className="rule" />
          {booking.seats.map((s) => <div key={s.seat} className="row-between"><span>Seat {s.seat}</span><span>{formatBDT(s.price)}</span></div>)}
          <div className="row-between total-line"><span>Total</span><strong>{formatBDT(booking.total)}</strong></div>
          <label className="checkbox">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
            <span>I have read the <Link href="/policies/refunds" target="_blank">refund policy</Link> and <Link href="/policies/terms" target="_blank">terms</Link>.</span>
          </label>
          {errors.accept && <span className="field-error" role="alert">{errors.accept}</span>}
          {config && !config.available && <Alert kind="error">Online payment is not available right now, so we cannot take your payment. Please try again later.</Alert>}
          {config?.available && <p className="muted small">Pay with {config.label}. You will be taken to a secure payment page.</p>}
          {failure && <Alert kind="error">{failure}</Alert>}
          <Button type="submit" size="large" block loading={busy} disabled={!config?.available}>Pay {formatBDT(booking.total)}</Button>
          <Button type="button" variant="ghost" size="small" onClick={release}>Release seats and start over</Button>
        </aside>
      </form>
    </>
  );
}

export default function CheckoutPage() {
  const { query } = useRouter();
  return <RequireAuth>{query.id ? <Checkout id={query.id} /> : null}</RequireAuth>;
}
