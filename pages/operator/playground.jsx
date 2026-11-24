import OperatorShell from '../../src/components/OperatorShell.jsx';
import FleetBoard from '../../src/components/FleetBoard.jsx';

export default function Playground() {
  return (
    <OperatorShell title="Fleet playground" subtitle="Every bus, live: available, on a trip, in traffic, in an accident or off duty.">
      <FleetBoard endpoint="/api/operator/fleet" patchUrl={(id) => `/api/operator/buses/${id}`} />
    </OperatorShell>
  );
}
