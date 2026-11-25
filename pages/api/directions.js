import { route, text, HttpError } from '../../src/server/http.js';
import { roadBetween } from '../../src/server/geo.js';

// Public: the road route between two cities for the search page map (cached per city pair).
export default route({
  async GET(req, res) {
    const from = text(req.query.from, { max: 100, label: 'From' });
    const to = text(req.query.to, { max: 100, label: 'To' });
    const road = await roadBetween([from, to]);
    if (!road) throw new HttpError(404, `We could not find ${from} or ${to} on the map`);
    res.setHeader('Cache-Control', road.source === 'STRAIGHT' ? 'no-store' : 'public, max-age=3600');
    return { from, to, road: { coords: road.coords, distanceKm: road.distanceKm, durationMin: road.durationMin, source: road.source, waypoints: road.waypoints } };
  },
});
