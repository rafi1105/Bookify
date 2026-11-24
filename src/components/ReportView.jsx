import { Armchair, Banknote, CalendarClock, RotateCcw, TrendingUp } from 'lucide-react';
import { Stat } from './ui.jsx';
import { formatBDT } from '../lib/format.js';

export default function ReportView({ data }) {
  return (
    <div className="stack">
      <div className="kpi-row">
        <Stat icon={CalendarClock} tone="info" label="Trips run" value={data.trips} hint={`${data.cancelled_trips} cancelled`} />
        <Stat icon={Armchair} tone="brand" label="Seats sold" value={data.seats_sold} hint={`of ${data.seats_offered} offered (${data.seats_offered ? Math.round((data.seats_sold / data.seats_offered) * 100) : 0}% occupancy)`} />
        <Stat icon={Banknote} tone="ok" label="Collected" value={formatBDT(data.captured)} />
        <Stat icon={RotateCcw} tone="warn" label="Refunded" value={formatBDT(data.refunded)} hint={`${formatBDT(data.refunds_pending)} pending`} />
        <Stat icon={TrendingUp} tone="brand" label="Net" value={formatBDT(data.net)} />
      </div>
      <div className="grid-two">
        <div className="card table-wrap"><table className="table"><caption className="table-caption">By route</caption>
          <thead><tr><th>Route</th><th>Trips</th><th>Seats</th><th className="right">Revenue</th></tr></thead>
          <tbody>{data.by_route.length ? data.by_route.map((r) => <tr key={r.route}><td>{r.route}</td><td>{r.trips}</td><td>{r.seats_sold}</td><td className="right">{formatBDT(r.revenue)}</td></tr>) : <tr><td colSpan="4" className="muted">No trips in this period.</td></tr>}</tbody></table></div>
        <div className="card table-wrap"><table className="table"><caption className="table-caption">By day</caption>
          <thead><tr><th>Date</th><th>Trips</th><th>Seats</th><th className="right">Revenue</th></tr></thead>
          <tbody>{data.by_day.length ? data.by_day.map((r) => <tr key={r.day}><td>{r.day}</td><td>{r.trips}</td><td>{r.seats_sold}</td><td className="right">{formatBDT(r.revenue)}</td></tr>) : <tr><td colSpan="4" className="muted">No trips in this period.</td></tr>}</tbody></table></div>
      </div>
    </div>
  );
}
