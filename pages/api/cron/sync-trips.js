import { route, HttpError } from '../../../src/server/http.js';
import { syncTripStatus } from '../../../src/server/tripSync.js';

// Call every minute from any scheduler (Vercel Cron, GitHub Actions, cron-job.org) with
// Authorization: Bearer <CRON_SECRET>. Not needed when the pg_cron job in the migration is enabled.
export default route({
  async GET(req) {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) throw new HttpError(401, 'Not authorised');
    return (await syncTripStatus()) || { ok: false };
  },
});
