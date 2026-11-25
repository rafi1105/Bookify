import { useEffect, useRef } from 'react';
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL, BANGLADESH_CENTER, TRAFFIC_SIMULATION } from '../../lib/map/config.js';
import { jamsAt, JAM_LEVEL } from '../../lib/map/trafficSim.js';
import { measure, slice } from '../../lib/map/geo.js';
import { simNowMs } from '../../lib/sim.js';
import { formatDateTime } from '../../lib/format.js';
import { BUS_SVG, HALT_SVG, INCIDENT } from './icons.js';

const TRAFFIC_COLOR = { heavy: '#dc2626', moderate: '#f59e0b' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The Leaflet map of the live tracking page. Leaflet is loaded in the browser only. Buses are moved
// every animation frame from the tracker (GPS or simulation); React only re-renders the side panel.
export default function MapCanvas({ data, tracker, hidden, selectedId, onSelect, placing, onPlace, onResolve, onFrame }) {
  const box = useRef(null);
  const ctx = useRef(null);
  const props = useRef({});
  props.current = { data, hidden, selectedId, onSelect, placing, onPlace, onResolve, onFrame };

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let trafficTimer = 0;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !box.current) return;
      const map = L.map(box.current, { zoomControl: true, preferCanvas: false }).setView(BANGLADESH_CENTER, 7);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: TILE_MAX_ZOOM }).addTo(map);
      const c = {
        L, map, roads: L.layerGroup().addTo(map), traffic: L.layerGroup().addTo(map), focus: L.layerGroup().addTo(map),
        incidents: L.layerGroup().addTo(map), buses: L.layerGroup().addTo(map), markers: new Map(), fitted: false,
      };
      ctx.current = c;
      map.on('click', (e) => { if (props.current.placing) props.current.onPlace([e.latlng.lat, e.latlng.lng]); });
      drawStatic();
      drawTraffic();
      trafficTimer = setInterval(drawTraffic, 3000);
      let last = 0;
      const loop = (t) => {
        raf = requestAnimationFrame(loop);
        if (t - last < 50) return;
        last = t;
        moveBuses();
      };
      raf = requestAnimationFrame(loop);
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearInterval(trafficTimer);
      ctx.current?.map.remove();
      ctx.current = null;
    };
  }, []);

  function moveBuses() {
    const c = ctx.current;
    if (!c) return;
    const { hidden: hide, selectedId: sel, onFrame: report } = props.current;
    const frame = tracker.frame(simNowMs());
    report?.(frame);
    const seen = new Set();
    for (const f of frame) {
      if (hide.has(f.bus.operator_id)) continue;
      seen.add(f.id);
      let m = c.markers.get(f.id);
      const halted = f.punctuality.status === 'STOPPED';
      const cls = `bus-pin${halted ? ' bus-pin-halted' : ''}${f.source === 'GPS' ? ' bus-pin-gps' : ''}${f.id === sel ? ' bus-pin-selected' : ''}${f.punctuality.status === 'VERY_LATE' ? ' bus-pin-late' : ''}`;
      if (!m) {
        const icon = c.L.divIcon({ className: 'bus-pin-wrap', iconSize: [34, 34], iconAnchor: [17, 17],
          html: `<div class="${cls}"><span class="bus-pin-arrow"></span><span class="bus-pin-dot">${halted ? HALT_SVG : BUS_SVG}</span><span class="bus-pin-label">${esc(f.bus.code)}</span></div>` });
        m = c.L.marker(f.point, { icon, keyboard: true, title: `${f.bus.code} ${f.bus.name}`, riseOnHover: true }).addTo(c.buses);
        m.on('click', () => props.current.onSelect(f.id));
        m.bindTooltip('', { direction: 'top', offset: [0, -16] });
        m.state = {};
        c.markers.set(f.id, m);
      }
      m.setLatLng(f.point);
      const el = m.getElement();
      const pin = el?.firstElementChild;
      if (pin) {
        if (m.state.cls !== cls) { pin.className = cls; pin.querySelector('.bus-pin-dot').innerHTML = halted ? HALT_SVG : BUS_SVG; m.state.cls = cls; }
        if (m.state.color !== f.bus.color) { pin.style.setProperty('--bus-color', f.bus.color); m.state.color = f.bus.color; }
        pin.style.setProperty('--heading', `${Math.round(f.heading)}deg`);
      }
      m.setZIndexOffset(f.id === sel ? 1000 : 0);
      const tip = `<strong>${esc(f.bus.code)}</strong> · ${esc(f.bus.operator || '')}<br>${f.speedKmh} km/h · ${esc(f.punctuality.label)}`;
      if (m.state.tip !== tip) { m.setTooltipContent(tip); m.state.tip = tip; }
    }
    for (const [id, m] of c.markers) if (!seen.has(id)) { m.remove(); c.markers.delete(id); }
  }

  function drawTraffic() {
    const c = ctx.current;
    const d = props.current.data;
    if (!c || !d) return;
    c.traffic.clearLayers();
    const now = simNowMs();
    if (TRAFFIC_SIMULATION) {
      for (const [key, road] of Object.entries(d.roads || {})) {
        const line = c.lines?.get(key) || measure(road.coords);
        for (const j of jamsAt(key, line.length, now)) {
          const coords = slice(line, j.fromKm, j.toKm);
          if (coords.length < 2) continue;
          c.L.polyline(coords, { color: TRAFFIC_COLOR[j.level], weight: 8, opacity: 0.85, lineCap: 'round', className: `traffic-line traffic-${j.level}` })
            .bindTooltip(`${JAM_LEVEL[j.level].label} for ${(j.toKm - j.fromKm).toFixed(1)} km · simulated`, { sticky: true }).addTo(c.traffic);
        }
      }
    }
    for (const s of d.gpsTraffic || []) {
      c.L.polyline(s.coords, { color: TRAFFIC_COLOR[s.level], weight: 8, opacity: 0.9, lineCap: 'round' })
        .bindTooltip(`${JAM_LEVEL[s.level].label} · buses measured ${s.speedKmh} km/h (GPS)`, { sticky: true }).addTo(c.traffic);
    }
  }

  function drawStatic() {
    const c = ctx.current;
    const d = props.current.data;
    if (!c || !d) return;
    c.roads.clearLayers();
    c.incidents.clearLayers();
    c.lines = new Map(Object.entries(d.roads || {}).map(([k, r]) => [k, measure(r.coords)]));
    const colorByRoad = new Map();
    for (const b of d.buses) {
      if (!b.roadKey || props.current.hidden.has(b.operator_id)) continue;
      const prev = colorByRoad.get(b.roadKey);
      colorByRoad.set(b.roadKey, prev === undefined || prev === b.color ? b.color : '#64748b');
    }
    const bounds = [];
    for (const [key, color] of colorByRoad) {
      const r = d.roads[key];
      c.L.polyline(r.coords, { color, weight: 4, opacity: 0.55, dashArray: r.source === 'STRAIGHT' ? '6 8' : null })
        .bindTooltip(`${esc(r.waypoints?.[0]?.name)} → ${esc(r.waypoints?.[r.waypoints.length - 1]?.name)} · ${r.distanceKm} km${r.source === 'STRAIGHT' ? ' (straight line: road routing unavailable)' : ''}`, { sticky: true })
        .addTo(c.roads);
      bounds.push(...r.coords);
    }
    for (const i of d.incidents || []) {
      const meta = INCIDENT[i.kind] || INCIDENT.OTHER;
      const icon = c.L.divIcon({ className: 'incident-wrap', iconSize: [28, 28], iconAnchor: [14, 14], html: `<div class="incident-pin incident-${i.kind.toLowerCase()}">${meta.svg}</div>` });
      const node = document.createElement('div');
      node.className = 'map-popup';
      node.innerHTML = `<strong>${esc(meta.label)}</strong><div class="small">${esc(i.note || 'No details given')}</div><div class="small muted">Reported by ${esc(i.reporter.toLowerCase())} · ${esc(formatDateTime(i.createdAt))}</div>`;
      if (i.canResolve) {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'btn btn-secondary btn-small'; btn.textContent = 'Mark cleared';
        btn.addEventListener('click', () => props.current.onResolve(i.id));
        node.appendChild(btn);
      }
      c.L.marker([i.lat, i.lng], { icon, title: meta.label }).bindPopup(node).addTo(c.incidents);
    }
    if (!c.fitted && bounds.length) { c.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 }); c.fitted = true; }
  }

  // Redraw roads, incidents and traffic when new data arrives or the operator filter changes.
  useEffect(() => { drawStatic(); drawTraffic(); }, [data, hidden]); // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight and centre the selected bus's road.
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    c.focus.clearLayers();
    const bus = data?.buses.find((b) => b.id === selectedId);
    const road = bus?.roadKey && data.roads[bus.roadKey];
    if (road) {
      c.L.polyline(road.coords, { color: bus.color, weight: 7, opacity: 0.9 }).addTo(c.focus);
      const m = c.markers.get(selectedId);
      if (m) c.map.panTo(m.getLatLng(), { animate: true });
    }
  }, [selectedId, data]);

  useEffect(() => {
    const c = ctx.current;
    if (c) c.map.getContainer().classList.toggle('map-placing', Boolean(placing));
  }, [placing]);

  return <div ref={box} className="live-map-canvas" role="application" aria-label="Live map of buses" />;
}
