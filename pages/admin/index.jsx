import Link from 'next/link';
import { useState } from 'react';
import AdminShell from '../../src/components/AdminShell.jsx';
import ReportView from '../../src/components/ReportView.jsx';
import { ErrorState, Field, Skeleton, Stat } from '../../src/components/ui.jsx';
import { addDays, dhakaToday } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';

export default function AdminHome() {
  const [range, setRange] = useState({ from: addDays(dhakaToday(), -29), to: addDays(dhakaToday(), 30) });
  const { loading, error, data, reload } = useApi(range.from <= range.to ? `/api/admin/overview?from=${range.from}&to=${range.to}` : null);
  return (
    <AdminShell title="Overview" subtitle="Everything that needs attention, and sales across all operators.">
      {loading ? <Skeleton lines={5} /> : error ? <ErrorState error={error} onRetry={reload} /> : data && (
        <>
          <div className="grid-stats">
            <Link href="/admin/approvals"><Stat label="Route requests awaiting approval" value={data.pendingRoutes} /></Link>
            <Link href="/admin/refunds"><Stat label="Refunds to process" value={data.pendingRefunds} /></Link>
            <Link href="/admin/trips"><Stat label="Upcoming trips" value={data.upcomingTrips} /></Link>
          </div>
          <div className="row">
            <Field label="Report from" id="o-from"><input id="o-from" type="date" className="input" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></Field>
            <Field label="to" id="o-to"><input id="o-to" type="date" className="input" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></Field>
          </div>
          <ReportView data={data.report} />
        </>
      )}
    </AdminShell>
  );
}
