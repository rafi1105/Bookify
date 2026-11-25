// Small geometry helpers for the live map. Coordinates are [lat, lng] in degrees, distances in km.
const R = 6371.0088;
const rad = (d) => (d * Math.PI) / 180;

export function haversineKm(a, b) {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Compass bearing from a to b, 0 = north, clockwise.
export function bearingDeg(a, b) {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
  const x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// A polyline with its cumulative distance, so a point at any distance along it is cheap to find.
export function measure(coords) {
  const cum = [0];
  for (let i = 1; i < coords.length; i += 1) cum.push(cum[i - 1] + haversineKm(coords[i - 1], coords[i]));
  return { coords, cum, length: cum[cum.length - 1] || 0 };
}

function segmentAt(line, km) {
  const { cum } = line;
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= km) lo = mid; else hi = mid;
  }
  return lo;
}

// Point and heading at `km` along the line (clamped to its ends).
export function pointAt(line, km) {
  const { coords, cum, length } = line;
  if (coords.length === 1) return { point: coords[0], heading: 0 };
  const d = Math.min(Math.max(km, 0), length);
  const i = Math.min(segmentAt(line, d), coords.length - 2);
  const seg = cum[i + 1] - cum[i];
  const t = seg > 0 ? (d - cum[i]) / seg : 0;
  const a = coords[i];
  const b = coords[i + 1];
  return { point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], heading: bearingDeg(a, b) };
}

// The part of the line between two distances, for drawing a highlighted stretch of road.
export function slice(line, fromKm, toKm) {
  const a = Math.max(0, Math.min(fromKm, toKm));
  const b = Math.min(line.length, Math.max(fromKm, toKm));
  if (b <= a) return [];
  const out = [pointAt(line, a).point];
  for (let i = 0; i < line.coords.length; i += 1) if (line.cum[i] > a && line.cum[i] < b) out.push(line.coords[i]);
  out.push(pointAt(line, b).point);
  return out;
}

// Distance along the line of the point on it nearest to p (flat projection per segment; fine at road scale).
export function locate(line, p) {
  const { coords, cum } = line;
  let best = { km: 0, offKm: Infinity };
  const kx = Math.cos(rad(p[0]));
  for (let i = 0; i < coords.length - 1; i += 1) {
    const a = coords[i];
    const b = coords[i + 1];
    const ax = a[1] * kx; const ay = a[0];
    const bx = b[1] * kx; const by = b[0];
    const px = p[1] * kx; const py = p[0];
    const dx = bx - ax; const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const off = haversineKm(p, q);
    if (off < best.offKm) best = { km: cum[i] + (cum[i + 1] - cum[i]) * t, offKm: off };
  }
  if (coords.length === 1) best = { km: 0, offKm: haversineKm(p, coords[0]) };
  return best;
}

// Douglas-Peucker in degrees, to keep stored and transferred road lines small.
export function simplify(coords, tolerance = 0.0005) {
  if (coords.length < 3) return coords.slice();
  const keep = new Uint8Array(coords.length);
  keep[0] = 1; keep[coords.length - 1] = 1;
  const stack = [[0, coords.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    const [ay, ax] = coords[s]; const [by, bx] = coords[e];
    const dx = bx - ax; const dy = by - ay; const len = Math.hypot(dx, dy) || 1e-12;
    let max = 0; let idx = -1;
    for (let i = s + 1; i < e; i += 1) {
      const d = Math.abs(dy * coords[i][1] - dx * coords[i][0] + bx * ay - by * ax) / len;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tolerance && idx > 0) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
  }
  return coords.filter((_, i) => keep[i]);
}
