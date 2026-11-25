import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Bus, Clock3, Copy, Gauge, Link2, MapPin, Radio, Satellite, TriangleAlert } from 'lucide-react';
import { Alert, Badge, Button, EmptyState, ErrorState, Field, Modal, Skeleton } from '../ui.jsx';
import { api } from '../../lib/api.js';
import { useLiveFeed } from '../../lib/map/useLiveFeed.js';
import { BusTracker } from '../../lib/map/movement.js';
import { TRAFFIC_SIMULATION } from '../../lib/map/config.js';
import { simNowMs, useSim } from '../../lib/sim.js';
import { formatRemaining } from '../../lib/useNow.js';
import { formatTime } from '../../lib/format.js';
import { INCIDENT } from './icons.js';

const MapCanvas = dynamic(() => import('./MapCanvas.jsx'), { ssr: false, loading: () => <div className="live-map-canvas live-map-loading"><Skeleton lines={2} /></div> });

const TONE = { ON_TIME: 'ok', LATE: 'warn', VERY_LATE: 'danger', STOPPED: 'danger' };
const ORDER = { STOPPED: 0, VERY_LATE: 1, LATE: 2, ON_TIME: 3 };

// Swatch coloured through a CSS variable (no inline style attribute).
function Swatch({ color }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.style.setProperty('--swatch', color); }, [color]);
  return <span ref={ref} className="swatch" aria-hidden="true" />;
}

function Progress({ pct }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.style.setProperty('--pct', `${Math.round(pct || 0)}%`); }, [pct]);
  return <span ref={ref} className="live-progress" role="progressbar" aria-valuenow={Math.round(pct || 0)} aria-valuemin={0} aria-valuemax={100}><span /></span>;
}

function DriverLinkModal({ bus, onClose }) {
  const [state, setState] = useState({ busy: false, error: '', url: '', qr: '' });
  const [copied, setCopied] = useState(false);
  async function create() {
    setState({ busy: true, error: '', url: '', qr: '' });
    try {
      const r = await api('/api/tracking/trackers', { method: 'POST', body: { busId: bus.id } });
      const url = `${window.location.origin}${r.path}`;
      setState({ busy: false, error: '', url, qr: await QRCode.toDataURL(url, { margin: 1, width: 220 }) });
    } catch (e) { setState({ busy: false, error: e.message, url: '', qr: '' }); }
  }
  return (
    <Modal title="Driver tracking link" subtitle={`${bus.code} · ${bus.name}`} size="sm" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button loading={state.busy} onClick={create}>{state.url || bus.tracker ? 'Create a new link' : 'Create link'}</Button></>}>
      <div className="stack">
        <p className="small">The driver opens this link on their phone and taps <strong>Start sharing</strong>. The phone then sends the bus&apos;s GPS position every few seconds, and the map shows the real position instead of the simulated one.</p>
        {bus.tracker && !state.url && <Alert kind="info">This bus already has a link{bus.tracker.lastSeenAt ? ` (last position ${formatTime(bus.tracker.lastSeenAt)})` : ''}. Creating a new link turns the old one off.</Alert>}
        {state.error && <Alert kind="error">{state.error}</Alert>}
        {state.url && (
          <div className="stack-s driver-link">
            <img src={state.qr} alt="QR code of the driver link" width={220} height={220} />
            <code className="code driver-link-url">{state.url}</code>
            <Button size="small" variant="secondary" onClick={async () => { await navigator.clipboard.writeText(state.url); setCopied(true); }}><Copy size={14} aria-hidden="true" /> {copied ? 'Copied' : 'Copy link'}</Button>
            <p className="muted small">Keep it private: anyone with the link can send this bus&apos;s position. It is shown only once.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function IncidentModal({ at, bus, onClose, onDone }) {
  const [kind, setKind] = useState('ACCIDENT');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api('/api/tracking/incidents', { method: 'POST', body: { kind, note, lat: at[0], lng: at[1], busId: bus?.id } }); onDone(); } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title="Report an incident" subtitle={bus ? `At ${bus.code}'s position` : `At ${at[0].toFixed(4)}, ${at[1].toFixed(4)}`} size="sm" onClose={onClose} onSubmit={save} submitLabel="Report" busy={busy} error={error}>
      <div className="stack">
        <Field label="What happened" id="inc-kind"><select id="inc-kind" className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
          {Object.entries(INCIDENT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        <Field label="Details" id="inc-note" hint="Optional, e.g. which lane or how long it may last."><input id="inc-note" className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function OperatorLegend({ operators, hidden, setHidden, onColor }) {
  if (!operators.length) return null;
  return (
    <section className="card card-pad stack-s" aria-label="Operators">
      <h3 className="live-h">Operators</h3>
      <ul className="legend-list">
        {operators.map((o) => (
          <li key={o.id} className="legend-row">
            <label className="checkbox"><input type="checkbox" checked={!hidden.has(o.id)} onChange={() => { const n = new Set(hidden); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); setHidden(n); }} />
              <Swatch color={o.color} /> <span>{o.name}</span></label>
            <span className="muted small">{o.onTrip}/{o.buses} on road</span>
            <input type="color" className="color-input" value={o.color} aria-label={`Bus colour for ${o.name}`} onChange={(e) => onColor(o.id, e.target.value)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BusRow({ f, now, selected, onSelect }) {
  const trip = f.bus.current_trip;
  return (
    <li>
      <button type="button" className={`live-bus${selected ? ' is-selected' : ''}`} onClick={() => onSelect(f.id)} aria-pressed={selected}>
        <span className="row-between"><span className="row"><Swatch color={f.bus.color} /><strong>{f.bus.code}</strong><span className="muted small">{f.bus.operator}</span></span>
          <Badge tone={TONE[f.punctuality.status]}>{f.punctuality.status === 'STOPPED' && <TriangleAlert size={12} aria-hidden="true" />}{f.punctuality.label}</Badge></span>
        <span className="small">{trip.origin} → {trip.destination}</span>
        <span className="row small muted live-bus-meta">
          <span className="row"><Gauge size={13} aria-hidden="true" /> {f.speedKmh} km/h</span>
          <span className="row"><Clock3 size={13} aria-hidden="true" /> {f.etaMs ? `Arrives in ${formatRemaining(f.etaMs - now)}` : 'Arrival unknown'}</span>
          <span className="row">{f.source === 'GPS' ? <><Satellite size={13} aria-hidden="true" /> GPS</> : <><Radio size={13} aria-hidden="true" /> Simulated</>}</span>
        </span>
        <Progress pct={f.progress} />
      </button>
    </li>
  );
}

function SelectedBus({ f, now, onLink, onReport }) {
  const trip = f.bus.current_trip;
  return (
    <section className="card card-pad stack-s live-selected" aria-label="Selected bus">
      <div className="row-between"><h3 className="live-h"><Swatch color={f.bus.color} /> {f.bus.code} · {f.bus.name}</h3><Badge tone={TONE[f.punctuality.status]}>{f.punctuality.label}</Badge></div>
      <p className="muted small">{f.bus.reg_no} · {f.bus.operator}</p>
      <dl className="live-facts">
        <div><dt>Route</dt><dd>{trip.origin} → {trip.destination}</dd></div>
        <div><dt>Speed</dt><dd>{f.speedKmh} km/h {f.jammed ? '(stopped in reported traffic)' : ''}</dd></div>
        <div><dt>Distance left</dt><dd>{f.lengthKm !== null && f.km !== null ? `${Math.max(0, f.lengthKm - f.km).toFixed(0)} km of ${f.lengthKm.toFixed(0)} km` : '—'}</dd></div>
        <div><dt>Scheduled arrival</dt><dd>{formatTime(trip.scheduled_arrival_at || trip.arrival_at)}</dd></div>
        <div><dt>Expected arrival</dt><dd>{f.etaMs ? `${formatTime(f.etaMs)} · in ${formatRemaining(f.etaMs - now)}` : 'Unknown while stopped'}</dd></div>
        <div><dt>Position from</dt><dd>{f.source === 'GPS' ? 'Driver phone GPS (live)' : 'Timetable simulation (no GPS in the last 2 minutes)'}</dd></div>
      </dl>
      {f.bus.condition !== 'NORMAL' && <Alert kind="error">{f.bus.condition === 'IN_TRAFFIC' ? 'In traffic' : f.bus.condition === 'ACCIDENT' ? 'Accident' : 'Breakdown'}: {f.bus.condition_note || 'no details given'}</Alert>}
      <div className="row">
        <Button size="small" variant="secondary" onClick={onLink}><Link2 size={14} aria-hidden="true" /> Driver link</Button>
        <Button size="small" variant="ghost" onClick={onReport}><TriangleAlert size={14} aria-hidden="true" /> Report incident here</Button>
      </div>
    </section>
  );
}

export default function LiveTracking() {
  const [tracker] = useState(() => new BusTracker({ jams: TRAFFIC_SIMULATION }));
  const onFixes = useCallback((fixes) => { const t = Date.now(); for (const f of fixes) tracker.fix(f.busId, f, t); }, [tracker]);
  const feed = useLiveFeed({ onFixes });
  const sim = useSim();
  const [hidden, setHidden] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [report, setReport] = useState(null);
  const [linkFor, setLinkFor] = useState(null);
  const [frame, setFrame] = useState({ rows: [], now: 0 });
  const [filter, setFilter] = useState('ALL');
  const [notice, setNotice] = useState('');
  const latest = useRef([]);

  const data = feed.data;
  useEffect(() => { if (data) tracker.sync(data.buses, data.roads); }, [data, tracker]);
  // The map moves buses every frame; the list below refreshes once a second from the same numbers.
  useEffect(() => {
    const t = setInterval(() => setFrame({ rows: latest.current, now: simNowMs() }), 1000);
    return () => clearInterval(t);
  }, []);
  const onFrame = useCallback((rows) => { latest.current = rows; }, []);

  const colorTimer = useRef(0);
  const { refresh } = feed;
  const onColor = useCallback((operatorId, color) => {
    clearTimeout(colorTimer.current);
    colorTimer.current = setTimeout(async () => {
      try { await api('/api/tracking/colors', { method: 'PATCH', body: { operatorId, color } }); await refresh(); } catch (e) { setNotice(e.message); }
    }, 400);
  }, [refresh]);
  async function resolve(id) {
    try { await api('/api/tracking/incidents', { method: 'PATCH', body: { id } }); await feed.refresh(); } catch (e) { setNotice(e.message); }
  }

  if (feed.error && !data) return <ErrorState error={feed.error} onRetry={() => window.location.reload()} />;

  const rows = frame.rows.filter((f) => !hidden.has(f.bus.operator_id));
  const counts = rows.reduce((m, f) => ({ ...m, [f.punctuality.status]: (m[f.punctuality.status] || 0) + 1 }), {});
  const shown = rows.filter((f) => filter === 'ALL' || f.punctuality.status === filter || (filter === 'LATE' && f.punctuality.status === 'VERY_LATE'))
    .sort((a, b) => ORDER[a.punctuality.status] - ORDER[b.punctuality.status] || a.bus.code.localeCompare(b.bus.code));
  const selected = frame.rows.find((f) => f.id === selectedId) || null;
  const parked = data ? data.buses.filter((b) => !b.current_trip).length : 0;

  return (
    <div className="stack">
      <div className="live-toolbar">
        <span className={`live-mode live-mode-${feed.mode}`}><span className="live-dot" aria-hidden="true" />{feed.mode === 'live' ? 'Live' : feed.mode === 'polling' ? 'Updating every 15 s' : feed.mode === 'error' ? 'Offline' : 'Connecting'}</span>
        {sim.speed > 1 && <Badge tone="info">Simulation clock {sim.speed}x</Badge>}
        {TRAFFIC_SIMULATION && <Badge tone="warn">Traffic jams simulated</Badge>}
        <span className="grow" />
        <Button size="small" variant={placing ? 'primary' : 'secondary'} onClick={() => setPlacing(!placing)}><MapPin size={14} aria-hidden="true" /> {placing ? 'Click the map where it happened' : 'Report incident'}</Button>
      </div>
      {notice && <Alert kind="error">{notice}</Alert>}
      <div className="row" role="group" aria-label="Filter buses">
        {[['ALL', `All on road ${rows.length}`], ['ON_TIME', `On schedule ${counts.ON_TIME || 0}`], ['LATE', `Late ${(counts.LATE || 0) + (counts.VERY_LATE || 0)}`], ['STOPPED', `Stopped ${counts.STOPPED || 0}`]]
          .map(([k, label]) => <button key={k} type="button" className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>)}
        <span className="muted small">{parked} parked or off duty</span>
      </div>
      <div className="live-layout">
        <div className="live-map card">
          <MapCanvas data={data} tracker={tracker} hidden={hidden} selectedId={selectedId} onSelect={setSelectedId}
            placing={placing} onPlace={(at) => { setPlacing(false); setReport({ at, bus: null }); }} onResolve={resolve} onFrame={onFrame} />
          <div className="map-legend small" aria-label="Map legend">
            <span><span className="legend-line legend-heavy" /> Heavy traffic</span>
            <span><span className="legend-line legend-moderate" /> Slow traffic</span>
            <span><span className="legend-line legend-straight" /> Approximate road</span>
          </div>
        </div>
        <aside className="live-side stack">
          {!data ? <div className="card card-pad"><Skeleton lines={6} /></div> : (
            <>
              {selected && <SelectedBus f={selected} now={frame.now} onLink={() => setLinkFor(selected.bus)} onReport={() => setReport({ at: selected.point, bus: selected.bus })} />}
              <section className="card card-pad stack-s" aria-label="Buses on the road">
                <h3 className="live-h">Buses on the road</h3>
                {shown.length ? <ul className="live-bus-list">{shown.map((f) => <BusRow key={f.id} f={f} now={frame.now} selected={f.id === selectedId} onSelect={setSelectedId} />)}</ul>
                  : <EmptyState icon={Bus} title={data.buses.length ? 'No bus is on a trip right now' : 'No buses yet'}>{data.buses.length ? 'Buses appear here when a trip departs.' : 'Add a bus and publish a trip to see it here.'}</EmptyState>}
              </section>
              <OperatorLegend operators={data.operators} hidden={hidden} setHidden={setHidden} onColor={onColor} />
              {data.incidents.length > 0 && (
                <section className="card card-pad stack-s" aria-label="Incidents">
                  <h3 className="live-h">Incidents in the last 24 hours</h3>
                  <ul className="live-incidents">{data.incidents.map((i) => (
                    <li key={i.id} className="row-between small"><span><strong>{INCIDENT[i.kind]?.label}</strong> · {i.note || 'no details'} <span className="muted">· {i.reporter.toLowerCase()} · {formatTime(i.createdAt)}</span></span>
                      {i.canResolve && <Button size="small" variant="ghost" onClick={() => resolve(i.id)}>Cleared</Button>}</li>))}</ul>
                </section>
              )}
              <p className="muted small">
                Buses with a driver link sending GPS are shown at their real position. Others move along their road by the timetable on the simulation clock.
                {TRAFFIC_SIMULATION ? ' Traffic jams are simulated (randomly generated per road and half hour) so the map looks like a real day; buses slow down inside them. Set NEXT_PUBLIC_TRAFFIC_SIMULATION=off to turn them off.' : ''}
                {' '}Stretches where GPS buses drove slower than 25 km/h are coloured from measured speeds.
              </p>
            </>
          )}
        </aside>
      </div>
      {report && <IncidentModal at={report.at} bus={report.bus} onClose={() => setReport(null)} onDone={() => { setReport(null); feed.refresh(); }} />}
      {linkFor && <DriverLinkModal bus={linkFor} onClose={() => { setLinkFor(null); feed.refresh(); }} />}
    </div>
  );
}
