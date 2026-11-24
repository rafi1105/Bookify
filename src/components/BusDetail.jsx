import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Armchair, Bus, CalendarClock, CheckCircle2, MapPin, Percent, XCircle } from 'lucide-react';
import DataTable from './DataTable.jsx';
import { EditBusModal } from './BusActions.jsx';
import SeatMap from './SeatMap.jsx';
import { Panel } from './Dashboard.jsx';
import { STATE_META } from './FleetBoard.jsx';
import { Badge, Button, ErrorState, Skeleton, Stat } from './ui.jsx';
import RouteTrack from './RouteTrack.jsx';
import { Until } from './Clock.jsx';
import { useLive } from '../lib/useLive.js';
import { useSim } from '../lib/sim.js';
import { COACH_LABEL, formatBDT, formatDateTime, formatDuration, formatTime } from '../lib/format.js';

const PHASE = { upcoming: ['Upcoming', 'info'], running: ['Running', 'warn'], completed: ['Completed', 'ok'], cancelled: ['Cancelled', 'danger'] };
const KIND = { STATUS: 'Availability', CONDITION: 'Condition' };

function Row({ label, children }) {
  return <div className="kv"><dt>{label}</dt><dd>{children}</dd></div>;
}

// Position is derived from the trip schedule (departure, journey time) and the latest status update.
// There is no GPS: the page says so.
function Position({ live, bus, updatedAt, speed }) {
  const meta = STATE_META[live?.state] || STATE_META.AVAILABLE;
  const trip = live?.currentTrip;
  const next = live?.nextTrip;
  return (
    <Panel title="Current position">
      <div className="stack-s">
        <div className="row-between"><Badge tone={meta.tone}>{meta.label}</Badge>{live?.freeAt && <span className="small"><Until at={live.freeAt} prefix="Arrives in" doneLabel="arriving" /> <span className="muted">· free {formatDateTime(live.freeAt)}</span></span>}</div>
        {trip ? (
          <div className="stack-s">
            <div className="row"><MapPin size={16} aria-hidden="true" /><strong>{trip.origin} → {trip.destination}</strong></div>
            <RouteTrack trip={trip} state={live.state} conditionAt={bus.conditionUpdatedAt} conditionNote={bus.conditionNote} />
          </div>
        ) : next ? (
          <div className="stack-s">
            <p>Parked. Next trip: <strong>{next.origin} → {next.destination}</strong>, {formatDateTime(next.departure_at)}. <Until at={next.departure_at} prefix="Departs in" /></p>
          </div>
        ) : <p className="muted">Parked, with no trips scheduled.</p>}
        {next && next.dep_delay_min > 0 && <p className="fleet-note fleet-note-alert">Next trip {next.origin} → {next.destination} is delayed {formatDuration(next.dep_delay_min)}: now departs {formatTime(next.departure_at)} (scheduled {formatTime(next.scheduled_departure_at)}){next.waiting_for_bus ? '. The bus has not yet arrived from its previous trip' : ''}.</p>}
        {bus.condition !== 'NORMAL' && !trip && <p className="fleet-note">{bus.conditionNote || 'No details given'} <span className="muted">· updated {bus.conditionUpdatedAt ? formatDateTime(bus.conditionUpdatedAt) : ''}</span></p>}
        <p className="muted small">Position comes from the trip&apos;s departure time and journey time plus the latest status update by the operator or an admin. There is no GPS tracking. Refreshes every {speed > 1 ? `5 seconds (simulation ${speed}x)` : 'minute'}{updatedAt ? `, last updated ${updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}.</p>
      </div>
    </Panel>
  );
}

export default function BusDetail({ endpoint, backHref, backLabel, patchUrl }) {
  const sim = useSim();
  const { loading, error, data, reload, updatedAt } = useLive(endpoint, { interval: sim.speed > 1 ? 5000 : 60000 });
  const [editing, setEditing] = useState(false);
  const columns = useMemo(() => [
    { key: 'dep', label: 'Departure', sort: (t) => t.departureAt, className: 'nowrap', render: (t) => <>{formatDateTime(t.departureAt)}{t.depDelayMin > 0 && <div className="small muted">scheduled {formatTime(t.scheduledDepartureAt)}</div>}</> },
    { key: 'route', label: 'Route', sort: (t) => `${t.origin} ${t.destination}`, render: (t) => <strong>{t.origin} → {t.destination}</strong> },
    { key: 'dur', label: 'Journey', render: (t) => formatDuration(Math.round((new Date(t.arrivalAt) - new Date(t.departureAt)) / 60000)) },
    { key: 'sold', label: 'Seats sold', sort: (t) => t.sold, render: (t) => t.sold },
    { key: 'fare', label: 'Fare', sort: (t) => t.fare, render: (t) => formatBDT(t.fare) },
    { key: 'phase', label: 'Status', sort: (t) => t.phase, render: (t) => <><Badge tone={PHASE[t.phase][1]}>{PHASE[t.phase][0]}</Badge>{t.phase !== 'cancelled' && t.depDelayMin + t.trafficDelayMin > 0 && <div className="small delay-text">{t.depDelayMin > 0 && t.phase === 'upcoming' ? `Delayed ${formatDuration(t.depDelayMin)}: bus not yet arrived from previous trip` : `Delayed ${formatDuration(t.depDelayMin + t.trafficDelayMin)}${t.delayCause === 'TRAFFIC' ? ' by traffic' : ''}`}</div>}</> },
  ], []);
  const filters = useMemo(() => [{ key: 'phase', label: 'Status', options: Object.entries(PHASE).map(([k, v]) => [k, v[0]]), match: (t, v) => t.phase === v }], []);

  if (loading) return <Skeleton lines={8} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const { bus, live, totals, trips, events } = data;

  return (
    <div className="stack">
      <div className="row-between">
        <Link href={backHref} className="back-link"><ArrowLeft size={16} aria-hidden="true" /> {backLabel}</Link>
        <Button variant="secondary" size="small" onClick={() => setEditing(true)}>Edit details</Button>
      </div>

      <div className="kpi-row">
        <Stat icon={CalendarClock} tone="info" label="Trips" value={totals.trips} hint={`${totals.upcoming} upcoming`} />
        <Stat icon={CheckCircle2} tone="ok" label="Completed" value={totals.completed} hint="Journeys finished" />
        <Stat icon={XCircle} tone="danger" label="Cancelled" value={totals.cancelled} />
        <Stat icon={Armchair} tone="brand" label="Seats sold" value={totals.seatsSold} hint="All trips" />
        <Stat icon={Percent} tone="warn" label="Occupancy" value={totals.occupancy == null ? '—' : `${totals.occupancy}%`} hint="Completed trips" />
      </div>

      <div className="dash-grid">
        <div className="stack">
          <Position live={live} bus={bus} updatedAt={updatedAt} speed={sim.speed} />
          <Panel title="Trip history" flush>
            {!trips.length ? <p className="panel-empty muted">This bus has no trips yet.</p> : (
              <DataTable rows={trips} columns={columns} filters={filters} dateField={(t) => t.departureAt} pageSize={10}
                searchText={(t) => `${t.origin} ${t.destination}`} searchPlaceholder="Search route" initialSort={{ key: 'dep', dir: 'desc' }} />
            )}
          </Panel>
          <Panel title="Status history">
            {!events.length ? <p className="muted">No availability or condition changes have been recorded.</p> : (
              <ul className="timeline">
                {events.map((e) => (
                  <li key={e.id}><span className="timeline-dot" aria-hidden="true" />
                    <div><div><strong>{KIND[e.kind] || e.kind}</strong> set to {String(e.value).replace(/_/g, ' ').toLowerCase()}{e.note ? `: ${e.note}` : ''}</div>
                      <div className="muted small">{formatDateTime(e.at)}{e.by ? ` · ${e.by}` : ''}</div></div></li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <div className="stack">
          <Panel title="Bus details">
            {bus.imageUrl ? <img className="detail-img" src={bus.imageUrl} alt={`${bus.name} ${bus.code}`} referrerPolicy="no-referrer" /> : <div className="detail-img detail-img-empty"><Bus size={36} aria-hidden="true" /></div>}
            <dl className="kv-list">
              <Row label="Bus code"><code className="code">{bus.code}</code></Row>
              <Row label="Coach name">{bus.name}</Row>
              <Row label="Registration"><strong>{bus.regNo}</strong></Row>
              <Row label="Model">{bus.modelNo}</Row>
              <Row label="Class">{COACH_LABEL[bus.busType]}</Row>
              <Row label="Seats">{bus.capacity}</Row>
              {bus.operator && <Row label="Operator">{bus.operator}</Row>}
              <Row label="Availability"><Badge tone={bus.status === 'ACTIVE' ? 'ok' : 'danger'}>{bus.status === 'ACTIVE' ? 'Available' : bus.status === 'OFF_DUTY' ? 'Off duty' : bus.status}</Badge></Row>
              <Row label="Added">{formatDateTime(bus.createdAt)}</Row>
              {bus.amenities.length > 0 && <Row label="Amenities"><span className="row">{bus.amenities.map((a) => <Badge key={a}>{a}</Badge>)}</span></Row>}
            </dl>
          </Panel>
          <Panel title="Seat layout"><SeatMap layout={bus.layout} readOnly /></Panel>
        </div>
      </div>
      {editing && <EditBusModal bus={{ ...bus, reg_no: bus.regNo, model_no: bus.modelNo, image_url: bus.imageUrl }} patchUrl={patchUrl} onClose={() => setEditing(false)} onDone={() => { setEditing(false); reload(); }} />}
    </div>
  );
}
