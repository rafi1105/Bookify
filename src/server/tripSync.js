import { db, unwrap } from './db.js';
import { ensureSim } from './sim.js';

// Move trips to EN_ROUTE / COMPLETED by the clock. Best effort: screens also derive status from
// the clock, so a failure here never blocks a page.
export async function syncTripStatus() {
  try {
    await ensureSim();
    return unwrap(await db().rpc('bk_sync_trip_status'));
  } catch (error) {
    console.error('Trip status sync failed', error.message);
    return null;
  }
}
