import Link from 'next/link';
import OperatorShell from '../../src/components/OperatorShell.jsx';
import { ErrorState, Skeleton, Stat } from '../../src/components/ui.jsx';
import { useApi } from '../../src/lib/useApi.js';
import { dhakaToday, addDays, formatBDT } from '../../src/lib/format.js';

export default function OperatorHome() {
  const from = addDays(dhakaToday(), -29);
  const { loading, error, data, reload } = useApi(`/api/operator/reports?from=${from}&to=${addDays(dhakaToday(), 30)}`);
  return (
    <OperatorShell title="Overview" subtitle="Your last 30 days and the next 30 days of trips.">
      {loading ? <Skeleton lines={4} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          <div className="grid-stats">
            <Stat label="Trips" value={data.trips} hint={`${data.cancelled_trips} cancelled`} />
            <Stat label="Seats sold" value={data.seats_sold} hint={`of ${data.seats_offered} offered`} />
            <Stat label="Collected" value={formatBDT(data.captured)} />
            <Stat label="Refunded" value={formatBDT(data.refunded)} hint={`${formatBDT(data.refunds_pending)} pending`} />
            <Stat label="Net" value={formatBDT(data.net)} />
          </div>
          <div className="card card-pad stack-s">
            <h3>Next steps</h3>
            <p className="muted">1. <Link href="/operator/buses">Add your buses</Link> · 2. <Link href="/operator/routes">Request a route with your price and journey time</Link> · 3. <Link href="/operator/trips">Publish trips once it is approved</Link> · Watch your fleet in the <Link href="/operator/playground">playground</Link></p>
          </div>
        </>
      )}
    </OperatorShell>
  );
}
