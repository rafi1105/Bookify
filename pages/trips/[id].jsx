import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Banknote, Bus, CalendarDays, Clock, ShieldCheck, Timer, X } from 'lucide-react';
import DelayNotice from '../../src/components/DelayNotice.jsx';
import HoldBar from '../../src/components/HoldBar.jsx';
import SeatMap from '../../src/components/SeatMap.jsx';
import StopPicker from '../../src/components/StopPicker.jsx';
import { Alert, Badge, Button, ErrorState, Skeleton } from '../../src/components/ui.jsx';
import { useAuth } from '../../src/context/AuthContext.jsx';
import { api } from '../../src/lib/api.js';
import { COACH_LABEL, formatBDT, formatDate, formatDuration, formatTime } from '../../src/lib/format.js';

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
  const back = { pathname: '/search', query: { from: trip.origin, to: trip.destination, date: (trip.scheduled_departure_at || trip.departure_at).slice(0, 10) } };

  const duration = Math.round((new Date(trip.arrival_at) - new Date(trip.departure_at)) / 60000);
  const boardStop = data.stops.find((x) => x.id === boarding);
  const dropStop = data.stops.find((x) => x.id === dropping);
  const droppingBlocked = droppingStops.filter((x) => boarding && x.sequence <= stopOrder(boarding)).map((x) => x.id);

  return (
    <>
      <Head><title>{trip.origin} to {trip.destination} · {trip.operator_name} · Bookify</title></Head>
      <div className="search-bar-band">
        <div className="container stack-s">
          <Link href={back} className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Back to results</Link>
          <div className="trip-hero">
            {trip.image_url ? <img className="trip-hero-photo" src={trip.image_url} alt={trip.bus_name} referrerPolicy="no-referrer" /> : <div className="trip-hero-photo trip-hero-empty"><Bus size={40} aria-hidden="true" /></div>}
            <div className="trip-hero-body stack-s">
              <div className="row"><Badge tone="brand">{COACH_LABEL[trip.bus_type] || trip.bus_type}</Badge><span className="muted small">{trip.operator_name} · {trip.bus_name} · {trip.reg_no}</span></div>
              <h1 className="results-title">{trip.origin} <ArrowRight size={22} aria-hidden="true" /> {trip.destination}</h1>
              <div className="trip-facts">
                <span><CalendarDays size={16} aria-hidden="true" /> {formatDate(trip.departure_at)}</span>
                <span><Clock size={16} aria-hidden="true" /> {formatTime(trip.departure_at)} – {formatTime(trip.arrival_at)} · {formatDuration(duration)}</span>
                <span><Banknote size={16} aria-hidden="true" /> {formatBDT(trip.fare)} per seat</span>
              </div>
              {trip.amenities?.length > 0 && <div className="row">{trip.amenities.map((x) => <Badge key={x}>{x}</Badge>)}</div>}
            </div>
          </div>
        </div>
      </div>

      {mine && (
        <HoldBar seats={mine.seats} until={mine.expires_at} onExpire={() => load(true)}>
          <Button variant="ghost" size="small" onClick={releaseMine}>Release seats</Button>
          <Link className="btn btn-primary btn-small" href={`/checkout/${mine.booking_id}`}>Continue to checkout</Link>
        </HoldBar>
      )}
      <div className="container section-tight stack">
        <DelayNotice scheduledDepartureAt={trip.scheduled_departure_at} departureAt={trip.departure_at} delayMin={trip.delay_min} />
        {!trip.sellable && <Alert kind="warn">Ticket sales for this trip are closed. <Link href={back}>Find another bus</Link></Alert>}
        <div className="trip-layout">
          <section className="card card-pad stack seat-card">
            <div className="row-between"><h2>Choose your {layout.kind === 'BERTH' ? 'berths' : 'seats'}</h2><span className="muted small">Up to {MAX_SEATS} per booking</span></div>
            <SeatMap layout={layout} booked={data.booked} held={data.held} mine={mine?.seats || []} selected={selected} onToggle={toggle} max={MAX_SEATS} readOnly={!trip.sellable} />
          </section>

          <aside className="card trip-summary">
            <div className="summary-head">
              <h2>Your journey</h2>
              <div className="journey-line">
                <div><strong>{formatTime(boardStop?.time || trip.departure_at)}</strong><span className="muted small block">{boardStop?.name || trip.origin}</span></div>
                <span className="journey-bar" aria-hidden="true" />
                <div className="right"><strong>{formatTime(dropStop?.time || trip.arrival_at)}</strong><span className="muted small block">{dropStop?.name || trip.destination}</span></div>
              </div>
            </div>
            <div className="summary-body stack">
              <StopPicker label="Boarding point" stops={boardingStops} value={boarding} onChange={setBoarding} />
              <StopPicker label="Dropping point" stops={droppingStops} value={dropping} onChange={setDropping} disabledIds={droppingBlocked} />
              {!stopsValid && <p className="field-error">Your dropping point must come after your boarding point.</p>}
              <div className="stack-s">
                <span className="field-label">{layout.kind === 'BERTH' ? 'Selected berths' : 'Selected seats'}</span>
                {selected.length ? (
                  <ul className="chips-selected">{selected.map((seat) => (
                    <li key={seat}><button type="button" className="chip-selected" onClick={() => toggle(seat)} aria-label={`Remove seat ${seat}`}>{seat} <X size={12} aria-hidden="true" /></button></li>
                  ))}</ul>
                ) : <p className="muted small">Tap a seat on the map to select it.</p>}
              </div>
              <div className="fare-box">
                <div className="row-between"><span className="muted">{selected.length || 0} × {formatBDT(trip.fare)}</span><span>{formatBDT(total)}</span></div>
                <div className="row-between total-line"><span>Total</span><strong>{formatBDT(total)}</strong></div>
              </div>
              {notice && <Alert kind={notice.kind}>{notice.message}</Alert>}
              {session ? (
                <Button size="large" block loading={busy} onClick={hold} disabled={!selected.length || !stopsValid || !trip.sellable}>
                  {selected.length ? `Continue with ${selected.length} seat${selected.length > 1 ? 's' : ''}` : 'Select seats to continue'}
                </Button>
              ) : (
                <Link className="btn btn-primary btn-large btn-block" href={`/sign-in?next=${encodeURIComponent(router.asPath)}`}>Sign in to continue</Link>
              )}
              <ul className="note-list muted small">
                <li><Timer size={14} aria-hidden="true" /> Seats are held for 10 minutes once you continue, so you have time to pay.</li>
                <li><ShieldCheck size={14} aria-hidden="true" /> Free cancellation rules apply. See the <Link href="/policies/refunds">refund policy</Link>.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
