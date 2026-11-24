import { useEffect, useState } from 'react';

// Simulation clock shared by every screen. The server decides the speed (1 = real time, 60 = a real
// second is a simulated minute). Only fleet movement uses it; seat holds and payments stay on real time.
let state = null;
let pending = null;

function load() {
  pending ||= fetch('/api/sim', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('sim'))))
    .then((d) => { state = { speed: d.speed, realAnchor: d.realAnchorMs, simAnchor: d.simAnchorMs, skew: d.serverNowMs - Date.now() }; return state; })
    .catch(() => { state = { speed: 1, realAnchor: 0, simAnchor: 0, skew: 0 }; return state; });
  return pending;
}

export function reloadSim() {
  pending = null;
  return load();
}

// Simulated "now" in ms. Equals real time while the speed is 1 or the settings are not loaded.
export function simNowMs() {
  if (!state || state.speed === 1) return Date.now() + (state?.skew || 0);
  return state.simAnchor + (Date.now() + state.skew - state.realAnchor) * state.speed;
}

export function useSim() {
  const [s, setS] = useState(state);
  useEffect(() => {
    let live = true;
    load().then((v) => live && setS(v));
    return () => { live = false; };
  }, []);
  return { ready: Boolean(s), speed: s?.speed || 1 };
}
