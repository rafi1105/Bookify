// Simulated traffic and bus movement for the live map.
//
// Nothing here is real traffic data: no free service publishes live traffic for Bangladesh roads.
// Jams are generated from a seeded random sequence per route and per half hour, so every screen
// (and the server) draws the same jams at the same simulated time without storing anything. A bus
// with no GPS fix is moved along its road line at a varying cruising speed and slows down inside the
// jams, so it arrives late when it meets heavy traffic. Turn the jams off with
// NEXT_PUBLIC_TRAFFIC_SIMULATION=off; buses then move at their scheduled pace.

const MIN = 60000;
export const SLOT_MS = 30 * MIN;
export const STEP_MS = 15000;

// FNV-1a, then a small PRNG seeded from it. Deterministic across browsers and Node.
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function rng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hash32(String(seed));
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const JAM_LEVEL = {
  heavy: { label: 'Heavy traffic', factor: 0.18 },
  moderate: { label: 'Slow traffic', factor: 0.45 },
};

// Jams active on one road at simulated time `atMs`. `key` identifies the road (same key, same jams).
export function jamsAt(key, lengthKm, atMs, { enabled = true } = {}) {
  if (!enabled || !(lengthKm > 4)) return [];
  const cur = Math.floor(atMs / SLOT_MS);
  const out = [];
  const perSlot = Math.max(1, Math.round(lengthKm / 120));
  for (let s = cur - 4; s <= cur; s += 1) {
    const r = rng(`${key}|${s}`);
    const roll = r();
    const count = roll < 0.3 ? 0 : roll < 0.8 ? perSlot : perSlot + 1;
    for (let j = 0; j < count; j += 1) {
      const startsAt = s * SLOT_MS + r() * SLOT_MS;
      const endsAt = startsAt + (20 + r() * 80) * MIN;
      const center = lengthKm * (0.06 + 0.88 * r());
      const len = Math.min(lengthKm * 0.2, 1 + r() * 4.5);
      const level = r() < 0.45 ? 'heavy' : 'moderate';
      if (atMs < startsAt || atMs >= endsAt) continue;
      out.push({ id: `${key}|${s}|${j}`, fromKm: Math.max(0, center - len / 2), toKm: Math.min(lengthKm, center + len / 2), level, startsAt, endsAt, simulated: true });
    }
  }
  return out;
}

// Gentle speed variation along the road, slower through towns at both ends. Around 1.
export function roadFactor(key, km, lengthKm) {
  const r = rng(`road|${key}`);
  const p1 = r() * 6.28; const p2 = r() * 6.28;
  let f = 1 + 0.12 * Math.sin(km / 6.3 + p1) + 0.07 * Math.sin(km / 1.9 + p2);
  const edge = Math.min(km, lengthKm - km);
  if (edge < 6) f *= 0.55 + 0.45 * (Math.max(0, edge) / 6);
  return Math.max(0.3, f);
}

function jamFactor(jams, km, atMs) {
  let f = 1;
  for (const j of jams) {
    if (km >= j.fromKm && km <= j.toKm) {
      const base = JAM_LEVEL[j.level].factor;
      // Stop and go inside heavy jams.
      const pulse = j.level === 'heavy' ? 0.35 + 0.65 * Math.abs(Math.sin(atMs / 47000 + j.fromKm)) : 1;
      f = Math.min(f, base * pulse);
    }
  }
  return f;
}

// Cruising speed that covers the road in the scheduled time with ~12% to spare, within sane limits.
export function cruiseKmh(lengthKm, durationMin) {
  const v = (lengthKm / Math.max(durationMin, 1)) * 60 * 1.12;
  return Math.min(90, Math.max(20, v));
}

// One trip's simulated run. `movingMs` is time since departure minus time the bus stood still for
// reported delays (the same "moving time" the fleet playground uses).
export function createRun({ key, lengthKm, durationMin, departMs, jams = true }) {
  return { key, lengthKm, departMs, jams, cruise: cruiseKmh(lengthKm, durationMin), t: 0, km: 0, cacheSlot: null, cacheJams: [] };
}

function jamsFor(run, atMs) {
  const slot = Math.floor(atMs / MIN);
  if (run.cacheSlot !== slot) { run.cacheSlot = slot; run.cacheJams = jamsAt(run.key, run.lengthKm, atMs, { enabled: run.jams }); }
  return run.cacheJams;
}

export function speedAt(run, km, atMs) {
  return run.cruise * roadFactor(run.key, km, run.lengthKm) * jamFactor(jamsFor(run, atMs), km, atMs);
}

// Move the run forward to `movingMs` and return where the bus is and how fast it goes.
export function advance(run, movingMs) {
  const target = Math.max(0, movingMs);
  if (target < run.t) { run.t = 0; run.km = 0; }
  while (run.t + STEP_MS <= target && run.km < run.lengthKm) {
    const v = speedAt(run, run.km, run.departMs + run.t);
    run.km = Math.min(run.lengthKm, run.km + (v * STEP_MS) / 3600000);
    run.t += STEP_MS;
  }
  if (run.km >= run.lengthKm) return { km: run.lengthKm, speedKmh: 0, arrived: true };
  const at = run.departMs + target;
  const v = speedAt(run, run.km, at);
  const km = Math.min(run.lengthKm, run.km + (v * (target - run.t)) / 3600000);
  return { km, speedKmh: km >= run.lengthKm ? 0 : v, arrived: km >= run.lengthKm };
}

// Expected time to cover the rest of the road. Jams known right now count only within the next 40 km;
// further ones will probably have cleared by the time the bus gets there.
export function remainingMs(run, fromKm, atMs) {
  const jams = jamsFor(run, atMs).filter((j) => j.toKm >= fromKm && j.fromKm <= fromKm + 40);
  let ms = 0;
  const step = 0.5;
  for (let km = fromKm; km < run.lengthKm; km += step) {
    const d = Math.min(step, run.lengthKm - km);
    const known = jamFactor(jams, km + d / 2, atMs);
    const v = run.cruise * roadFactor(run.key, km + d / 2, run.lengthKm) * (known < 1 ? (known < 0.3 ? 0.18 : 0.45) : 1);
    ms += (d / v) * 3600000;
  }
  return ms;
}

// On schedule or not, from the expected arrival against the timetable.
export function punctuality(etaMs, scheduledMs, halted = false) {
  if (halted) return { status: 'STOPPED', label: 'Stopped', delayMin: null };
  const delayMin = Math.round((etaMs - scheduledMs) / MIN);
  if (delayMin <= 15) return { status: 'ON_TIME', label: delayMin < -5 ? 'Ahead of schedule' : 'On schedule', delayMin };
  if (delayMin <= 45) return { status: 'LATE', label: `${delayMin} min late`, delayMin };
  return { status: 'VERY_LATE', label: `${Math.floor(delayMin / 60) ? `${Math.floor(delayMin / 60)}h ` : ''}${delayMin % 60}m late`, delayMin };
}

// Traffic level from measured speeds (real GPS): used to colour road between consecutive fixes.
export function levelFromSpeed(kmh) {
  if (kmh < 12) return 'heavy';
  if (kmh < 25) return 'moderate';
  return null;
}
