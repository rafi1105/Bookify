import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { ArrowRight, Armchair, Bus, Star } from 'lucide-react';
import SearchForm from '../src/components/SearchForm.jsx';
import { Badge, EmptyState, ErrorState, Skeleton } from '../src/components/ui.jsx';
import { useApi } from '../src/lib/useApi.js';
import { COACH_LABEL, addDays, dhakaHour, dhakaToday, formatBDT, formatDate, formatDuration, formatTime } from '../src/lib/format.js';

const WINDOWS = [
  { id: 'night', label: 'Before 6 AM', test: (h) => h < 6 },
  { id: 'morning', label: '6 AM – 12 PM', test: (h) => h >= 6 && h < 12 },
  { id: 'afternoon', label: '12 – 6 PM', test: (h) => h >= 12 && h < 18 },
  { id: 'evening', label: 'After 6 PM', test: (h) => h >= 18 },
];

function toggle(set, value) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
}

function DateStrip({ from, to, date }) {
  const today = dhakaToday();
  const start = addDays(date, -3) < today ? today : addDays(date, -3);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <nav className="date-strip" aria-label="Choose another date">
      {days.map((d) => (
        <Link key={d} href={{ pathname: '/search', query: { from, to, date: d } }} className="date-chip" aria-current={d === date ? 'date' : undefined}>
          <span className="small">{formatDate(d + 'T12:00:00+06:00', { weekday: 'short' })}</span>
          <strong>{formatDate(d + 'T12:00:00+06:00', { day: 'numeric', month: 'short' })}</strong>
        </Link>
      ))}
    </nav>
  );
}

function TripCard({ trip }) {
  const soldOut = trip.available_seats <= 0;
  const low = !soldOut && trip.available_seats <= 5;
  return (
    <article className="card trip-card">
      <div className="trip-main">
        <div className="trip-id">
          {trip.image_url && <img className="trip-thumb" src={trip.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" />}
        <div className="stack-s">
          <div className="row">
            <h3>{trip.operator_name}</h3>
            <Badge tone="brand">{COACH_LABEL[trip.bus_type] || trip.bus_type}</Badge>
            {trip.seat_kind === 'BERTH' && <Badge tone="info">Berth</Badge>}
          </div>
          <p className="muted small">{trip.bus_name} · {trip.bus_code}{trip.amenities?.length ? ` · ${trip.amenities.slice(0, 4).join(' · ')}` : ''}</p>
          <p className="small row"><Star size={14} aria-hidden="true" /> {trip.rating_count ? `${trip.rating} (${trip.rating_count} reviews)` : 'New on Bookify'}</p>
        </div>
        </div>
        <div className="trip-times">
          <div><strong className="time">{formatTime(trip.departure_at)}</strong><div className="muted small">{trip.origin}</div></div>
          <div className="trip-line"><span className="small muted">{formatDuration(trip.duration_min)}</span></div>
          <div><strong className="time">{formatTime(trip.arrival_at)}</strong><div className="muted small">{trip.destination}</div></div>
        </div>
        <div className="trip-buy">
          <div className="fare">{formatBDT(trip.fare)}<span className="muted small"> / seat</span></div>
          <div className={`small ${low ? 'seats-low' : 'muted'}`}><Armchair size={14} aria-hidden="true" /> {soldOut ? 'Sold out' : `${trip.available_seats} seats left`}</div>
          {soldOut
            ? <span className="btn btn-secondary" aria-disabled="true">Sold out</span>
            : <Link href={`/trips/${trip.trip_id}`} className="btn btn-primary">Select seats</Link>}
        </div>
      </div>
      <p className="trip-points muted small">Boarding: {trip.boarding_points?.join(', ') || '—'} · Dropping: {trip.dropping_points?.join(', ') || '—'}</p>
    </article>
  );
}

function Results({ from, to, date }) {
  const path = `/api/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`;
  const { loading, error, data, reload } = useApi(path, { auth: false });
  const [coach, setCoach] = useState(new Set());
  const [operator, setOperator] = useState(new Set());
  const [window_, setWindow] = useState(new Set());
  const [sort, setSort] = useState('time');

  const trips = useMemo(() => data?.trips || [], [data]);
  const coaches = useMemo(() => [...new Set(trips.map((t) => t.bus_type))], [trips]);
  const operators = useMemo(() => [...new Set(trips.map((t) => t.operator_name))], [trips]);

  const visible = useMemo(() => {
    const list = trips.filter((t) =>
      (!coach.size || coach.has(t.bus_type)) && (!operator.size || operator.has(t.operator_name)) &&
      (!window_.size || WINDOWS.some((w) => window_.has(w.id) && w.test(dhakaHour(t.departure_at)))));
    const sorters = {
      time: (a, b) => new Date(a.departure_at) - new Date(b.departure_at),
      fare: (a, b) => a.fare - b.fare,
      seats: (a, b) => b.available_seats - a.available_seats,
      duration: (a, b) => a.duration_min - b.duration_min,
    };
    return list.sort(sorters[sort]);
  }, [trips, coach, operator, window_, sort]);

  if (loading) return <div className="stack">{[0, 1, 2].map((i) => <div key={i} className="card card-pad"><Skeleton lines={4} /></div>)}</div>;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!trips.length) {
    return (
      <EmptyState icon={Bus} title={`No buses from ${from} to ${to} on this date`}>
        Try another date from the strip above, or search a different route.
      </EmptyState>
    );
  }

  return (
    <div className="results-layout">
      <aside className="card card-pad filters stack" aria-label="Filters">
        <div className="row-between"><h3>Filters</h3>
          <button className="btn btn-ghost btn-small" onClick={() => { setCoach(new Set()); setOperator(new Set()); setWindow(new Set()); }}>Clear</button></div>
        <fieldset className="filter-group"><legend>Coach type</legend>
          {coaches.map((c) => <label key={c} className="checkbox"><input type="checkbox" checked={coach.has(c)} onChange={() => setCoach(toggle(coach, c))} />{COACH_LABEL[c] || c}</label>)}
        </fieldset>
        <fieldset className="filter-group"><legend>Departure time</legend>
          {WINDOWS.map((w) => <label key={w.id} className="checkbox"><input type="checkbox" checked={window_.has(w.id)} onChange={() => setWindow(toggle(window_, w.id))} />{w.label}</label>)}
        </fieldset>
        <fieldset className="filter-group"><legend>Operator</legend>
          {operators.map((o) => <label key={o} className="checkbox"><input type="checkbox" checked={operator.has(o)} onChange={() => setOperator(toggle(operator, o))} />{o}</label>)}
        </fieldset>
      </aside>
      <section className="stack" aria-live="polite">
        <div className="row-between">
          <p className="strong">{visible.length} of {trips.length} bus{trips.length === 1 ? '' : 'es'}</p>
          <label className="row small">Sort by
            <select className="select select-small" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="time">Earliest departure</option>
              <option value="fare">Lowest fare</option>
              <option value="duration">Shortest trip</option>
              <option value="seats">Most seats left</option>
            </select>
          </label>
        </div>
        {visible.length ? visible.map((t) => <TripCard key={t.trip_id} trip={t} />) : (
          <EmptyState title="No buses match these filters">Clear a filter to see more buses.</EmptyState>
        )}
      </section>
    </div>
  );
}

export default function Search() {
  const { isReady, query } = useRouter();
  const { from, to, date } = query;
  const ready = isReady && typeof from === 'string' && typeof to === 'string' && typeof date === 'string';
  return (
    <>
      <Head><title>{ready ? `${from} to ${to} buses · Bookify` : 'Search buses · Bookify'}</title></Head>
      <div className="search-bar-band">
        <div className="container stack">
          <SearchForm compact initial={ready ? { from, to, date } : {}} />
          {ready && <DateStrip from={from} to={to} date={date} />}
        </div>
      </div>
      <div className="container section-tight">
        {!isReady ? <Skeleton lines={5} /> : ready ? (
          <>
            <h1 className="results-title">{from} <ArrowRight size={22} aria-hidden="true" /> {to}</h1>
            <p className="muted results-sub">{formatDate(date + 'T12:00:00+06:00')}</p>
            <Results from={from} to={to} date={date} />
          </>
        ) : (
          <EmptyState icon={Bus} title="Where are you travelling?">Choose your cities and date above to see available buses.</EmptyState>
        )}
      </div>
    </>
  );
}
