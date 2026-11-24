import { route } from '../../src/server/http.js';
import { db, unwrap } from '../../src/server/db.js';

export default route({
  async GET(req, res) {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    const rows = unwrap(await db().rpc('bk_cities'));
    return { cities: rows.map((r) => r.city) };
  },
});
