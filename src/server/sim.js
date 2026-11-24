import { db, unwrap } from './db.js';

// Simulation clock settings. Fleet movement (trip start and finish, bus position, delays) runs on this
// clock; ticketing (seat holds, payments) stays on real time. NEXT_PUBLIC_SIM_SPEED sets the speed
// when the server starts (default 60 in development, left as stored in production); 1 is real time.
function wantedSpeed() {
  const raw = process.env.NEXT_PUBLIC_SIM_SPEED;
  if (raw !== undefined && raw !== '') {
    const n = Number(raw);
    return Number.isFinite(n) && n >= 1 && n <= 600 ? n : null;
  }
  return process.env.NODE_ENV === 'development' ? 60 : null;
}

export async function ensureSim() {
  if (globalThis.__bookifySimReady) return;
  globalThis.__bookifySimReady = true;
  const speed = wantedSpeed();
  if (speed === null) return;
  try {
    // A fresh start begins the simulated clock at this machine's current time.
    unwrap(await db().rpc('bk_set_sim', { p_speed: speed, p_reset: true }));
  } catch (error) {
    globalThis.__bookifySimReady = false;
    console.error('Could not start the simulation clock', error.message);
  }
}

export async function readSim() {
  await ensureSim();
  const c = unwrap(await db().from('sim_clock').select('speed,real_anchor,sim_anchor').maybeSingle());
  const now = Date.now();
  if (!c) return { speed: 1, realAnchorMs: now, simAnchorMs: now, serverNowMs: now };
  return { speed: Number(c.speed), realAnchorMs: Date.parse(c.real_anchor), simAnchorMs: Date.parse(c.sim_anchor), serverNowMs: now };
}
