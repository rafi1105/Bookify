import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import { Car, Construction, Gauge, MapPin, Satellite, TriangleAlert, Wrench } from 'lucide-react';
import { Alert, Badge, Button, Loading } from '../src/components/ui.jsx';

// Driver page. The operator shares /drive#<token> (the token stays in the URL fragment, so it is never
// sent to the server in a URL or logged). The phone sends its GPS position while the page is open.
const SEND_EVERY_MS = 5000;

async function call(token, method, body) {
  const res = await fetch('/api/tracking/' + (body?.kind ? 'incidents' : 'ingest'), {
    method, headers: { Authorization: `Tracker ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'The request failed');
  return j;
}

const REPORTS = [['ACCIDENT', 'Accident', TriangleAlert], ['TRAFFIC_JAM', 'Traffic jam', Car], ['BREAKDOWN', 'Breakdown', Wrench], ['ROAD_BLOCK', 'Road blocked', Construction]];

export default function Drive() {
  const [token, setToken] = useState(null);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [last, setLast] = useState(null);
  const [sent, setSent] = useState(0);
  const [msg, setMsg] = useState('');
  const queue = useRef([]);
  const lastSent = useRef(0);
  const watch = useRef(null);
  const lock = useRef(null);

  useEffect(() => {
    const t = window.location.hash.slice(1);
    setToken(t);
    if (!t) { setError('This page needs the tracking link from your operator.'); return; }
    call(t, 'GET').then(setInfo).catch((e) => setError(e.message));
  }, []);

  async function flush(force = false) {
    if (!queue.current.length || (!force && Date.now() - lastSent.current < SEND_EVERY_MS)) return;
    const batch = queue.current.splice(0, 50);
    lastSent.current = Date.now();
    try { await call(token, 'POST', { fixes: batch }); setSent((n) => n + batch.length); setError(''); }
    catch (e) { queue.current.unshift(...batch.slice(-20)); setError(`${e.message}. Positions are kept and sent again.`); }
  }

  async function start() {
    if (!('geolocation' in navigator)) { setError('This phone or browser cannot share its location.'); return; }
    setError('');
    watch.current = navigator.geolocation.watchPosition((p) => {
      const fix = { lat: p.coords.latitude, lng: p.coords.longitude, speed: p.coords.speed, heading: p.coords.heading, accuracy: p.coords.accuracy, recordedAt: new Date(p.timestamp).toISOString() };
      setLast(fix);
      // Keep only the newest fix per send window to save data.
      if (queue.current.length && Date.now() - lastSent.current < SEND_EVERY_MS) queue.current[queue.current.length - 1] = fix; else queue.current.push(fix);
      flush();
    }, (e) => setError(e.code === 1 ? 'Location permission was refused. Allow location for this site in the browser settings.' : `Location unavailable: ${e.message}`),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
    try { lock.current = await navigator.wakeLock?.request('screen'); } catch { /* screen may sleep */ }
    setSharing(true);
  }
  function stop() {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    lock.current?.release?.();
    flush(true);
    setSharing(false);
  }
  useEffect(() => () => { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); }, []);
  useEffect(() => { if (!sharing) return undefined; const t = setInterval(() => flush(true), SEND_EVERY_MS); return () => clearInterval(t); });

  async function reportIt(kind) {
    setMsg('');
    try { await call(token, 'POST', { kind, ...(last ? { lat: last.lat, lng: last.lng } : {}) }); setMsg('Reported. Your operator and Bookify can see it on the live map.'); }
    catch (e) { setError(e.message); }
  }

  return (
    <div className="container narrow section stack drive">
      <Head><title>Driver tracking · Bookify</title><meta name="robots" content="noindex" /></Head>
      <h1>Driver tracking</h1>
      {!info && !error && <Loading label="Checking your link" />}
      {error && <Alert kind="error">{error}</Alert>}
      {info && (
        <>
          <div className="card card-pad stack-s">
            <div className="row-between"><strong>{info.bus.code} · {info.bus.name}</strong>{sharing ? <Badge tone="ok"><Satellite size={12} aria-hidden="true" /> Sharing</Badge> : <Badge>Not sharing</Badge>}</div>
            <span className="muted small">{info.bus.reg_no}{info.trip ? ` · on trip ${info.trip.origin} → ${info.trip.destination}` : ' · no trip running now'}</span>
          </div>
          {sharing ? <Button block variant="secondary" onClick={stop}>Stop sharing</Button> : <Button block onClick={start}><MapPin size={16} aria-hidden="true" /> Start sharing my location</Button>}
          <p className="muted small">Keep this page open while driving. The screen stays on where the phone allows it. Location needs HTTPS (or localhost when testing).</p>
          {last && (
            <div className="card card-pad drive-stats">
              <div><Gauge size={18} aria-hidden="true" /><strong>{last.speed != null ? Math.round(last.speed * 3.6) : '–'}</strong><span className="muted small">km/h</span></div>
              <div><strong>{sent}</strong><span className="muted small">positions sent</span></div>
              <div><strong>±{Math.round(last.accuracy)} m</strong><span className="muted small">accuracy</span></div>
            </div>
          )}
          <section className="stack-s">
            <h2 className="live-h">Report on the road</h2>
            <div className="drive-reports">{REPORTS.map(([k, label, Icon]) => <Button key={k} variant="secondary" onClick={() => reportIt(k)}><Icon size={16} aria-hidden="true" /> {label}</Button>)}</div>
            {msg && <Alert kind="info">{msg}</Alert>}
          </section>
        </>
      )}
    </div>
  );
}
