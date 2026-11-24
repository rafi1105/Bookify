import { route, int } from '../../src/server/http.js';
import { db, unwrap } from '../../src/server/db.js';

export default route({
  async GET(req, res) {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    const limit = req.query.limit ? int(req.query.limit, { min: 1, max: 24, label: 'Limit' }) : 8;
    return { routes: unwrap(await db().rpc('bk_popular_routes', { p_limit: limit })) };
  },
});
