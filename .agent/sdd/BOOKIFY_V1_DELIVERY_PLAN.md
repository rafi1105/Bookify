# Bookify v1 delivery plan and system specification

Proposed · 20 November 2026

## Release goal

A vendor registers a bus. An admin approves its route access and fare. The vendor publishes a trip. A passenger books a seat, pays in a sandbox and retrieves an e-ticket. Both dashboards reconcile the sale. A commercial pilot follows with real payments and eligible hosting.

Bookify already has React/Vite passenger screens, external CSS, mock data, a Supabase client and a migration with seat-lock RPCs. Express, role dashboards and the end-to-end lifecycle are implementation work. This plan supersedes the earlier roadmap for v1. Update the canonical API and database specs phase by phase before coding.

## Stack and design

- Keep React/Vite and React Router. Preserve the passenger layout, theme, palette and breakpoints. Use only external plain CSS under src/styles/ and semantic class names. Keep the current tokens, glass treatment, typography and shared controls. Extend them with reusable dashboard navigation, tables, filters, forms and dialogs for vendor and admin. Plain CSS avoids a new build dependency.
- Use a stateless Node.js/Express API with modules for auth, fleet, approvals, schedules, bookings, payments and reporting. Route /api/* to Express before the existing SPA fallback. Prefer same-origin API calls. Use Supabase Postgres, Auth and Storage. Use vendor-scoped image uploads and approved public catalog images.
- Use Postgres for seat holds and scheduling. Refetch availability on entry, conflict and focus and poll while the seat map is open. Add Realtime later if useful. Keep all server credentials out of Vite builds.
- Use Shohoz's search, select and pay flow as a functional reference. BDTickets returned a loading shell in this review and remains a secondary reference. [Shohoz](https://ena.shohoz.com/en) · [BDTickets](https://bdtickets.com/)

## Roles

| Role | Screens and permissions |
|---|---|
| Passenger | Search by origin, destination and date. Filter by coach class, operator, time and fare. View boarding and dropping points, pick seats or berths, enter passenger details, check out, retrieve tickets and track cancellations/refunds in My Bookings. Access own bookings. |
| Vendor | Manage own fleet, bus images, seat layouts and license information. Propose routes or request access to approved routes, submit fares and create schedules. Publish eligible trips and view own manifests, sales, occupancy and cancellations. Request a replacement or cancellation for affected trips. |
| Admin | View every vendor and bus, inspect the fleet and trip availability, manage route definitions and duration, approve vendor route access and fares, log and review incidents, inspect reputation, suspend or reinstate vendors and bus/license records, and oversee affected trips and sales across vendors. |

Provide three one-click demo login buttons backed by server-issued sessions for isolated, seeded Passenger, Vendor and Admin accounts. Use synthetic data and resettable fixtures. Verify roles and vendor memberships server-side and enforce RLS on exposed data. Commercial environments disable demo login and use Supabase Auth with authorized staff assignments.

## Domain rules

- Routes are directional and versioned. Admin sets ordered stops and fixed duration. Seed Dhaka → Bogura at 480 minutes as an example. Vendors select departures across the 24-hour clock in Asia/Dhaka, and the system calculates arrival and rolls overnight trips to the next date. Store timestamps in UTC.
- Allow one-off and recurring schedules. Generate dated trips idempotently within a configurable booking window. Enforce non-overlapping bus assignments in Postgres, including turnaround time.
- Track route approval, vendor permission to serve the route and fare approval independently. Allow publishing only when the vendor, bus/license, layout, route access and fare are eligible. Save the approved route, duration, layout and fare with each published trip. Calculate BDT totals server-side from integer minor units. Apply changes prospectively and send sold trips with passenger-visible changes through a disruption workflow.
- Define versioned AC, non-AC and sleeper templates with seat or berth labels, deck, rows and columns. Permit variation per bus. Reserve a seat across the whole trip in v1, including bookings with intermediate stops.
- A suspension closes affected trips to new sales and puts existing paid trips into a resolution queue. Preserve booked passengers' tickets, payment history and refund obligations. Record incident source, date, severity and verification status. Distinguish unknown history from no recorded incidents. Calculate reputation from completed-trip reviews with rating count. Suspension changes eligibility in Bookify.
- Report active buses, sellable trips, confirmed seats versus offered seats, captured sales, refunds and net collected by vendor and date. Use Asia/Dhaka reporting boundaries and restrict manifest and incident details to authorized roles.

## Proposed API and database contracts

| Area | Express endpoints | Supabase records |
|---|---|---|
| Identity | POST /api/auth/demo, GET /api/me | Supabase Auth identities, application roles and vendor membership |
| Fleet and approvals | /api/vendor/buses, /api/vendor/route-requests, /api/vendor/fare-requests, /api/admin/approvals, /api/admin/buses | Buses, images, layout versions, route versions/stops, route permissions, fare versions, license and incident records, audit decisions |
| Scheduling and discovery | /api/vendor/schedules, /api/vendor/trips, GET /api/trips, GET /api/trips/:id/seats | Schedules, dated trips, trip snapshots and collision constraints |
| Booking and checkout | POST /api/trips/:id/holds, hold release, POST /api/bookings, GET /api/bookings/:id, booking cancellation, POST /api/payments/webhook | Seat leases, bookings, items, passengers, payments, provider event IDs, tickets and refund state |
| Operations | /api/vendor/reports, /api/admin/reports, trip manifest and incident endpoints | Scoped aggregates and audited disruption actions |

Audit existing SQL, RPC permissions and RLS before extending the schema with additive migrations. Standardize validation responses and use 409 for seat/schedule conflicts. Public seat maps expose availability without passenger details.

Acquire all requested seats atomically for 600 seconds. Use a shared transactional inventory path for holds and confirmations. Roll back the whole batch if any seat conflicts. Release explicitly or reclaim by database expiry during a transaction. Keep a confirmed seat unavailable until authorized cancellation releases it.

Use a sandbox checkout adapter. Verify event authenticity, booking reference, amount and currency. Confirm once across duplicate or out-of-order callbacks. Record late captures that cannot be fulfilled for refund/reconciliation. Issue one unique e-ticket reference per confirmed booking, with a printable ticket and authorized vendor lookup. Expose passenger cancellation eligibility, vendor/admin trip cancellation, and refund status. Handle replacement buses through compatible seat assignments or passenger resolution.

## Delivery milestones

Estimate for one full-time developer, approximately 5–7 weeks for the demo. Commercial onboarding is additional.

| Phase | Estimate | Exit gate |
|---|---|---|
| 0. Baseline and contracts | 2–3 days | Capture passenger mobile and desktop baseline, audit migrations/RLS, define initial API/schema changes and set up Express routing, seeds and test runners. |
| 1. Auth and dashboard shells | 3–4 days | One-click login and shared navigation work across three roles. Integration tests verify ownership and role boundaries. |
| 2. Fleet, approvals and schedules | 5–7 days | Vendor uploads images and proposes route/fare. Admin approval unlocks publication. Verify route duration, overnight trips, collisions and suspensions. |
| 3. Passenger discovery and seats | 4–6 days | Existing UI consumes real trip data and supports all three layouts. Verify atomic hold conflicts, expiration and concurrent confirmation. |
| 4. Checkout and tickets | 4–6 days | Sandbox checkout, printable ticket, My Bookings, cancellations and refunds. Verify invalid, duplicate and late events. |
| 5. Reports and demo | 5–7 days | Vendor/admin reporting, manifests and end-to-end walkthrough on Vercel. Reconcile totals, verify API routes and SPA deep links, and check responsive themes. |
| 6. Commercial pilot | After demo | Provision eligible hosting, real auth, production data and one payment gateway. Verify refunds, reconciliation, backup/restore, monitoring and support procedures before taking sales. |

Vercel Hobby is for personal, non-commercial use. Use it with Supabase Free for the demo and verify quotas and inactivity behavior. Express has a supported Vercel deployment path. [Vercel Hobby](https://vercel.com/docs/plans/hobby) · [Express on Vercel](https://vercel.com/docs/frameworks/backend/express) · [Supabase plans](https://supabase.com/pricing)

## Acceptance and future work

Follow SDD → TDD → BDD. Update contracts before each slice, write service tests before or with implementation and wire Gherkin to the runner. Verify full critical-path coverage for seat holds and webhooks, including barrier-based concurrency tests. Verify cross-vendor isolation, keyboard seat selection and a vendor → admin → passenger → reporting browser walkthrough. All gates are pending implementation.

Use PostgreSQL as the sole seat-hold backend for Bookify. Demo trip tracking runs entirely in the browser. Defer separate microservices, AI voice, predictive analytics, live GPS, traffic control, external incident integration, wallets and multiple payment gateways. Basic sales, occupancy, incident and reputation reports ship in v1.
