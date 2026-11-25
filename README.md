# Bookify

Intercity bus ticketing for Bangladesh: passengers search trips, pick seats on the real coach layout, pay online and keep an e-ticket. Operators publish trips and see manifests and sales. Administrators approve operators, define routes and fares, and process refunds.

Built with Next.js (pages router), React, plain external CSS, Supabase (Postgres + Auth) and SSLCommerz or Stripe for payment.

## Setup

1. Node.js 22.12 or later, then `npm install`.
2. In the Supabase SQL editor run `supabase/migrations/20261124120000_bookify_v2_production.sql`, then `supabase/migrations/20261125120000_bookify_live_map.sql` (live map). It is self-contained (it creates every table it needs) and safe to re-run. The older `20261016_init_bookify_schema.sql` and `20261120072108_bookify_hosted_demo.sql` migrations are not required.
3. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the server-only `SUPABASE_SERVICE_ROLE_KEY`. Set `BOOKIFY_URL` to the site's public origin.
4. Choose a payment gateway with `PAYMENT_GATEWAY=sslcommerz` (set `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`, and `SSLCOMMERZ_SANDBOX=false` only in production) or `PAYMENT_GATEWAY=stripe` (set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and forward `checkout.session.completed` to `/api/payments/stripe-webhook`). SSLCommerz also needs its IPN URL `/api/payments/sslcommerz/ipn` enabled in the merchant panel. With no gateway configured, checkout reports that payment is unavailable.
5. In Supabase Auth settings, add your site URL to the redirect URLs (used for confirmation and reset e-mails).
5b. Operator sign-up uses the service-role key to create pre-confirmed accounts, so Supabase's "Confirm e-mail" setting does not block it.
6. Sign up on the site, then make yourself an administrator: `update public.users set role_id = 3 where email = 'you@example.com';`
7. `npm run dev`.

## Logging in as each role

- **Passenger:** `/sign-up`, then `/sign-in`.
- **Operator (vendor):** `/operator/register` (company name, e-mail, password; no verification). Afterwards sign in at `/sign-in`; you land on `/operator`.
- **Admin:** there is no public admin sign-up. Create a normal account at `/sign-up`, then in the Supabase SQL editor run `update public.users set role_id = 3 where email = 'you@example.com';`, sign out and back in. You land on `/admin`.

The header shows "Operator dashboard" or "Admin dashboard" after sign-in, and a light/dark toggle (follows the system until you choose).

## How the system works

Three roles: passenger, operator (vendor) and admin.

- **Operators** register at `/operator/register` with only a company name, e-mail and password. There is no e-mail verification and no approval: the account works immediately (the server creates it as already confirmed). A signed-in passenger can instead upgrade at `/operator/apply`.
- Operators **add buses** (each gets a unique code like `BUS-7K3QZ9`; the photo is a plain image URL, nothing is uploaded) and **request routes** at `/operator/routes`: any start point and destination, Non-AC, AC or Sleeper, their proposed fare, journey time, and boarding and dropping points.
- **Admins** review requests at `/admin/approvals` and can change the fare and the duration before approving. Approval creates the route and its stops.
- Operators **publish trips** (one-off or recurring) from an approved route. A bus is free again exactly when a trip's journey time is over; the database rejects trips that overlap for the same bus. Operators choose which buses are available or off duty.
- The **fleet playground** (`/operator/playground`, admins see everyone's at `/admin/fleet`) shows every bus as available, on trip, in traffic, accident, breakdown or off duty. The state comes only from real data: trip timing (progress is elapsed time against the journey time) and the condition updates an operator or admin records. Nothing is simulated.
- **Passengers** search, choose seats (held for 10 minutes), enter details, pay, and receive a ticket with PNR and QR code. Cancelling follows the refund tiers in `/policies/refunds`.
- **Refunds** are queued in the database; an admin sends the money from the payment provider's dashboard and records the reference at `/admin/refunds`.

All reads and writes go through `/api` routes that verify the Supabase session and use the service-role key. Row Level Security is on for every table with no browser access. Seat holds, payment confirmation, cancellation and scheduling are single Postgres functions (`bk_*`), so they are atomic under concurrency.

## Live map and route search

Everything here uses free services. There is no paid traffic or map API.

**What you get**
- **Live map** at `/admin/live-map` (every operator) and `/operator/live-map` (only your own buses). Each operator has a colour; buses move smoothly along the road in that colour with their speed, an arrival countdown in hours and minutes, and a badge saying whether they are on schedule, late or stopped. Admins can filter by operator and by on schedule, late or stopped, and anyone can change an operator's colour from the legend.
- **Traffic.** No free service publishes live traffic for Bangladesh, and OpenStreetMap has no traffic data. So the map shows:
  - *Simulated jams* (on by default): random stretches of road turn orange (slow) or red (heavy) for 20 to 100 minutes at a time, and buses slow down inside them, so some arrive late. They are labelled "simulated". Turn them off with `NEXT_PUBLIC_TRAFFIC_SIMULATION=off`.
  - *Measured slow traffic*: where buses that send real GPS drive under 25 km/h, that stretch is coloured from their measured speed.
- **Incidents.** Admins and operators click "Report incident" and then a spot on the map (or "Report incident here" on a bus). Drivers report from their phone. Incidents show as icons for 24 hours or until someone marks them cleared.
- **GPS from drivers.** Select a bus on the live map and click **Driver link**. The driver opens the link (or scans the QR code) on their phone and taps **Start sharing**. The phone sends its position every 5 seconds to `/api/tracking/ingest`, and the map switches that bus from its simulated position to its real one within about 2 seconds. A GPS device can post to the same endpoint with the header `Authorization: Tracker <token>` and a body `{ "lat", "lng", "speedKmh", "heading" }`, or `{ "fixes": [...] }`. Creating a new link turns the old one off. Phones only share location over HTTPS (or `localhost`).
- **Buses without GPS** move along their road on the simulation clock, following the timetable.
- **Realtime.** The map reads `/api/tracking/stream`, a server-sent events stream. It sends a full snapshot every 30 seconds and new GPS positions within about 2 seconds. Each stream lasts 50 seconds and then reconnects, which fits Vercel's free-plan time limit. If streaming is blocked, the page switches to polling every 15 seconds.
- **Demo without a bus:** `npm run sim:gps -- --url http://localhost:3000 --token <token from a driver link> --from Dhaka --to Rangpur --speed 10`. This drives a pretend bus along the real road through the same ingest API, with a few slow stretches.
- **Route search.** The search page draws the shortest road between the two cities on a map, with its distance and driving time. It also lists coaches on longer routes that pass through both cities. For example, a Dhaka to Bogura search also shows Dhaka to Rangpur coaches that drop at Bogura, with a note to choose Bogura as the dropping point.

**Credentials (all free)**

| What | Needed? | How to get it |
|---|---|---|
| OpenStreetMap map | No key | Nothing to do. You do **not** need an OpenStreetMap account or an OAuth 2 application (`openstreetmap.org/oauth2/applications`). Those are only for apps that edit OSM data. |
| `ORS_API_KEY` (road routes) | Recommended | openrouteservice is run by HeiGIT and moved to `api.heigit.org` in 2026 (the old `api.openrouteservice.org` host was announced to shut down in early November 2026; Bookify already uses the new one, see `ORS_BASE_URL`). 1. Open <https://account.heigit.org> and create a free account (confirm your e-mail). 2. In the dashboard, create a token of the free/standard type, named e.g. `bookify`. 3. Copy the key into `ORS_API_KEY` in `.env.local` and in Vercel (Project → Settings → Environment Variables), then redeploy. 4. Check today's free daily quota on <https://account.heigit.org/info/plans> (historically about 2,000 route requests a day). Bookify stores every road it looks up in the database, so each city pair costs one request. Keep the key server-side: never put it in a `NEXT_PUBLIC_` variable. |
| Fallback without a key | Automatic | Bookify uses the public OSRM demo server (`router.project-osrm.org`, light use only). If that fails too, it draws a dashed straight line and tries again 10 minutes later. Set `OSRM_URL` to your own OSRM server, or `off`. |
| Place names | Automatic | All 64 district towns (and common names like Bogra, Chittagong and Cox's Bazar) are built in. Other names are looked up with ORS geocoding, then Nominatim (1 request per second, light use), and stored in `geo_places`. |
| Map tiles (`NEXT_PUBLIC_MAP_TILE_URL`) | Optional | The default, `tile.openstreetmap.org`, is free but only for light use under its [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). Before real traffic, switch to a provider with a free tier, for example **MapTiler**: sign up at <https://cloud.maptiler.com/>, copy your key from **Account → API keys**, then set `NEXT_PUBLIC_MAP_TILE_URL=https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=YOUR_KEY` and `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION=© MapTiler © OpenStreetMap contributors`. In MapTiler, restrict the key to your domain, because tile keys are visible in the browser. Check each provider's current free limits before you choose. |

Everything else (Leaflet, the GPS ingest, the stream, incidents and simulated traffic) runs inside Bookify and Supabase, with no other account needed.

## Quality gates

`npm test` runs the migration, booking lifecycle (hold conflicts, expiry, payment idempotency, amount mismatch, refunds, trip cancellation, overlap), layout and live map tests (road routing fallbacks, simulated traffic, GPS versus simulated positions, "via" search) against an embedded Postgres. `npm run lint` and `npm run build` must also pass.

Design rules (see `AGENTS.md`): plain CSS under `src/styles/`, no Tailwind, no inline styles. The product plan and audit are in `.agent/sdd/BOOKIFY_V2_REBUILD_PLAN.md`.
