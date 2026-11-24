import Link from 'next/link';
import { useState } from 'react';
import { Bus, ClipboardCheck, RotateCcw, CalendarClock, Users } from 'lucide-react';
import AdminShell from '../../src/components/AdminShell.jsx';
import ReportView from '../../src/components/ReportView.jsx';
import { Activity, Departures, FleetSummary, Panel } from '../../src/components/Dashboard.jsx';
import { Badge, ErrorState, Field, Skeleton, Stat } from '../../src/components/ui.jsx';
import { COACH_LABEL, addDays, dhakaToday, formatBDT, formatDateTime } from '../../src/lib/format.js';
import { useApi } from '../../src/lib/useApi.js';

export default function AdminHome() {
  const [range, setRange] = useState({ from: addDays(dhakaToday(), -29), to: addDays(dhakaToday(), 30) });
  const { loading, error, data, reload } = useApi(range.from <= range.to ? `/api/admin/overview?from=${range.from}&to=${range.to}` : null);
  return (
    <AdminShell title="Overview" subtitle="Everything that needs attention, and sales across all operators.">
      {loading ? <Skeleton lines={8} /> : error ? <ErrorState error={error} onRetry={reload} /> : data && (
        <>
          <div className="kpi-row">
            <Link href="/admin/approvals"><Stat icon={ClipboardCheck} tone={data.pendingRoutes ? 'warn' : 'ok'} label="Route requests" value={data.pendingRoutes} hint="Waiting for approval" /></Link>
            <Link href="/admin/refunds"><Stat icon={RotateCcw} tone={data.pendingRefunds ? 'warn' : 'ok'} label="Refunds" value={data.pendingRefunds} hint="To process" /></Link>
            <Link href="/admin/trips"><Stat icon={CalendarClock} tone="info" label="Upcoming trips" value={data.upcomingTrips} hint="Scheduled departures" /></Link>
            <Link href="/admin/operators"><Stat icon={Users} tone="brand" label="Operators" value={data.operators} hint="Registered companies" /></Link>
            <Link href="/admin/fleet"><Stat icon={Bus} tone="brand" label="Buses" value={data.buses} hint="Across all operators" /></Link>
          </div>
          <div className="dash-grid">
            <div className="stack">
              <Panel title="Route requests to review" href="/admin/approvals" flush>
                {!data.pendingList.length ? <p className="panel-empty muted">Nothing is waiting for approval.</p> : (
                  <table className="table">
                    <thead><tr><th>Operator</th><th>Route</th><th>Class</th><th className="right">Proposed</th></tr></thead>
                    <tbody>{data.pendingList.map((p) => (
                      <tr key={p.id}><td><strong>{p.vendors?.company_name}</strong><div className="muted small">{formatDateTime(p.created_at)}</div></td><td>{p.origin} → {p.destination}</td><td><Badge>{COACH_LABEL[p.bus_type]}</Badge></td><td className="right">{formatBDT(p.proposed_fare)}</td></tr>
                    ))}</tbody>
                  </table>
                )}
              </Panel>
              <Departures trips={data.upcoming} href="/admin/trips" showOperator />
            </div>
            <div className="stack">
              <FleetSummary fleet={data.fleet} href="/admin/fleet" />
              <Activity items={data.activity} />
            </div>
          </div>
          <Panel title="Sales" href="/admin/bookings" linkLabel="View bookings">
            <div className="row">
              <Field label="From" id="o-from"><input id="o-from" type="date" className="input" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></Field>
              <Field label="To" id="o-to"><input id="o-to" type="date" className="input" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></Field>
            </div>
          </Panel>
          <ReportView data={data.report} />
        </>
      )}
    </AdminShell>
  );
}
