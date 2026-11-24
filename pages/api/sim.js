import { route } from '../../src/server/http.js';
import { readSim } from '../../src/server/sim.js';

// Public: the screens need the simulation speed and anchors to draw the clock and bus positions.
export default route({
  async GET() {
    return readSim();
  },
});
