import { useEffect, useState } from 'react';
import { simNowMs, useSim } from './sim.js';

// Simulated current time in ms, ticking every real second. null until the settings are loaded, so
// server and client markup match. `speed` is the simulation speed (1 = real time).
export function useNow(intervalMs = 1000) {
  const { ready, speed } = useSim();
  const [now, setNow] = useState(null);
  useEffect(() => {
    if (!ready) return undefined;
    setNow(simNowMs());
    const t = setInterval(() => setNow(simNowMs()), intervalMs);
    return () => clearInterval(t);
  }, [ready, intervalMs]);
  return { now, speed };
}

export function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n) => String(n).padStart(2, '0');
  // Seconds are meaningless when a real second is a simulated minute.
  return d ? `${d}d ${p(h)}h ${p(m)}m` : h ? `${h}h ${p(m)}m` : `${p(m)}m`;
}
