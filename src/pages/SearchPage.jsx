import { useDemoSession } from '../context/DemoSessionContext';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SearchWidget from '../components/SearchWidget';
import { api, dhakaTime, money } from '../lib/bookifyApi';

function Reservation({ trip }) {
  const { user, ready, openLogin } = useDemoSession();
  const { asPath } = useRouter();
  const [layout, setLayout] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    function refresh() {
      api('/trips/' + trip.id + '/seats').then((data) => {
        if (!active) return;
        setLayout(data);
        setSelected((current) => current.filter((seat) => data.some((item) => item.seat === seat && item.available)));
      }).catch((problem) => { if (active) setError(problem.message); });
    }
    refresh();
    const interval = setInterval(refresh, 12000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [trip.id]);

  async function checkout(event) {
    event.preventDefault();
    if (!user) {
      openLogin({ role: 'passenger', destination: asPath });
      return;
    }
    if (user.role !== 'passenger') {
      setError('Sign out to book as a passenger.');
      return;
    }
    setBusy(true);
    setError('');
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const { url } = await api('/checkout', { ...form, trip: trip.id, seats: selected });
      window.location.assign(url);
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
    }
  }

  return (
    <form className="bookify-panel bookify-form" onSubmit={checkout}>
      <h2>{trip.coach === 'Sleeper' ? 'Choose berths' : 'Choose seats'}</h2>
      <div className={'bookify-seats ' + (trip.coach === 'Sleeper' ? 'bookify-sleeper' : trip.coach === 'AC' ? 'bookify-ac' : '')}>
        {layout.map(({ seat, available }) => (
          <button key={seat} type="button" aria-pressed={selected.includes(seat)}
            disabled={!available || busy || (selected.length >= 6 && !selected.includes(seat))}
            onClick={() => setSelected((current) => current.includes(seat) ? current.filter((item) => item !== seat) : [...current, seat])}>
            {seat}
          </button>
        ))}
      </div>
      <label>Passenger name<input name="passenger" maxLength={100} required /></label>
      <label>Demo email<input name="contact" type="email" maxLength={150} placeholder="passenger@example.com" required /></label>
      {error && <p role="alert">{error}</p>}
      <p>Cancel before {dhakaTime(trip.departure)} (Dhaka time) for {selected.length ? money(trip.fare * selected.length) + ' back' : 'a full refund'}. Passenger cancellations close at departure.</p>
      <button className="booking-lookup-btn" disabled={!selected.length || busy || !ready}>
        {busy ? 'Opening Stripe…' : !user ? 'Sign in to book' : 'Pay ' + money(trip.fare * selected.length) + ' with Stripe (test)'}
      </button>
      <p>Seats are held for 10 minutes when checkout starts.</p>
    </form>
  );
}

export default function SearchPage({ today }) {
  const router = useRouter();
  const params = new URLSearchParams(router.asPath.split("?")[1]?.split("#")[0] || "");
  const [trips, setTrips] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [coachOverride, setCoach] = useState(null);
  const coach = coachOverride ?? ({ sleeper: 'Sleeper', executive: 'AC', 'non-ac': 'Non-AC' }[params.get('class')] || '');
  const [sort, setSort] = useState('time');
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const date = params.get('date') || '';
  const period = params.get('time');

  useEffect(() => {
    const query = new URLSearchParams();
    for (const [key, data] of Object.entries({ from, to, date, coach })) if (data) query.set(key, data);
    let active = true;
    setLoading(true);
    setError('');
    setSelected(null);
    api('/trips?' + query).then((data) => { if (active) setTrips(data); })
      .catch((problem) => { if (active) setError(problem.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router.isReady, from, to, date, coach]);

  const startHour = { morning: 6, afternoon: 12, evening: 18 }[period];
  const visible = trips.filter((trip) => {
    if (startHour === undefined) return true;
    const hour = (new Date(trip.departure).getUTCHours() + 6) % 24;
    return hour >= startHour && hour < startHour + 6;
  });
  if (sort === 'price') visible.sort((a, b) => a.fare - b.fare);
  return (
    <div className="page-container search-page full-width-screen">
      <div className="search-header-container">
        <h1 className="search-page-title">Bus search results</h1>
        <SearchWidget compact key={params.toString()} initialFrom={from} initialTo={to} initialDate={date || today} initialClass={params.get('class') || 'all'} initialTime={period || 'all'} />
      </div>
      <div className="search-layout-grid">
        <aside className="search-filters-sidebar bookify-form">
          <label>Coach class<select value={coach} onChange={(event) => setCoach(event.target.value)}>
            <option value="">All classes</option><option>AC</option><option>Non-AC</option><option>Sleeper</option>
          </select></label>
          <label>Sort by<select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="time">Earliest departure</option><option value="price">Lowest fare</option>
          </select></label>
        </aside>
        <section className="bookify-stack" aria-label="Departures">
          {loading && <p role="status">Loading departures…</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && visible.length === 0 && <p>No matching departures. <Link href="/search">Show all trips</Link></p>}
          {!loading && !error && visible.map((trip) => (
            <article className="bus-card-container bookify-panel" key={trip.id}>
              {trip.image && <img className="bookify-coach-image" src={trip.image} alt="" loading="lazy" />}
              <h2>{trip.bus_name}</h2><p>{trip.vendor} · {trip.coach}</p>
              <p>{trip.origin} → {trip.destination}</p>
              <p>{dhakaTime(trip.departure)} → {dhakaTime(trip.arrival)}</p>
              <p>Board at {trip.boarding} · Drop off at {trip.dropping}</p>
              <button className="bus-select-seats-btn" onClick={() => setSelected(selected?.id === trip.id ? null : trip)}>
                {selected?.id === trip.id ? 'Close seat picker' : 'Choose seats · ' + money(trip.fare)}
              </button>
            </article>
          ))}
        </section>
        <aside>{selected && <Reservation key={selected.id} trip={selected} />}</aside>
      </div>
    </div>
  );
}
