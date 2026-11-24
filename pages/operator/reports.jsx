import Link from 'next/link';
import { useState } from 'react';
import OperatorShell from '../../src/components/OperatorShell.jsx';
import ReportView from '../../src/components/ReportView.jsx';
import { ErrorState, Field, Skeleton } from '../../src/components/ui.jsx';
import { addDays, dhakaToday } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';

export default function OperatorReports() {
  const [range, setRange] = useState({ from: addDays(dhakaToday(), -29), to: dhakaToday() });
  const { loading, error, data, reload } = useApi(range.from && range.to && range.from <= range.to ? `/api/operator/reports?from=${range.from}&to=${range.to}` : null);
  return (
    <OperatorShell title="Sales reports" subtitle="By departure date, Bangladesh time. Only paid bookings count as sold." actions={<Link className="btn btn-secondary" href="/operator/bookings">View booking history</Link>}>
      <div className="row">
        <Field label="From" id="rf"><input id="rf" type="date" className="input" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></Field>
        <Field label="To" id="rt"><input id="rt" type="date" className="input" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></Field>
      </div>
      {loading ? <Skeleton lines={6} /> : error ? <ErrorState error={error} onRetry={reload} /> : data ? <ReportView data={data} /> : null}
    </OperatorShell>
  );
}
