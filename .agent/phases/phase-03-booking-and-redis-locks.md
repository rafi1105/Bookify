# Phase 3: High-Concurrency Seat Locking & Booking

## Objective
Implement high-performance trip search, interactive seat maps, and atomic Redis-based distributed seat locking with 10-minute lease timeouts.

---

## Actionable Execution Chunks

### Chunk 3.1: Trip Search & Real-Time Availability
- **Tasks**:
  1. Implement `GET /api/trips` endpoint filtering by origin, destination, date, bus type, and operator.
  2. Merge static database seat inventory with live Redis lock states to compute exact remaining seats.
- **TDD Test**: `search-trips.test.ts` validates date filtering and seat count deduction.
- **DoD**: Searching for "Dhaka -> Cox's Bazar" returns active trips with correct pricing and seat counts.

### Chunk 3.2: Distributed Seat Lock Engine
- **Tasks**:
  1. Implement Lua script `acquire_seat_lock.lua` for atomic multi-seat locks.
  2. Implement `POST /api/seats/lock` endpoint with 600s TTL.
  3. Implement `POST /api/seats/release` endpoint with token verification.
- **SDD Reference**: `.agent/sdd/sdd-01-seat-lock-manager.md`
- **BDD Reference**: `.agent/bdd/booking_seat_concurrency.feature`
- **TDD Tests**:
  - `redis-lock.test.ts`: Test lock acquisition, rejection on taken seats, and automatic TTL expiry.
- **DoD**: Concurrent lock requests are resolved atomically with 0 duplicate leases.

### Chunk 3.3: High-Concurrency Load Testing
- **Tasks**:
  1. Write and run k6 load testing script simulating 100 concurrent virtual users competing for seat `A1`.
  2. Assert that exactly 1 user succeeds (HTTP 200) and 99 users receive HTTP 409 Conflict.
- **DoD**: Concurrency stress test passes with zero double-locking anomalies.

