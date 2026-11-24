# Phase 0: Foundation & Infrastructure Setup

## Objective
Establish local containerized development environments, database migration pipelines, and API Gateway scaffolding.

---

## Actionable Execution Chunks

### Chunk 0.1: Supabase Free Tier Setup & Schema Migration
- **Tasks**:
  1. Set up a free Supabase project on `supabase.com`.
  2. Execute [`supabase/migrations/20261016_init_bookify_schema.sql`](file:///d:/VS%20Code/agency/websites%20bussine/Bookify/supabase/migrations/20261016_init_bookify_schema.sql) in the Supabase SQL Editor.
  3. Verify all 23 core tables, RLS policies, and the `acquire_seat_lock` / `release_seat_lock` RPC functions are created.
  4. Verify Supabase Realtime is enabled on `seat_locks` and `trips`.
- **DoD**: All 23 tables exist in Supabase and `SELECT acquire_seat_lock(...)` executes successfully in the SQL Editor.

### Chunk 0.2: Client-Side Supabase Integration
- **Tasks**:
  1. Populate `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  2. Verify [`src/lib/supabase.js`](file:///d:/VS%20Code/agency/websites%20bussine/Bookify/src/lib/supabase.js) initializes cleanly without throwing errors.
  3. Test connection by querying `public.routes` from the frontend.
- **DoD**: Frontend communicates with Supabase and receives table records.

### Chunk 0.3: Vercel Free Tier Deployment Setup
- **Tasks**:
  1. Configure [`vercel.json`](file:///d:/VS%20Code/agency/websites%20bussine/Bookify/vercel.json) with SPA rewrites and serverless function headers.
  2. Run `npm run build` locally to ensure production bundles compile cleanly (dist/ generated).
  3. Add Supabase environment variables into Vercel project settings (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- **DoD**: Project builds in under 10 seconds and deploys to Vercel's global edge network.

