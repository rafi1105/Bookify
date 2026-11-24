# Phase 1: Multi-Role Authentication & Security

## Objective
Implement secure multi-role access control (Customer, Vendor, Admin) with phone OTP verification and JWT session tokens.

---

## Actionable Execution Chunks

### Chunk 1.1: Phone OTP Engine
- **Tasks**:
  1. Create `/api/auth/otp/send` endpoint.
  2. Generate 6-digit random cryptographically secure OTP with 2-minute Redis TTL: `otp:{phone}`.
  3. Integrate local Bangladesh SMS provider mock / Twilio sandbox.
  4. Create `/api/auth/otp/verify` endpoint.
- **TDD Tests**:
  - `otp-generation.test.ts`: Test OTP generation and Redis TTL expiry.
  - `otp-validation.test.ts`: Test incorrect OTP returns 401; correct OTP creates user or returns JWT.
- **DoD**: User can register or log in with their phone number and receive an auth token.

### Chunk 1.2: Multi-Role RBAC Middleware
- **Tasks**:
  1. Implement JWT verification middleware (`verifyToken`).
  2. Implement RBAC authorization guards (`requireRole(['VENDOR'])`, `requireRole(['ADMIN'])`).
  3. Implement Vendor Multi-Tenant Scoping: automatically filter queries by `req.user.vendorId`.
- **TDD Tests**:
  - Unauthorized customer accessing `/api/vendor/fleet` receives HTTP 403 Forbidden.
  - Valid vendor can only read and mutate their own buses.
- **BDD Reference**: `.agent/bdd/vendor_fleet_and_schedule.feature`
- **DoD**: Multi-role routes are strictly guarded by unit and integration tests.

