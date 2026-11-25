import { createRun, advance, remainingMs, punctuality } from './trafficSim.js';
import { measure, pointAt, locate } from './geo.js';

const MIN = 60000;

// Time the bus has been moving on its current trip at simulated time `now`: since departure, minus the
// time it stood in a reported traffic jam (same rule as the fleet playground). An accident or
// breakdown stops the clock at the moment it was reported.
export function movingMs(trip, { state, conditionAt }, now) {
  const halted = state === 'ACCIDENT' || state === 'BREAKDOWN';
  const dep = Date.parse(trip.departure_at);
  const at = halted && conditionAt ? Math.min(now, Math.max(Date.parse(conditionAt), dep)) : now;
  const traffic = trip.traffic_delay_min || 0;
  const prior = trip.jam_prior_min || 0;
  const jamStart = trip.jam_started_at ? Date.parse(trip.jam_started_at) : null;
  const window = Math.max(0, traffic - prior) * MIN;
  const stopped = jamStart === null ? 0 : prior * MIN + Math.min(Math.max(at - jamStart, 0), window);
  const jamLeft = jamStart !== null && !halted ? Math.max(0, jamStart + window - now) : 0;
  return { moving: Math.max(0, at - dep - stopped), halted, jamLeft };
}

// Keeps one animated bus per id: road line, simulated run, and the GPS fix it last saw.
export class BusTracker {
  constructor({ jams = true } = {}) {
    this.jams = jams;
    this.items = new Map();
  }

  sync(buses, roads) {
    const seen = new Set();
    for (const bus of buses) {
      if (!bus.current_trip) continue;
      seen.add(bus.id);
      const road = bus.roadKey ? roads[bus.roadKey] : null;
      let it = this.items.get(bus.id);
      const tripId = bus.current_trip.id;
      if (!it || it.tripId !== tripId || it.roadKey !== bus.roadKey) {
        const line = road ? measure(road.coords) : null;
        it = {
          tripId, roadKey: bus.roadKey, line, straight: road?.source === 'STRAIGHT', shownKm: null, gps: null,
          run: line ? createRun({ key: bus.roadKey, lengthKm: line.length, durationMin: bus.current_trip.duration_min, departMs: Date.parse(bus.current_trip.departure_at), jams: this.jams }) : null,
        };
        this.items.set(bus.id, it);
      }
      it.bus = bus;
      if (bus.gps) this.fix(bus.id, bus.gps);
    }
    for (const id of [...this.items.keys()]) if (!seen.has(id)) this.items.delete(id);
  }

  // A GPS fix arrived. `localMs` is when this browser received it (for dead reckoning).
  fix(busId, gps, localMs = Date.now()) {
    const it = this.items.get(busId);
    if (!it) return;
    if (it.gps && Date.parse(gps.at) <= Date.parse(it.gps.at)) return;
    const onRoad = it.line ? locate(it.line, [gps.lat, gps.lng]) : null;
    it.gps = { ...gps, localMs, km: onRoad && onRoad.offKm < 0.5 ? onRoad.km : null };
  }

  // Position, speed and arrival estimate of every bus at simulated time `now` (real time `real`).
  frame(now, real = Date.now()) {
    const out = [];
    for (const [id, it] of this.items) {
      const { bus } = it;
      const trip = bus.current_trip;
      const m = movingMs(trip, { state: bus.state, conditionAt: bus.condition_updated_at }, now);
      const live = it.gps && real - it.gps.localMs < 2 * MIN;
      let point; let heading = 0; let speed = 0; let km = null; let source;
      if (live) {
        source = 'GPS';
        speed = it.gps.speedKmh ?? 0;
        if (it.gps.km !== null && it.line) {
          // Glide along the road from the last fix at the reported speed, for at most 15 s.
          const ahead = (Math.min(real - it.gps.localMs, 15000) / 3600000) * speed;
          km = Math.min(it.line.length, it.gps.km + ahead);
        } else { point = [it.gps.lat, it.gps.lng]; heading = it.gps.heading || 0; }
      } else if (it.run) {
        source = 'SIMULATED';
        const r = advance(it.run, m.moving);
        km = r.km;
        speed = m.halted ? 0 : m.jamLeft > 0 ? 3 : r.speedKmh;
      }
      if (km !== null) {
        it.shownKm = it.shownKm === null || Math.abs(km - it.shownKm) > 3 ? km : it.shownKm + (km - it.shownKm) * 0.2;
        const p = pointAt(it.line, it.shownKm);
        point = p.point; heading = p.heading;
      }
      if (!point) continue;
      const scheduled = Date.parse(trip.scheduled_arrival_at || trip.arrival_at);
      let eta = null;
      if (!m.halted) {
        eta = it.run && km !== null ? now + remainingMs(it.run, km, now) + m.jamLeft : Date.parse(trip.arrival_at);
      }
      out.push({
        id, bus, point, heading, speedKmh: Math.round(speed), source, km, lengthKm: it.line?.length ?? null,
        progress: it.line && km !== null ? Math.min(100, (km / it.line.length) * 100) : trip.progress,
        etaMs: eta, punctuality: punctuality(eta ?? scheduled, scheduled, m.halted), jammed: m.jamLeft > 0, straight: it.straight,
      });
    }
    return out;
  }
}
