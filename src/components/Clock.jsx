import { Clock3 } from 'lucide-react';
import { useNow, formatRemaining } from '../lib/useNow.js';

const TZ = 'Asia/Dhaka';

// Live Bangladesh time (Asia/Dhaka), ticking every second.
export function DhakaClock() {
  const { now, speed } = useNow() || { now: null, speed: 1 };
  if (now === null) return <span className="clock clock-empty" aria-hidden="true" />;
  const d = new Date(now);
  // At 60x or faster the seconds would not move, so the minutes become the ticking part.
  const time = d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', ...(speed >= 60 ? {} : { second: '2-digit' }), hour12: false });
  const date = d.toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <span className="clock" title={speed > 1 ? `Simulated Bangladesh time, running ${speed}x faster than real time` : 'Bangladesh time (Asia/Dhaka)'}>
      <Clock3 size={15} aria-hidden="true" />
      <span className="clock-time">{time}</span>
      <span className="clock-date">{date} · BST</span>
      {speed > 1 && <span className="sim-badge">Simulation {speed}x</span>}
    </span>
  );
}

// Time left until an instant, e.g. "Departs in 02h 14m 05s". Shows `doneLabel` once it passes.
export function Until({ at, prefix, doneLabel = 'now' }) {
  const { now } = useNow() || { now: null };
  if (now === null) return <span className="until">{prefix}</span>;
  const ms = new Date(at).getTime() - now;
  return <span className="until" role="timer">{prefix} {ms > 0 ? formatRemaining(ms) : doneLabel}</span>;
}
