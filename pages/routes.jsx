import Head from 'next/head';
import Link from 'next/link';
import { ArrowRight, Route as RouteIcon } from 'lucide-react';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '../src/components/ui.jsx';
import { useApi } from '../src/lib/useApi.js';
import { dhakaToday, formatBDT, formatDuration } from '../src/lib/format.js';

export default function Routes() {
  const { loading, error, data, reload } = useApi('/api/popular-routes?limit=24', { auth: false });
  const tomorrow = dhakaToday(1);
  return (
    <>
      <Head><title>Bus routes · Bookify</title></Head>
      <PageHeader title="Bus routes" subtitle="Every route with buses on sale in the next 30 days." />
      <div className="container">
        {loading ? <div className="grid-cards">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="card card-pad"><Skeleton lines={3} /></div>)}</div>
          : error ? <ErrorState error={error} onRetry={reload} />
          : !data.routes.length ? <EmptyState icon={RouteIcon} title="No routes are on sale yet">Routes appear here as soon as operators publish trips.</EmptyState>
          : (
            <div className="grid-cards">
              {data.routes.map((r) => (
                <Link key={r.route_id} className="card card-pad route-card" href={{ pathname: '/search', query: { from: r.origin, to: r.destination, date: tomorrow } }}>
                  <div className="route-cities">{r.origin} <ArrowRight size={16} aria-hidden="true" /> {r.destination}</div>
                  <div className="muted small">{formatDuration(r.duration_min)}{Number(r.distance_km) > 0 ? ` · ${Number(r.distance_km)} km` : ''}</div>
                  <div className="row-between route-meta">
                    <span className="muted small">{r.upcoming_trips} trips · {r.operators} operator{r.operators === 1 ? '' : 's'}</span>
                    <span className="strong">from {formatBDT(r.lowest_fare)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </div>
    </>
  );
}
