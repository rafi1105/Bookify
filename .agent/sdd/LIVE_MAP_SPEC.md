# Live map, GPS tracking and route search (spec)

Status: implemented 25 November 2026. Migration `20261125120000_bookify_live_map.sql` (additive).

## Goals
- Admin sees every operator's buses on an OpenStreetMap map in the operator's colour; operators see only their own.
- Each bus shows speed, an arrival countdown (hours and minutes) and punctuality: on schedule (≤ 15 min late), late (≤ 45 min), very late, stopped (accident or breakdown).
- Traffic: simulated jams (seeded per road and half hour, `NEXT_PUBLIC_TRAFFIC_SIMULATION`), plus slow stretches measured from real GPS (< 25 km/h orange, < 12 km/h red).
- Incidents reported by admin, operator (map click) or driver (tracking link).
- Search shows the shortest road between the cities (OpenRouteService → OSRM → straight line) and coaches on longer routes passing through both cities.
- Free tools only: Leaflet, OSM tiles (configurable), OpenRouteService free key, OSRM/Nominatim fallbacks.

## Data
- `bus_operators.map_color` (hex or null = palette colour from id).
- `bus_trackers` (bus_id, sha256 of the driver token), `bus_positions` (2-day history), `road_incidents`.
- `geo_places`, `route_geometries`: caches so each place / road is fetched once.
- Functions: `bk_latest_positions(vendor, since)`, `bk_search_via(from, to, date)`, `bk_prune_positions()`.

## API
| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/api/tracking/snapshot` | admin, vendor | buses, roads, operators, incidents, GPS traffic |
| GET | `/api/tracking/stream` | admin, vendor | SSE: `snapshot` every 30 s, `fixes` within ~2 s; 50 s per connection |
| GET/POST | `/api/tracking/ingest` | `Authorization: Tracker <token>` | bus info / one fix or `{ fixes: [] }` (≤ 50) |
| POST/DELETE | `/api/tracking/trackers` | admin, own vendor | create (replaces) / revoke a driver link |
| POST/PATCH | `/api/tracking/incidents` | admin, vendor, driver token / admin, own vendor | report / clear |
| PATCH | `/api/tracking/colors` | admin, own vendor | operator colour |
| GET | `/api/directions?from&to` | public | road line, distance, duration, source |
| GET | `/api/search` | public | now also returns `via: true` trips with `board_at`, `drop_at` |

## Position model
A bus with a GPS fix in the last 2 minutes is drawn at the fix, gliding along the road at the reported speed for up to 15 s. Otherwise it is simulated: it moves along its road line from departure at a cruising speed that covers the road in the scheduled time with 12% slack, varies gently along the road, slows in towns and inside simulated jams, stops at reported accidents and for reported traffic delays (same "moving time" rule as the fleet playground). The ETA uses the remaining road, the cruising speed and jams known within the next 40 km.

## Tests
`test/map.test.js` (geometry, gazetteer, jams, simulated runs, punctuality, GPS vs simulated, routing fallbacks with mocked fetch) and `test/livemap.test.js` (migration re-run, via search, colour constraint, latest fix scoping).
