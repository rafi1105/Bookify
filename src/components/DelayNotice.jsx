import { Clock } from 'lucide-react';
import { formatDuration, formatTime } from '../lib/format.js';

// Tells passengers a trip is late: the new departure (bus still on its previous trip) and/or a later arrival (traffic).
export default function DelayNotice({ scheduledDepartureAt, departureAt, delayMin }) {
  if (!delayMin || delayMin <= 0) return null;
  const dep = Math.round((new Date(departureAt) - new Date(scheduledDepartureAt)) / 60000);
  const arr = delayMin - dep;
  return (
    <div className="delay-notice" role="status">
      <Clock size={16} aria-hidden="true" />
      <span>
        {dep > 0 && <><strong>Departure delayed {formatDuration(dep)}.</strong> New departure {formatTime(departureAt)} instead of {formatTime(scheduledDepartureAt)}, because the bus has not yet arrived from its previous trip. </>}
        {arr > 0 && <><strong>Arrival delayed {formatDuration(arr)}</strong> by traffic. </>}
        Your ticket stays valid.
      </span>
    </div>
  );
}
