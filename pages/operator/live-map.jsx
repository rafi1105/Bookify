import OperatorShell from '../../src/components/OperatorShell.jsx';
import LiveTracking from '../../src/components/map/LiveTracking.jsx';

export default function OperatorLiveMap() {
  return (
    <OperatorShell title="Live map" subtitle="Your buses on the road, their speed and when they arrive.">
      <LiveTracking />
    </OperatorShell>
  );
}
