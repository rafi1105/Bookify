import Link from 'next/link';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { Badge, EmptyState } from './ui.jsx';
import { STATE_META } from './FleetBoard.jsx';
import { formatBDT, formatDateTime } from '../lib/format.js';

// Card with a header row and an optional "view all" link.
export function Panel({ title, href, linkLabel = 'View all', children, flush = false }) {
  return (
    <section className="card panel">
      <header className="panel-head">
        <h2 className="panel-title">{title}</h2>
        {href && <Link href={href} className="panel-link">{linkLabel} <ArrowRight size={14} aria-hidden="true" /></Link>}
      </header>
      <div className={flush ? 'panel-body-flush' : 'panel-body'}>{children}</div>
    </section>
  );
}

// Setup checklist that reflects real progress: each step is done when the data exists.
export function SetupChecklist({ steps }) {
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  return (
    <Panel title="Getting started">
      <div className="checklist-progress">
        <progress className="progress" max={steps.length} value={done} aria-label={`${done} of ${steps.length} steps done`} />
        <span className="muted small">{done} of {steps.length} done</span>
      </div>
      <ol className="checklist">
        {steps.map((s) => (
          <li key={s.label} className={s.done ? 'is-done' : s === next ? 'is-next' : ''}>
            {s.done ? <CheckCircle2 size={20} aria-hidden="true" /> : <Circle size={20} aria-hidden="true" />}
            <div>
              <Link href={s.href}>{s.label}</Link>
              <div className="muted small">{s.hint}</div>
            </div>
            {s === next && <Badge tone="info">Next</Badge>}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function FleetSummary({ fleet, href }) {
  const entries = Object.entries(STATE_META).filter(([k]) => fleet.states[k]);
  return (
    <Panel title="Fleet status" href={href} linkLabel="Open playground">
      {!fleet.total ? <p className="muted">No buses yet.</p> : (
        <ul className="fleet-tiles">
          {entries.map(([k, m]) => <li key={k} className={`fleet-tile tone-${m.tone || 'neutral'}`}><strong>{fleet.states[k]}</strong><span>{m.label}</span></li>)}
        </ul>
      )}
    </Panel>
  );
}

export function Departures({ trips, href, showOperator = false }) {
  return (
    <Panel title="Next departures" href={href} flush>
      {!trips.length ? <EmptyState title="No upcoming trips">Published trips appear here.</EmptyState> : (
        <table className="table">
          <thead><tr><th>Departure</th><th>Route</th><th>{showOperator ? 'Operator' : 'Bus'}</th><th className="right">{showOperator ? 'Fare' : 'Seats'}</th></tr></thead>
          <tbody>{trips.map((t) => (
            <tr key={t.id}>
              <td className="nowrap">{formatDateTime(t.departureAt)}</td>
              <td><strong>{t.origin} → {t.destination}</strong></td>
              <td>{showOperator ? t.operator : t.bus}<div className="muted small">{t.regNo}</div></td>
              <td className="right">{showOperator ? formatBDT(t.fare) : <><strong>{t.sold}</strong>/{t.capacity}</>}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </Panel>
  );
}

export function Activity({ items }) {
  return (
    <Panel title="Recent activity">
      {!items.length ? <p className="muted">Nothing has happened yet.</p> : (
        <ul className="timeline">
          {items.map((a, i) => <li key={i}><span className="timeline-dot" aria-hidden="true" /><div><div>{a.text.charAt(0).toUpperCase() + a.text.slice(1)}</div><div className="muted small">{formatDateTime(a.at)}</div></div></li>)}
        </ul>
      )}
    </Panel>
  );
}
