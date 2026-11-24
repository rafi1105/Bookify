import { route, HttpError } from '../../../src/server/http.js';
import { requireAdmin } from '../../../src/server/auth.js';
import { db, unwrap } from '../../../src/server/db.js';
import { readSim } from '../../../src/server/sim.js';

// Admin: change the simulation speed (continuing from the current simulated time) or reset the clock to real time.
export default route({
  async GET(req) {
    await requireAdmin(req);
    return readSim();
  },
  async POST(req) {
    const admin = await requireAdmin(req);
    const b = req.body || {};
    const speed = b.speed === undefined ? null : Number(b.speed);
    if (speed !== null && !(speed >= 1 && speed <= 600)) throw new HttpError(400, 'Speed must be between 1 and 600');
    unwrap(await db().rpc('bk_set_sim', { p_speed: speed, p_reset: Boolean(b.reset) }));
    await db().from('audit_logs').insert({ actor_id: admin.id, action: 'SIM_CLOCK', entity: 'sim_clock', entity_id: null, details: { speed, reset: Boolean(b.reset) } });
    return readSim();
  },
});
