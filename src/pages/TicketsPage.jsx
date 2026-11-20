import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, dhakaTime, money } from '../lib/bookifyApi';

const statuses = { held: 'Awaiting payment', confirmed: 'Confirmed', refund_required: 'Refund pending', refunded: 'Refunded' };

export default function TicketsPage() {
  const [query] = useSearchParams();
  const payment = query.get('payment');
  const [user, setUser] = useState(undefined);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/session').then((data) => setUser(data.user)).catch((problem) => { setError(problem.message); setUser(null); });
  }, []);

  useEffect(() => {
    if (user?.role !== 'passenger') return undefined;
    let active = true;
    function refresh() {
      api('/bookings').then((data) => { if (active) setOrders(data); })
        .catch((problem) => { if (active) setError(problem.message); });
    }
    refresh();
    const timer = setInterval(refresh, 6000);
    return () => { active = false; clearInterval(timer); };
  }, [user]);

  async function act(path, body) {
    setBusy(true);
    setError('');
    try {
      const data = await api(path, body);
      if (path === '/session') setUser(data.user);
      else setOrders(await api('/bookings'));
    } catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="page-container bookify-stack">
      <div className="page-header">
        <h1 className="page-title">My bookings</h1>
        <p><Link to="/search">Find a bus</Link> · <Link to="/demo-tracker">Simulated bus tracker</Link></p>
      </div>
      {error && <p role="alert">{error}</p>}
      {payment === 'processing' && <p role="status">Stripe payment status updates below after verification.</p>}
      {payment === 'cancelled' && <p>Checkout closed. Any unused seat hold expires automatically.</p>}
      {user === undefined && <p>Loading session…</p>}
      {user !== undefined && user?.role !== 'passenger' && (
        <button className="booking-lookup-btn" disabled={busy} onClick={() => act('/session', { role: 'passenger' })}>Passenger demo login</button>
      )}
      {user?.role === 'passenger' && !orders.length && <p>Your tickets appear here after checkout.</p>}
      {user?.role === 'passenger' && orders.map((order) => {
        const trip = order.bookify_trips;
        const expired = order.state === 'held' && Date.parse(order.expires) <= Date.now();
        const cancelled = trip.cancelled && order.state === 'confirmed';
        const activeTicket = order.state === 'confirmed' && !cancelled;
        return (
          <article className="bookify-panel bookify-ticket" key={order.id}>
            <h2>{trip.origin} → {trip.destination}</h2>
            <p>{cancelled ? 'Trip cancelled' : expired ? 'Seat hold expired' : statuses[order.state]}</p>
            <p>{trip.bus_name} · {trip.vendor} · {trip.coach}</p>
            <p>Departure {dhakaTime(trip.departure)} · Arrival {dhakaTime(trip.arrival)}</p>
            <p>Board at {trip.boarding} · Drop off at {trip.dropping}</p>
            <p>{order.passenger} · Seats {order.seats.join(', ')} · {money(order.total)}</p>
            {activeTicket && <p>Ticket reference <strong>{order.id}</strong></p>}
            <div className="bookify-actions">
              {activeTicket && <button type="button" onClick={(event) => {
                const ticket = event.currentTarget.closest('.bookify-ticket');
                ticket.classList.add('bookify-print-ticket');
                try { window.print(); } finally { ticket.classList.remove('bookify-print-ticket'); }
              }}>Print / Save PDF</button>}
              {((activeTicket && Date.parse(trip.departure) > Date.now()) || order.state === 'refund_required') &&
                <button disabled={busy} onClick={() => {
                  if (order.state === 'refund_required' || window.confirm('Cancel this ticket and request a refund?')) act('/bookings/' + order.id + '/cancel', {});
                }}>{order.state === 'refund_required' ? 'Retry refund' : 'Cancel and refund'}</button>}
            </div>
            {activeTicket && Date.parse(trip.arrival) <= Date.now() && (
              <form className="bookify-form" onSubmit={(event) => {
                event.preventDefault();
                act('/bookings/' + order.id + '/review', Object.fromEntries(new FormData(event.currentTarget)));
              }}>
                <label>Rate this coach<select name="rating">{[5, 4, 3, 2, 1].map((number) => <option key={number}>{number}</option>)}</select></label>
                <button disabled={busy}>Save rating</button>
              </form>
            )}
          </article>
        );
      })}
    </section>
  );
}
