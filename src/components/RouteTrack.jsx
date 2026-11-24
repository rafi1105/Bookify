import { useEffect, useRef } from 'react';
import { Bus, Car, TriangleAlert } from 'lucide-react';
import { formatTime, formatDuration } from '../lib/format.js';
import { formatRemaining, useNow } from '../lib/useNow.js';

// Places an element at a percentage along the line through a CSS variable, so no inline style attribute is needed.
function At({ pct, className, title, children }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.style.setProperty('--at', String(pct)); }, [pct]);
  return <span ref={ref} className={className} title={title}>{children}</span>;
}

const clamp = (n) => Math.min(100, Math.max(0, n));
const MIN = 60000;

// Where the bus is, from the trip schedule on the simulation clock: time since it left, minus the time it
// spent stopped in traffic, over the scheduled journey time. Not GPS. An accident or breakdown reported by
// the operator or admin stops the bus where it was when reported.
export default function RouteTrack({ trip, state, conditionAt, conditionNote }) {
  const { now } = useNow() || { now: null };
  if (now === null) return <div className="route-track" aria-hidden="true" />;

  const halted = state === 'ACCIDENT' || state === 'BREAKDOWN';
  const at = halted && conditionAt ? Math.min(now, Math.max(new Date(conditionAt).getTime(), new Date(trip.departure_at).getTime())) : now;
  const dep = new Date(trip.departure_at).getTime();
  const base = trip.duration_min * MIN;
  const traffic = trip.traffic_delay_min || 0;
  const prior = trip.jam_prior_min || 0;
  const jamStart = trip.jam_started_at ? new Date(trip.jam_started_at).getTime() : null;
  const window = Math.max(0, traffic - prior) * MIN;
  const stopped = jamStart === null ? 0 : prior * MIN + Math.min(Math.max(at - jamStart, 0), window);
  const pct = clamp(((at - dep - stopped) / base) * 100);
  const jamLeft = jamStart !== null && !halted ? jamStart + window - now : 0;
  const jamming = jamLeft > 0;
  const total = (trip.dep_delay_min || 0) + traffic;
  const stops = (trip.stops || []).map((s) => ({ ...s, pct: clamp((s.minutes / trip.duration_min) * 100) }));
  const left = Math.max(0, new Date(trip.arrival_at).getTime() - now);
  const mode = halted ? 'halted' : jamming ? 'jam' : 'moving';
  const eta = halted ? 'Arrival time unknown while the bus is stopped'
    : `Arrives about ${formatTime(trip.arrival_at)}${total > 0 ? ` (scheduled ${formatTime(trip.scheduled_arrival_at)})` : ''}${left ? ` · ${formatRemaining(left)} to go` : ''}`;

  return (
    <div className={`route-track route-${mode}`} role="img"
      aria-label={`${trip.origin} to ${trip.destination}, ${Math.round(pct)} percent of the scheduled journey${halted ? ', stopped' : jamming ? ', stuck in a traffic jam' : ''}`}>
      <div className="route-line">
        <At pct={pct} className="route-done" />
        <At pct={0} className="route-dot route-dot-end" />
        {stops.map((s) => <At key={`${s.name}-${s.minutes}`} pct={s.pct} title={s.name} className={`route-dot${s.pct <= pct ? ' route-dot-passed' : ''}`} />)}
        <At pct={100} className="route-dot route-dot-end" />
        {jamming && (
          <At pct={pct} className="route-queue" title="Traffic jam">
            <Car size={18} aria-hidden="true" /><Car size={18} aria-hidden="true" /><Car size={18} aria-hidden="true" />
          </At>
        )}
        <At pct={pct} className="route-bus">
          {halted ? <TriangleAlert size={16} aria-hidden="true" /> : <Bus size={16} aria-hidden="true" />}
        </At>
      </div>
      <div className="route-names small">
        <span>{trip.origin}</span>
        <span>{trip.destination}</span>
      </div>
      <div className="row-between small muted route-meta">
        <span>Left {formatTime(trip.departure_at)} · {Math.round(pct)}%</span>
        <span>{eta}</span>
      </div>
      {(halted || jamming || total > 0) && (
        <div className={`small fleet-note${jamming || halted ? ' fleet-note-alert' : ''}`}>
          {halted ? `${state === 'ACCIDENT' ? 'Accident' : 'Breakdown'} reported${conditionNote ? `: ${conditionNote}` : ''}`
            : jamming ? `Traffic jam, +${formatDuration(traffic - prior)} delay · clears in ${formatRemaining(jamLeft)}${trip.delay_note ? ` · ${trip.delay_note}` : ''}`
            : trip.dep_delay_min > 0 ? `Left ${formatDuration(trip.dep_delay_min)} late: the bus had not yet arrived from its previous trip`
            : `Delayed ${formatDuration(traffic)} by traffic`}
        </div>
      )}
    </div>
  );
}
