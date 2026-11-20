import React, { useState, useId } from 'react';
import { useRouter } from 'next/router';
import { ArrowRightLeft, Search } from 'lucide-react';
import { CITY_OPTIONS } from './CitySelect';

const dhakaDate = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Dhaka' }).format(new Date());

export default function SearchWidget({
  compact = false, initialFrom = '', initialTo = '', initialDate = '', initialClass = 'all', initialTime = 'all',
}) {
  const { push: navigate } = useRouter();
  const cities = useId();
  const [from, setFrom] = useState(initialFrom || 'Dhaka');
  const [to, setTo] = useState(initialTo || 'Chattogram');
  const [date, setDate] = useState(initialDate || dhakaDate());
  const [coach, setCoach] = useState(initialClass);
  const [time, setTime] = useState(initialTime);
  const [error, setError] = useState('');

  function submit(event) {
    event.preventDefault();
    if (!from.trim() || !to.trim() || from.trim().toLowerCase() === to.trim().toLowerCase()) {
      setError('Choose a different departure and destination city.');
      return;
    }
    setError('');
    navigate('/search?' + new URLSearchParams({ from: from.trim(), to: to.trim(), date, class: coach, time }));
  }

  return (
    <form className={'booking-search-form' + (compact ? ' booking-search-compact' : '')} onSubmit={submit}>
      <div className="booking-search-fields">
        <datalist id={cities}>{CITY_OPTIONS.map(({ city }) => <option key={city} value={city} />)}</datalist>
        <label>From<input list={cities} value={from} onChange={(event) => setFrom(event.target.value)} maxLength={100} required /></label>
        <button className="booking-swap" type="button" aria-label="Swap departure and destination" onClick={() => { setFrom(to); setTo(from); }}>
          <ArrowRightLeft size={18} />
        </button>
        <label>To<input list={cities} value={to} onChange={(event) => setTo(event.target.value)} maxLength={100} required /></label>
        <label>Travel date<input type="date" value={date} min={dhakaDate()} onChange={(event) => setDate(event.target.value)} required /></label>
        <button className="booking-primary" type="submit"><Search size={18} /> Search buses</button>
      </div>
      <div className="booking-search-options">
        <label>Coach class<select value={coach} onChange={(event) => setCoach(event.target.value)}>
          <option value="all">Any class</option><option value="executive">AC</option><option value="non-ac">Non-AC</option><option value="sleeper">Sleeper</option>
        </select></label>
        <label>Departure time<select value={time} onChange={(event) => setTime(event.target.value)}>
          <option value="all">Any time</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option>
        </select></label>
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
