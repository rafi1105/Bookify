import { Armchair, Banknote, CalendarClock, RotateCcw, TrendingUp } from 'lucide-react';
import OperatorShell from '../../src/components/OperatorShell.jsx';
import { Activity, Departures, FleetSummary, SetupChecklist } from '../../src/components/Dashboard.jsx';
import { ErrorState, Skeleton, Stat } from '../../src/components/ui.jsx';
import { useApi } from '../../src/lib/useApi.js';
import { dhakaToday, addDays, formatBDT } from '../../src/lib/format.js';

export default function OperatorHome() {
  const from = addDays(dhakaToday(), -29);
  const to = addDays(dhakaToday(), 30);
  const report = useApi(`/api/operator/reports?from=${from}&to=${to}`);
  const overview = useApi('/api/operator/overview');
  const loading = report.loading || overview.loading;
  const error = report.error || overview.error;
  const r = report.data;
  const o = overview.data;
  const occupancy = r && r.seats_offered ? Math.round((r.seats_sold / r.seats_offered) * 100) : 0;
  const c = o?.checklist;
  const steps = c && [
    { label: 'Add your buses', hint: c.buses ? `${c.buses} bus${c.buses === 1 ? '' : 'es'} in your fleet` : 'Add a bus with its seat layout', href: '/operator/buses', done: c.buses > 0 },
    { label: 'Request a route', hint: c.requested ? `${c.requested} request${c.requested === 1 ? '' : 's'} sent` : 'Propose a route with your price and journey time', href: '/operator/routes', done: c.requested > 0 },
    { label: 'Get a route approved', hint: c.approved ? `${c.approved} approved` : 'The admin reviews your request and may adjust the fare or time', href: '/operator/routes', done: c.approved > 0 },
    { label: 'Publish trips', hint: c.upcomingTrips ? `${c.upcomingTrips} upcoming trips on sale` : 'Put a bus on an approved route', href: '/operator/trips', done: c.upcomingTrips > 0 },
    { label: 'Sell your first seat', hint: r?.seats_sold ? `${r.seats_sold} seats sold` : 'Passengers can now find and book your trips', href: '/operator/reports', done: Boolean(r?.seats_sold) },
  ];
  return (
    <OperatorShell title="Overview" subtitle="Last 30 days and the next 30 days of trips.">
      {loading ? <Skeleton lines={8} /> : error ? <ErrorState error={error} onRetry={() => { report.reload(); overview.reload(); }} /> : (
        <>
          <div className="kpi-row">
            <Stat icon={CalendarClock} tone="info" label="Trips" value={r.trips} hint={`${r.cancelled_trips} cancelled`} />
            <Stat icon={Armchair} tone="brand" label="Seats sold" value={r.seats_sold} hint={`${occupancy}% of ${r.seats_offered} offered`} />
            <Stat icon={Banknote} tone="ok" label="Collected" value={formatBDT(r.captured)} hint="Paid bookings" />
            <Stat icon={RotateCcw} tone="warn" label="Refunded" value={formatBDT(r.refunded)} hint={`${formatBDT(r.refunds_pending)} pending`} />
            <Stat icon={TrendingUp} tone="brand" label="Net" value={formatBDT(r.net)} hint="Collected minus refunds" />
          </div>
          <div className="dash-grid">
            <div className="stack">
              <Departures trips={o.upcoming} href="/operator/trips" />
              <Activity items={o.activity} />
            </div>
            <div className="stack">
              <SetupChecklist steps={steps} />
              <FleetSummary fleet={o.fleet} href="/operator/playground" />
            </div>
          </div>
        </>
      )}
    </OperatorShell>
  );
}
