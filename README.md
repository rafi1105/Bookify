# Bookify

Bookify is a three-role bus e-ticketing demo built with Next.js, React, external CSS, Express, Supabase Postgres and Stripe Checkout in test mode. Trips and bookings are persisted in Postgres. The separate bus tracker simulates progress, delays and accidents for fictional trips in the browser.

## Local setup

1. Use Node.js 22.12 or later and run npm ci.
2. Apply supabase/migrations/20261120072108_bookify_hosted_demo.sql to a dedicated Supabase demo project. It creates the isolated Bookify tables, transactional functions and image bucket. For an empty project, this migration is self-contained. Optionally run supabase/seed.sql to generate next-week departures.
3. Copy .env.example to .env. Set SUPABASE_URL, the server-only SUPABASE_SERVICE_ROLE_KEY, a random DEMO_SESSION_SECRET of at least 32 characters, and Stripe test credentials. Keep BOOKIFY_DEMO=true and use the same localhost origin as BOOKIFY_URL. Do not put secrets in VITE_ variables.
4. Run npm run dev. Next.js serves both the interface and /api on http://localhost:3000.
5. Forward Stripe test events to /api/stripe/webhook with Stripe CLI, and use its signing secret for STRIPE_WEBHOOK_SECRET. Subscribe to checkout.session.completed, refund.created and refund.updated.

## Walk through the demo

1. Choose Sign in, then Vendor. Select a demo vendor, register a coach, and submit a route and fare.
2. Sign out, choose Admin, enter the approved duration, and approve the request.
3. Sign out, choose the original vendor, and publish a future departure. Daily repeats are optional. Schedules use Dhaka time.
4. Sign out, select Passenger, and open /search to choose a trip and seats. Use a fictional name and test email. Pay in Stripe test mode, then wait for the signed webhook to confirm the booking in My Bookings. Use Print / Save PDF for the e-ticket.
5. Review the manifest and sales totals under the vendor and Admin dashboards. Within the passenger session you can cancel a future ticket, then observe its refund state. Demo passenger bookings are tied to the browser session.

A seat hold expires after 10 minutes. Stripe Checkout can stay open longer. A verified late payment goes into the refund workflow when the seat hold is gone.

## Vercel Hobby demo

Import this repo with the Next.js preset. Set the entries from .env.example as server environment variables, with BOOKIFY_URL set to the deployed HTTPS origin. Configure the Stripe test webhook at that origin. Use matching preview/production demo settings and a dedicated Supabase project with synthetic data. The one-click Admin and Vendor identities are shared across demo visitors. Use this only for a non-commercial demonstration.

Stripe test mode is deliberate. Commercial hosting and an eligible Stripe merchant account, protected staff accounts, production access controls and operational readiness are separate requirements. See [Vercel Hobby](https://vercel.com/docs/plans/hobby) and [Stripe availability](https://stripe.com/global).

## Verification

Run npm test, npm run lint and npm run build. After the build, run npm run test:next to verify direct page routes, session cookies and raw Stripe signatures against the production server. Tests cover database approval, scheduling and inventory decisions using embedded Postgres, role and signature handling over local HTTP, and simulated tracking. A hosted smoke test additionally requires configured Supabase and Stripe test credentials.

## Optional demo email

Set RESEND_API_KEY, BOOKIFY_EMAIL_FROM (a sender permitted by Resend) and BOOKIFY_EMAIL_TEST_RECIPIENT in the server environment. Use the same test recipient address when booking. Resend sends a standalone e-ticket after Stripe confirms payment and a notice after Stripe confirms a refund. In both cases, provider idempotency keys reduce duplicate sends during webhook retries. My Bookings remains available with email disabled.
