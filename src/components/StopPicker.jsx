import { Check } from 'lucide-react';
import { formatTime } from '../lib/format.js';

// Radio list of boarding or dropping points with their times (replaces the native select).
export default function StopPicker({ label, stops, value, onChange, disabledIds = [] }) {
  return (
    <div className="stop-picker" role="group" aria-label={label}>
      <div className="stop-legend">{label}</div>
      <div className="stop-list" role="radiogroup" aria-label={label}>
        {stops.map((s) => {
          const on = s.id === value;
          const off = disabledIds.includes(s.id);
          return (
            <button key={s.id} type="button" role="radio" aria-checked={on} disabled={off} className={`stop-option ${on ? 'is-on' : ''}`} onClick={() => onChange(s.id)}>
              <span className="stop-radio" aria-hidden="true">{on && <Check size={12} />}</span>
              <span className="stop-name"><strong>{s.name}</strong>{s.address && <span className="muted small block">{s.address}</span>}</span>
              <span className="stop-time">{formatTime(s.time)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
