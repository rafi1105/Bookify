import { route, text, isoDate, HttpError } from '../../src/server/http.js';
import { db, unwrap } from '../../src/server/db.js';

export default route({
  async GET(req, res) {
    const from = text(req.query.from, { max: 100, label: 'From' });
    const to = text(req.query.to, { max: 100, label: 'To' });
    const date = isoDate(req.query.date);
    if (from.toLowerCase() === to.toLowerCase()) throw new HttpError(400, 'Choose two different cities');
    res.setHeader('Cache-Control', 'no-store');
    const trips = unwrap(await db().rpc('bk_search_trips', { p_from: from, p_to: to, p_date: date }));
    // Coaches on a longer route that pass through both cities (e.g. Dhaka to Rangpur dropping at Bogura).
    let via = [];
    try {
      const hits = unwrap(await db().rpc('bk_search_via', { p_from: from, p_to: to, p_date: date }));
      const byRoute = new Map();
      for (const h of hits) {
        const k = `${h.route_origin}|${h.route_destination}`;
        if (!byRoute.has(k)) byRoute.set(k, []);
        byRoute.get(k).push(h);
      }
      for (const list of byRoute.values()) {
        const full = unwrap(await db().rpc('bk_search_trips', { p_from: list[0].route_origin, p_to: list[0].route_destination, p_date: date }));
        const wanted = new Map(list.map((h) => [h.trip_id, h]));
        via.push(...full.filter((t) => wanted.has(t.trip_id)).map((t) => ({ ...t, via: true, board_at: wanted.get(t.trip_id).board_at, drop_at: wanted.get(t.trip_id).drop_at })));
      }
    } catch (error) {
      // The live map migration may not be applied yet; direct trips still work.
      via = [];
      console.warn('Via search unavailable', error.message);
    }
    return { trips: [...trips, ...via] };
  },
});
