# Bookify

Intercity bus ticketing for Bangladesh: passengers search trips, pick seats on the real coach layout, pay online and keep an e-ticket. Operators publish trips and see manifests and sales. Administrators approve operators, define routes and fares, and process refunds.

Built with Next.js (pages router), React, plain external CSS, Supabase (Postgres + Auth) and SSLCommerz or Stripe for payment.

## Setup

1. Node.js 22.12 or later, then `npm install`.
2. In the Supabase SQL editor run `supabase/migrations/20261124120000_bookify_v2_production.sql`. It is self-contained (it creates every table it needs) and safe to re-run. The older `20261016_init_bookify_schema.sql` and `20261120072108_bookify_hosted_demo.sql` migrations are not required.
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

## Quality gates

`npm test` runs the migration, booking lifecycle (hold conflicts, expiry, payment idempotency, amount mismatch, refunds, trip cancellation, overlap) and layout tests against an embedded Postgres. `npm run lint` and `npm run build` must also pass.

Design rules (see `AGENTS.md`): plain CSS under `src/styles/`, no Tailwind, no inline styles. The product plan and audit are in `.agent/sdd/BOOKIFY_V2_REBUILD_PLAN.md`.
