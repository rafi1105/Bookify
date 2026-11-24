import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import Countdown from '../../src/components/Countdown.jsx';
import SeatMap from '../../src/components/SeatMap.jsx';
import { Alert, Badge, Button, ErrorState, Field, Skeleton } from '../../src/components/ui.jsx';
import { useAuth } from '../../src/context/AuthContext.jsx';
import { api } from '../../src/lib/api.js';
import { COACH_LABEL, formatBDT, formatDate, formatTime } from '../../src/lib/format.js';

const MAX_SEATS = 4;

export default function TripPage() {
  const router = useRouter();
  const { id } = router.query;
  const { session, loading: authLoading } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [selected, setSelected] = useState([]);
  const [boarding, setBoarding] = useState('');
  const [dropping, setDropping] = useState('');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!id || authLoading) return;
    if (!quiet) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api(`/api/trips/${id}`);
      setState({ loading: false, error: null, data });
      setSelected((current) => current.filter((s) => !data.booked.includes(s) && !data.held.includes(s)));
    } catch (error) {
      setState((s) => (quiet && s.data ? s : { loading: false, error, data: null }));
    }
  }, [id, authLoading]);

  useEffect(() => { load(); }, [load]);

  // Keep availability fresh: poll while the page is visible and refetch on focus.
  useEffect(() => {
    const refresh = () => document.visibilityState === 'visible' && load(true);
    const timer = setInterval(refresh, 10000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);

  const data = state.data;
  const boardingStops = useMemo(() => (data?.stops || []).filter((s) => s.type !== 'DROPPING'), [data]);
  const droppingStops = useMemo(() => (data?.stops || []).filter((s) => s.type !== 'BOARDING'), [data]);

  useEffect(() => {
    if (!data) return;
    setBoarding((b) => b || boardingStops[0]?.id || '');
    setDropping((d) => d || droppingStops[droppingStops.length - 1]?.id || '');
  }, [data, boardingStops, droppingStops]);

  const toggle = (seat) => {
    setNotice(null);
    setSelected((cur) => (cur.includes(seat) ? cur.filter((s) => s !== seat) : cur.length < MAX_SEATS ? [...cur, seat] : cur));
  };

  async function hold() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await api(`/api/trips/${id}/hold`, { method: 'POST', body: { seats: selected, boardingId: boarding, droppingId: dropping } });
      router.push(`/checkout/${res.bookingId}`);
    } catch (error) {
      setNotice({ kind: 'error', message: error.message });
      setBusy(false);
      load(true);
    }
  }

  async function releaseMine() {
    await api(`/api/bookings/${data.my_hold.booking_id}/release`, { method: 'POST' }).catch(() => {});
    load(true);
  }

  if (state.loading) return <div className="container section-tight"><div className="card card-pad"><Skeleton lines={8} /></div></div>;
  if (state.error) return <div className="container section-tight"><ErrorState error={state.error} onRetry={() => load()} /></div>;

  const { trip, layout, my_hold: mine } = data;
  const stopOrder = (stopId) => data.stops.find((s) => s.id === stopId)?.sequence ?? 0;
  const stopsValid = boarding && dropping && stopOrder(boarding) < stopOrder(dropping);
  const total = selected.length * Number(trip.fare);
  const back = { pathname: '/search', query: { from: trip.origin, to: trip.destination, date: trip.departure_at.slice(0, 10) } };

  return (
    <>
      <Head><title>{trip.origin} to {trip.destination} · {trip.operator_name} · Bookify</title></Head>
      <div className="search-bar-band">
        <div className="container row-between">
          <div className="stack-s">
            <Link href={back} className="small">← Back to results</Link>
            <h1 className="results-title">{trip.origin} <ArrowRight size={22} aria-hidden="true" /> {trip.destination}</h1>
            <p className="muted"><Clock size={14} aria-hidden="true" /> {formatDate(trip.departure_at)} · {formatTime(trip.departure_at)} – {formatTime(trip.arrival_at)}</p>
          </div>
          <div className="stack-s right">
            <strong>{trip.operator_name}</strong>
            <span className="muted small">{trip.bus_name} · {trip.bus_code}</span>
            {trip.image_url && <img className="trip-hero-img" src={trip.image_url} alt={`${trip.bus_name}`} referrerPolicy="no-referrer" />}
            <Badge tone="brand">{COACH_LABEL[trip.bus_type] || trip.bus_type}</Badge>
          </div>
        </div>
      </div>

      <div className="container section-tight stack">
        {!trip.sellable && <Alert kind="warn">Ticket sales for this trip are closed. <Link href={back}>Find another bus</Link></Alert>}
        {mine && (
          <Alert kind="info">
            <div className="row-between">
              <span>You are holding seat{mine.seats.length > 1 ? 's' : ''} <strong>{mine.seats.join(', ')}</strong> on this trip. <Countdown until={mine.expires_at} onExpire={() => load(true)} /> left to pay.</span>
              <span className="row">
                <Button variant="ghost" size="small" onClick={releaseMine}>Release seats</Button>
                <Link className="btn btn-primary btn-small" href={`/checkout/${mine.booking_id}`}>Continue to checkout</Link>
              </span>
            </div>
          </Alert>
        )}
        <div className="trip-layout">
          <section className="card card-pad stack">
            <div className="row-between"><h2>Choose your {layout.kind === 'BERTH' ? 'berths' : 'seats'}</h2><span className="muted small">Up to {MAX_SEATS} per booking</span></div>
            <SeatMap layout={layout} booked={data.booked} held={data.held} selected={selected} onToggle={toggle} max={MAX_SEATS} readOnly={!trip.sellable} />
          </section>

          <aside className="card card-pad stack trip-summary">
            <h3>Your journey</h3>
            <Field label="Boarding point" id="boarding">
              <select id="boarding" className="select" value={boarding} onChange={(e) => setBoarding(e.target.value)}>
                {boardingStops.map((s) => <option key={s.id} value={s.id}>{s.name} · {formatTime(s.time)}</option>)}
              </select>
            </Field>
            <Field label="Dropping point" id="dropping">
              <select id="dropping" className="select" value={dropping} onChange={(e) => setDropping(e.target.value)}>
                {droppingStops.map((s) => <option key={s.id} value={s.id}>{s.name} · {formatTime(s.time)}</option>)}
              </select>
            </Field>
            {!stopsValid && <p className="field-error">Your dropping point must come after your boarding point.</p>}
            <hr className="rule" />
            <div className="row-between"><span className="muted">Selected</span><strong>{selected.length ? selected.join(', ') : 'None yet'}</strong></div>
            <div className="row-between"><span className="muted">Fare per seat</span><span>{formatBDT(trip.fare)}</span></div>
            <div className="row-between total-line"><span>Total</span><strong>{formatBDT(total)}</strong></div>
            {notice && <Alert kind={notice.kind}>{notice.message}</Alert>}
            {session ? (
              <Button size="large" block loading={busy} onClick={hold} disabled={!selected.length || !stopsValid || !trip.sellable}>
                {selected.length ? `Continue with ${selected.length} seat${selected.length > 1 ? 's' : ''}` : 'Select seats to continue'}
              </Button>
            ) : (
              <Link className="btn btn-primary btn-large btn-block" href={`/sign-in?next=${encodeURIComponent(router.asPath)}`}>Sign in to continue</Link>
            )}
            <p className="muted small">Seats are held for 10 minutes once you continue, so you have time to pay.</p>
          </aside>
        </div>
      </div>
    </>
  );
}
