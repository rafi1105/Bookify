import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

export default function Countdown({ until, onExpire }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.floor((new Date(until) - Date.now()) / 1000)));

  useEffect(() => {
    const tick = () => {
      const seconds = Math.max(0, Math.floor((new Date(until) - Date.now()) / 1000));
      setLeft(seconds);
      if (seconds === 0) onExpire?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until, onExpire]);

  const m = String(Math.floor(left / 60)).padStart(2, '0');
  const s = String(left % 60).padStart(2, '0');
  return <span className={`countdown ${left < 120 ? 'countdown-low' : ''}`} role="timer"><Timer size={14} aria-hidden="true" /> {m}:{s}</span>;
}
