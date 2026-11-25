import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Map as MapIcon, Navigation } from 'lucide-react';
import { Skeleton } from '../ui.jsx';
import { useApi } from '../../lib/useApi.js';
import { formatDuration } from '../../lib/format.js';

const RouteMapCanvas = dynamic(() => import('./RouteMapCanvas.jsx'), { ssr: false, loading: () => <div className="route-map-canvas"><Skeleton lines={2} /></div> });

const SOURCE = {
  ORS: 'Shortest driving route from OpenRouteService',
  OSRM: 'Shortest driving route from OSRM',
  STRAIGHT: 'Approximate line: road routing is unavailable right now',
};

// Road route between the searched cities, shown above the results. Collapsible; hides itself if the
// cities cannot be found on the map.
export default function RouteMap({ from, to, viaCount = 0 }) {
  const [open, setOpen] = useState(true);
  const { loading, error, data } = useApi(`/api/directions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { auth: false });
  if (error) return null;
  return (
    <section className="card route-map" aria-label="Route map">
      <div className="route-map-head row-between">
        <div className="row"><Navigation size={16} aria-hidden="true" />
          {loading ? <span className="muted small">Finding the road…</span> : (
            <span><strong>{from} → {to}</strong> <span className="muted small">· {data.road.distanceKm} km by road · about {formatDuration(data.road.durationMin)} driving{viaCount ? ` · ${viaCount} coach${viaCount === 1 ? '' : 'es'} on longer routes pass through ${to}` : ''}</span></span>
          )}
        </div>
        <button type="button" className="btn btn-ghost btn-small" aria-expanded={open} onClick={() => setOpen(!open)}><MapIcon size={14} aria-hidden="true" /> {open ? 'Hide map' : 'Show map'}</button>
      </div>
      {open && !loading && <><RouteMapCanvas road={data.road} /><p className="muted small route-map-foot">{SOURCE[data.road.source]}. Bus times can differ from driving time.</p></>}
    </section>
  );
}
