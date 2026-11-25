// Map settings shared by every map on the site. All of them are public (NEXT_PUBLIC_*).
//
// Tiles: tile.openstreetmap.org is free but meant for light use (see its tile usage policy). For real
// traffic switch NEXT_PUBLIC_MAP_TILE_URL to a provider with a free tier (MapTiler, Stadia Maps,
// Thunderforest) or your own tile server; the README lists how to get each key.
export const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION
  || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const TILE_MAX_ZOOM = Number(process.env.NEXT_PUBLIC_MAP_TILE_MAX_ZOOM || 19);

// Simulated traffic jams on the live map. On unless set to "off".
export const TRAFFIC_SIMULATION = (process.env.NEXT_PUBLIC_TRAFFIC_SIMULATION || 'on').toLowerCase() !== 'off';

export const BANGLADESH_CENTER = [23.685, 90.3563];

// Operator colours: distinct on a light street map and for common colour-vision deficiencies.
export const OPERATOR_PALETTE = ['#1d4ed8', '#c2410c', '#047857', '#7c3aed', '#be123c', '#0e7490', '#a16207', '#4338ca', '#15803d', '#9d174d', '#334155', '#b45309'];

export function isHexColor(v) {
  return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
}

// The operator's chosen colour, or a stable one picked from the palette by its id.
export function operatorColor(id, chosen) {
  if (isHexColor(chosen)) return chosen.toLowerCase();
  let h = 0;
  for (const c of String(id || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return OPERATOR_PALETTE[h % OPERATOR_PALETTE.length];
}
