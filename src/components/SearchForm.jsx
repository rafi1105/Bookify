import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ArrowLeftRight, CalendarDays, MapPin, Search } from 'lucide-react';
import { Button } from './ui.jsx';
import { api } from '../lib/api.js';
import { dhakaToday } from '../lib/format.js';

export default function SearchForm({ initial = {}, compact = false }) {
  const router = useRouter();
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({ from: initial.from || '', to: initial.to || '', date: initial.date || dhakaToday() });
  const [error, setError] = useState('');
  const min = dhakaToday();
  const max = dhakaToday(90);

  useEffect(() => { setForm((f) => ({ from: initial.from || f.from, to: initial.to || f.to, date: initial.date || f.date })); }, [initial.from, initial.to, initial.date]);
  useEffect(() => { api('/api/cities', { auth: false }).then((r) => setCities(r.cities)).catch(() => {}); }, []);

  function submit(event) {
    event.preventDefault();
    const from = form.from.trim();
    const to = form.to.trim();
    if (!from || !to) return setError('Choose where you are leaving from and going to.');
    if (from.toLowerCase() === to.toLowerCase()) return setError('Origin and destination must be different.');
    if (!form.date || form.date < min) return setError('Choose today or a later date.');
    setError('');
    router.push({ pathname: '/search', query: { from, to, date: form.date } });
  }

  return (
    <form className={`search-form ${compact ? 'search-form-compact' : ''}`} onSubmit={submit} noValidate>
      <div className="search-fields">
        <label className="search-field">
          <span className="search-label"><MapPin size={14} aria-hidden="true" /> From</span>
          <input className="search-input" list="bookify-cities" placeholder="Leaving from" autoComplete="off" value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })} />
        </label>
        <button type="button" className="search-swap" aria-label="Swap origin and destination" onClick={() => setForm({ ...form, from: form.to, to: form.from })}>
          <ArrowLeftRight size={16} aria-hidden="true" />
        </button>
        <label className="search-field">
          <span className="search-label"><MapPin size={14} aria-hidden="true" /> To</span>
          <input className="search-input" list="bookify-cities" placeholder="Going to" autoComplete="off" value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })} />
        </label>
        <label className="search-field">
          <span className="search-label"><CalendarDays size={14} aria-hidden="true" /> Journey date</span>
          <input className="search-input" type="date" min={min} max={max} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
        <Button type="submit" size="large" className="search-submit"><Search size={18} aria-hidden="true" /> Search buses</Button>
      </div>
      <datalist id="bookify-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
      {error && <p className="field-error" role="alert">{error}</p>}
    </form>
  );
}
