# Bookify Core Agent Rules & Constraints

## 1. Codebase Boundaries
- Frontend Web: Located in `src/` (or `apps/web/` if monorepo). Uses React 19 / Next.js, Pure External CSS (`src/styles/`), Lucide icons.
- Microservices: Located in `services/` (or `backend/`):
  - `services/booking-service`
  - `services/fleet-service`
  - `services/user-service`
  - `services/payment-service`
  - `services/ai-engine` (Python / FastAPI)
- Shared Contracts & Types: `.agent/architecture/` and shared packages.

## 2. SDD Requirements
- Do not add random columns or invent API routes. All schemas must match `.agent/architecture/DATABASE_SCHEMA.md` and `.agent/architecture/API_SPECIFICATION.md`.
- Consult the relevant SDD document in `.agent/sdd/` before writing logic.

## 3. TDD Requirements
- All services must maintain unit tests.
- When creating an endpoint, write the test case first in `tests/` verifying standard 200/201 response, validation 400 error, unauthorized 401, and conflict 409 (e.g., seat already locked).

## 4. Concurrency Guardrails
- NEVER directly write seat occupancy to PostgreSQL without first acquiring the Redis distributed lock.
- Always use transactional boundaries (`BEGIN ... COMMIT`) when finalizing a booking.
- Prevent Phantom Reads and race conditions by setting seat lock TTL to 600 seconds.

## 5. Security & Multi-Tenant Isolation
- Vendors MUST NOT see other vendors' revenue, buses, or drivers.
- All vendor queries must include `WHERE vendor_id = :vendorId`.
- Admin endpoints require `role === 'ADMIN'`.
- Passwords must be hashed using bcrypt or Argon2.
- Payment webhooks must verify HMAC signatures before updating any booking status.

## 6. Strict External CSS Mandate (Zero Tailwind, Zero Inline Styles)
- Use ONLY pure external CSS located in `src/styles/` (`variables.css`, `global.css`, `liquid-glass.css`, `components.css`, `pages.css`).
- NEVER use Tailwind CSS, Tailwind utility classes, or PostCSS tailwind plugins.
- NEVER use inline CSS (`style={{ ... }}` or `style="..."`) anywhere in JSX or HTML.
- Component-specific styles and animations must be defined in `src/styles/components.css` or `src/styles/pages.css`.

