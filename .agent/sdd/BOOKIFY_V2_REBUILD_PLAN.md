# Bookify v2 rebuild: audit and page-by-page plan

Status: active · 24 November 2026. This plan supersedes `BOOKIFY_V1_DELIVERY_PLAN.md` for the web application. The 23-table schema in `.agent/architecture/DATABASE_SCHEMA.md` stays the canonical data model and is extended additively.

## 1. Audit of the live site (bookify-six-phi.vercel.app)

### Site-wide
- The whole product is framed as a demo: "Demo Coach 101", "Demo Express", a "Choose a demo role" workspace, a "Demo tracker", demo e-mail fields and a shared demo session cookie instead of real accounts.
- No real authentication. Passenger, vendor and admin are one-click demo identities signed with a shared secret. Nobody can register, sign in, reset a password or own their bookings across devices.
- Two unrelated data models live side by side: the 23-table design (`users`, `trips`, `bookings`, ...) and a flat `bookify_*` demo model the app actually uses (vendor stored as free text, seats as a text array, one passenger per order).
- Styling is roughly 8,000 lines of CSS across 7 files, much of it unused or duplicated (liquid glass, 3D bus viewer, GSAP effects). Hero text is hard to read on top of the photo, and the dark glass look is decoration over function.
- Heavy dependencies that a booking flow does not need: three.js, react-three-fiber, drei, GSAP, canvas-confetti, Express inside a Next.js catch-all route.
- Navigation mixes marketing ("Luxury Fleet", "Operator SaaS") with product pages. There is no account menu, no footer links to policies, and no 404/empty/error design.

### Home (/)
- Every number is fabricated: "500+ daily routes", "12M+ happy travelers", "99.8% on-time", "2,400+ buses", "4.9/5 rating", fake testimonials naming real operators (Green Line, Shohagh), fake App Store and Google Play buttons.
- "Popular corridors" prices, trip counts and durations are hard-coded, not read from the database.
- Search widget pre-fills Dhaka to Chattogram and offers "Sleeper Pods / VIP Seater" tabs that do not filter anything real.

### Search (/search)
- Results ignore From, To and Date. A Dhaka to Chattogram search for 24 Nov lists every trip for the next week, including Dhaka to Bogura.
- Duplicate "Coach class" filter in two places. No operator, fare range, boarding point or departure-time filters that work together; no date strip; no seats-left count; no duration; no amenities; no empty state that suggests other dates.
- Seat selection is a flat grid of seat buttons (1A, 1B, ...) in a side panel. No bus layout (aisle, driver, decks, sleeper berths), no legend, no booked/held/female-reserved states, no fare per seat, no seat limit message.
- Passenger details are one name and one "demo e-mail" for all seats. No phone, no gender/age per passenger, no boarding/dropping point choice.

### Routes (/routes), Fleet (/fleet), Operators (/operators)
- Routes is a static list of six city pairs.
- Fleet shows invented coaches ("Green Line Scania Multi-Axle", "4K touchscreen", "Wi-Fi") with invented average fares. These are other companies' names.
- /operators redirects to the demo workspace.

### My bookings (/my-bookings), Workspace (/workspace), Help (/contact), Tracker (/demo-tracker)
- My bookings only works inside the same browser demo session; it shows "Loading session…" for a fresh visitor with no sign-in prompt.
- Workspace (vendor/admin) has no real permissions model, no sidebar, no tables with filters, no manifest export.
- Help is four collapsed questions; no contact channel, terms, privacy or refund policy.
- Tracker simulates fake GPS for fake booking numbers.

### Gaps against a production booking system (Shohoz / RedBus class)
Real accounts (sign-up, sign-in, reset, profile), real operator onboarding and approval, admin-defined routes with ordered boarding/dropping stops, scheduled trips with per-trip fare, a true seat map per coach layout, atomic seat holds with a visible countdown, per-seat passenger details, a checkout with a verified payment gateway, PNR-based tickets with print/PDF, manage-booking by PNR and phone, cancellation with a published refund policy, operator manifests and sales reports, admin oversight, audit trail, proper loading/empty/error states, accessibility and mobile-first layout.

## 2. Architecture

- **App**: Next.js 16 (pages router), React 19, JavaScript. Pure external CSS in `src/styles/` (no Tailwind, no inline styles), Lucide icons. Remove three.js, GSAP, confetti, Express.
- **Auth**: Supabase Auth (email + password, e-mail confirmation, password reset). A `public.users` profile row is created by a trigger on `auth.users`. Role comes from `users.role_id` (1 customer, 2 vendor, 3 admin). Admins are promoted with SQL by the owner.
- **Data access**: the browser uses the Supabase anon key only for auth. All reads and writes go through Next.js API routes (`pages/api/**`) that verify the user's access token and use the service-role key on the server. Atomic operations (seat hold, confirm, cancel, trip generation) are Postgres functions callable only by `service_role`. RLS stays on for every table.
- **Seat inventory**: a hold creates a `PENDING_PAYMENT` booking with `booking_items` rows (`trip_id`, `seat_number`, `status`). A partial unique index on `(trip_id, seat_number)` for `HELD`/`CONFIRMED` items makes double selling impossible under concurrency. Holds last 10 minutes and expired holds are released inside the hold transaction.
- **Payments**: a gateway adapter. SSLCommerz (sandbox or live; covers bKash, Nagad, Rocket and cards in Bangladesh) and Stripe Checkout (test mode, already used by the repo) are both implemented behind `PAYMENT_GATEWAY`. Webhook signature, amount and currency are verified before confirming. Without gateway keys, checkout shows a clear "payments not configured" error; nothing is faked.
- **Time**: all timestamps stored in UTC, displayed and scheduled in Asia/Dhaka.
- **Money**: BDT `numeric(10,2)` as in the canonical schema; totals calculated in Postgres.

## 3. Database changes (migration `20261124120000_bookify_v2_production.sql`)

Additive on top of `20261016_init_bookify_schema.sql`. The `bookify_*` demo tables are left untouched (drop them yourself once v2 is live). Changes:
- `users`: phone optional, auto-created from `auth.users`, `updated_at` trigger.
- `vendors`: `approval_status` (PENDING/APPROVED/REJECTED), contact phone/email, `rejection_reason`.
- `bus_capacities`: `name`, `coach_class`, `decks`, validated layout JSON (rows of seat labels, empty string = aisle).
- `buses`: `vendor_id`, `amenities[]`, `name`.
- `routes` / `route_stops`: unique city pair, `stop_type` (BOARDING/DROPPING/BOTH).
- `route_permissions` (new): vendor requests a route with a proposed fare; admin approves.
- `trip_schedules`: vendor, route, bus, fare, days of week, validity window, active flag.
- `trips`: `vendor_id`, `departure_at`, `arrival_at`, `fare`, cancellation reason.
- `bookings`: `pnr`, contact name/phone/email, boarding/dropping stop, `expires_at`, cancellation and refund fields.
- `booking_items`: `trip_id`, `status` and the unique active-seat index.
- `payments`/`invoices`: gateway session id, ticket number.
- `audit_logs` (new).
- Functions: `bk_search_trips`, `bk_trip_seat_map`, `bk_hold_seats`, `bk_release_hold`, `bk_confirm_payment`, `bk_cancel_booking`, `bk_generate_trips`, `bk_cancel_trip`, report views.

## 4. Design system

- Light-first with a dark theme. Ink `#0f172a`, brand green `#0a7d55` (go, confirm), accent amber `#f59e0b` (holds, warnings), danger red, info blue. Neutral slate greys.
- Type: Inter (UI) with tabular numbers for fares and times. Scale 12/14/16/18/20/24/32/40.
- 4px spacing grid, 8px/12px radii, one shadow level for cards, one for overlays.
- Components: button (primary/secondary/ghost/danger, sizes, loading), input/select/date with labels and errors, card, badge/status pill, tabs, table with empty state, skeleton loader, toast, modal, stepper (Search → Seats → Details → Pay → Ticket), seat map (seat, berth, aisle, driver, legend), countdown, page header, sidebar layout.
- Every data view has three states: skeleton while loading, a helpful empty state, and an error state with retry.

## 5. Pages and build order

| # | Part | Pages | Done when |
|---|---|---|---|
| 1 | Foundation | layout, header, footer, design tokens, auth (sign in, sign up, reset, profile) | A real account can sign up, confirm, sign in and out |
| 2 | Discovery | Home (search + live popular routes), Search results with filters and date strip | Results come only from published future trips that match the query |
| 3 | Seat selection | Trip page: seat map, boarding/dropping, fare summary, hold | Two buyers cannot hold the same seat; hold shows a 10-minute countdown |
| 4 | Checkout | Passenger details per seat, contact, policy acceptance, payment | Verified webhook confirms the booking and issues a PNR |
| 5 | Tickets | Ticket page (print/PDF), My bookings, Manage booking (PNR + phone), cancel/refund | Passenger can retrieve and cancel within policy |
| 6 | Operator | Apply as operator, vendor dashboard: buses and layouts, route requests and fares, schedules and trips, manifest, bookings, sales | Approved operator publishes trips that appear in search |
| 7 | Admin | Overview, operator approvals, routes and stops, route/fare approvals, trips, bookings, users | Admin controls who sells what |
| 8 | Content and polish | Help, refund policy, terms, privacy, 404/500, accessibility and mobile pass | Lint, tests and build pass |

## 6. Rules carried over
SDD → TDD → BDD, external CSS only, server-side role checks, vendor isolation, HMAC-verified webhooks, 409 for seat conflicts, no demo/mock/seed data anywhere in the app.

## 7. Implemented API (v2)

Public: `GET /api/cities`, `/api/popular-routes`, `/api/search?from&to&date`, `/api/trips/:id` (seat map), `/api/payments/config`, `POST /api/bookings/lookup`. Passenger (Bearer token): `GET/PATCH /api/me`, `POST /api/trips/:id/hold`, `GET /api/bookings`, `GET /api/bookings/:id`, `PUT /api/bookings/:id/passengers`, `POST /api/bookings/:id/pay|release|cancel`. Payment callbacks: `/api/payments/sslcommerz/return|ipn`, `/api/payments/stripe-webhook`. Operator: `POST /api/operator/apply`, `GET /api/operator/me|buses|routes|trips|reports`, `POST` on buses, routes, trips, `POST /api/operator/trips/:id/cancel`, `GET /api/operator/trips/:id/manifest`. Admin: `/api/admin/overview|operators|routes|permissions|refunds|trips`. Errors: 400 validation, 401 sign-in, 403 role, 404, 409 conflict (seat taken, hold expired, schedule overlap), 503 not configured.

## 8. Change request, 24 Nov 2026 (owner)

Three roles only. Operators register with e-mail, password and company name and need no verification or approval. They propose any route (start, destination, boarding/dropping points) with a fare and journey time for Non-AC, AC or Sleeper; the admin approves and may change the fare and duration. A bus is free the moment a trip's duration ends. Buses have a unique code and an image URL (no uploads). The fleet playground shows real status only: trip timing plus operator or admin condition updates (available, on trip, in traffic, accident, breakdown, off duty). Implemented by `route_permissions` (proposals with their own stops), `bk_approve_route_request`, `bk_set_bus_state`, `bk_fleet_status` and `/api/operator|admin/fleet`.
