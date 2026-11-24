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
    return { trips };
  },
});
