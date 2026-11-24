import { route } from '../../../src/server/http.js';
import { activeGateway } from '../../../src/server/gateways/index.js';

export default route({
  async GET() {
    const gateway = activeGateway();
    return { available: Boolean(gateway), label: gateway?.adapter.label || null, gateway: gateway?.name || null };
  },
});
