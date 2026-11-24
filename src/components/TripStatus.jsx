import { Badge } from './ui.jsx';
import { formatDuration, formatTime } from '../lib/format.js';

const META = {
  SCHEDULED: ['Scheduled', 'ok'], BOARDING: ['Boarding', 'info'], DELAYED: ['Delayed', 'warn'], EN_ROUTE: ['En route', 'info'],
  COMPLETED: ['Completed', ''], CANCELLED: ['Cancelled', 'danger'],
};

// Trip status with the reason for any delay, in the words operators and admins see in trip scheduling.
export default function TripStatus({ trip }) {
  const [label, tone] = META[trip.status] || [trip.status, ''];
  const dep = trip.depDelayMin || 0;
  const traffic = trip.trafficDelayMin || 0;
  const waiting = trip.status === 'DELAYED' && dep > 0;
  return (
    <>
      <Badge tone={tone}>{label}</Badge>
      {waiting && <div className="small delay-text">Delayed {formatDuration(dep)}: bus not yet arrived from previous trip{trip.scheduledDepartureAt ? ` (was ${formatTime(trip.scheduledDepartureAt)})` : ''}</div>}
      {!waiting && trip.status !== 'CANCELLED' && dep + traffic > 0 && <div className="small delay-text">Delayed {formatDuration(dep + traffic)}{traffic > 0 ? ' by traffic' : ''}</div>}
    </>
  );
}
