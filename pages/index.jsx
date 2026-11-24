import Head from 'next/head';
import Link from 'next/link';
import { ArrowRight, Armchair, CreditCard, QrCode, ShieldCheck, Ticket } from 'lucide-react';
import SearchForm from '../src/components/SearchForm.jsx';
import { EmptyState, ErrorState, Skeleton } from '../src/components/ui.jsx';
import { useApi } from '../src/lib/useApi.js';
import { dhakaToday, formatBDT, formatDuration } from '../src/lib/format.js';

const STEPS = [
  { icon: ArrowRight, title: 'Search', text: 'Pick your cities and date to see every bus that is on sale.' },
  { icon: Armchair, title: 'Choose seats', text: 'Select seats on the real coach layout and your boarding point.' },
  { icon: CreditCard, title: 'Pay securely', text: 'Pay with bKash, Nagad, Rocket or card. Your seats are held while you pay.' },
  { icon: QrCode, title: 'Travel', text: 'Show your e-ticket and PNR at boarding. It is also saved in your account.' },
];

function PopularRoutes() {
  const { loading, error, data, reload } = useApi('/api/popular-routes?limit=8', { auth: false });
  if (loading) return <div className="grid-cards">{[0, 1, 2, 3].map((i) => <div key={i} className="card card-pad"><Skeleton lines={3} /></div>)}</div>;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.routes.length) {
    return <EmptyState icon={Ticket} title="No routes are on sale yet">Operators are being onboarded. Check back soon, or <Link href="/operator/register">register your bus company</Link>.</EmptyState>;
  }
  const tomorrow = dhakaToday(1);
  return (
    <div className="grid-cards">
      {data.routes.map((r) => (
        <Link key={r.route_id} className="card card-pad route-card" href={{ pathname: '/search', query: { from: r.origin, to: r.destination, date: tomorrow } }}>
          <div className="route-cities">{r.origin} <ArrowRight size={16} aria-hidden="true" /> {r.destination}</div>
          <div className="muted small">{formatDuration(r.duration_min)}{Number(r.distance_km) > 0 ? ` · ${Number(r.distance_km)} km` : ''}</div>
          <div className="row-between route-meta">
            <span className="muted small">{r.upcoming_trips} upcoming trips · {r.operators} operator{r.operators === 1 ? '' : 's'}</span>
            <span className="strong">from {formatBDT(r.lowest_fare)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Head><title>Bookify · Book intercity bus tickets in Bangladesh</title></Head>
      <section className="hero">
        <div className="container stack">
          <div className="stack-s hero-copy">
            <h1>Book your bus ticket in minutes</h1>
            <p>Compare operators, pick your exact seat and pay online. No queues, no counters.</p>
          </div>
          <div className="card search-card"><SearchForm /></div>
        </div>
      </section>

      <section className="container section">
        <div className="row-between section-head">
          <h2>Popular routes</h2>
          <Link href="/routes" className="row small strong">All routes <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
        <PopularRoutes />
      </section>

      <section className="container section">
        <h2 className="section-head">How Bookify works</h2>
        <div className="grid-steps">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="card card-pad stack-s">
              <span className="step-badge"><Icon size={18} aria-hidden="true" /></span>
              <h3>{i + 1}. {title}</h3>
              <p className="muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="card card-pad operator-cta row-between">
          <div className="stack-s">
            <h2>Run a bus company?</h2>
            <p className="muted">List your coaches, publish trips and see sales and passenger manifests in one dashboard.</p>
          </div>
          <Link href="/operator/register" className="btn btn-primary btn-large"><ShieldCheck size={18} aria-hidden="true" /> Register your company</Link>
        </div>
      </section>
    </>
  );
}
