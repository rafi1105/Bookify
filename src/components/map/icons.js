import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Bus, Car, Construction, TriangleAlert, Wrench, CircleAlert, MapPin } from 'lucide-react';

// Lucide icons as SVG markup for Leaflet's HTML markers.
const svg = (Icon, size = 14) => renderToStaticMarkup(createElement(Icon, { size, 'aria-hidden': true, strokeWidth: 2.4 }));

export const BUS_SVG = svg(Bus, 14);
export const HALT_SVG = svg(TriangleAlert, 14);
export const PIN_SVG = svg(MapPin, 18);
export const INCIDENT = {
  ACCIDENT: { label: 'Accident', svg: svg(TriangleAlert) },
  TRAFFIC_JAM: { label: 'Traffic jam', svg: svg(Car) },
  BREAKDOWN: { label: 'Breakdown', svg: svg(Wrench) },
  ROAD_BLOCK: { label: 'Road blocked', svg: svg(Construction) },
  OTHER: { label: 'Other', svg: svg(CircleAlert) },
};
