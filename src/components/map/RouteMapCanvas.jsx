import { useEffect, useRef } from 'react';
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL } from '../../lib/map/config.js';
import { PIN_SVG } from './icons.js';

// Static map of one road route (search page). Browser only.
export default function RouteMapCanvas({ road }) {
  const box = useRef(null);
  useEffect(() => {
    let map = null;
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !box.current) return;
      map = L.map(box.current, { scrollWheelZoom: false });
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: TILE_MAX_ZOOM }).addTo(map);
      L.polyline(road.coords, { color: '#ffffff', weight: 9, opacity: 0.9 }).addTo(map);
      const line = L.polyline(road.coords, { color: '#0a7d55', weight: 5, opacity: 0.95, dashArray: road.source === 'STRAIGHT' ? '6 8' : null }).addTo(map);
      const ends = [road.waypoints[0], road.waypoints[road.waypoints.length - 1]];
      ends.forEach((w, i) => {
        const icon = L.divIcon({ className: 'route-end-wrap', iconSize: [28, 28], iconAnchor: [14, 26], html: `<div class="route-end route-end-${i ? 'to' : 'from'}">${PIN_SVG}</div>` });
        L.marker(w.point, { icon, title: w.name }).bindTooltip(w.name, { permanent: true, direction: 'top', offset: [0, -24], className: 'route-end-label' }).addTo(map);
      });
      map.fitBounds(line.getBounds(), { padding: [30, 30] });
    })();
    return () => { cancelled = true; map?.remove(); };
  }, [road]);
  return <div ref={box} className="route-map-canvas" role="img" aria-label={`Road from ${road.waypoints[0]?.name} to ${road.waypoints[road.waypoints.length - 1]?.name}`} />;
}
