# Bookify: Comprehensive Test-Driven Development (TDD) Matrix

Every module in Bookify must pass automated tests before pull request approval or staging deployment.

---

## 1. Test Pyramid & Coverage Mandate

| Level | Scope | Framework | Coverage Target |
|---|---|---|---|
| **Unit Tests** | Service business logic, pricing calculation, coupon validation, Lua scripts | Jest, Vitest, Pytest | $\ge 90\%$ Line Coverage |
| **Integration Tests** | Redis distributed locking, PostgreSQL transactions, bKash webhook parsing | Supertest, Testcontainers | $\ge 85\%$ Endpoint Coverage |
| **Concurrency Tests** | Double-booking race conditions, lock eviction under 1000 concurrent threads | k6, Artillery | 0 Duplicate Bookings |
| **E2E / BDD Tests** | Voice booking flow, seat map selection to checkout, vendor AI schedule approval | Playwright, Cucumber | 100% Critical User Journeys |

---

## 2. Test Suites by Microservice

### 2.1 Booking & Seat Service (`booking-service`)
- `test/unit/seat-layout.test.ts`: Validates 2-2, 1-2, and sleeper seat grid coordinate mapping.
- `test/unit/coupon-discount.test.ts`: Verifies fixed vs percentage discounts, minimum spend, expiry date checks.
- `test/integration/redis-seat-lock.test.ts`:
  - Test Case 1: Acquiring lock on free seat returns 200 and sets 600s TTL.
  - Test Case 2: Attempting to lock already locked seat returns 409 Conflict.
  - Test Case 3: Atomic lock failure when 1 of 3 seats is locked (rollback of all 3).
  - Test Case 4: Releasing lock early with valid token succeeds.
  - Test Case 5: Releasing lock with invalid token fails with 403.
- `test/integration/booking-transaction.test.ts`: Verifies atomic commit of `bookings`, `booking_items`, and payment records within a single database transaction.

### 2.2 Payment Service (`payment-service`)
- `test/unit/bkash-hmac.test.ts`: Validates HMAC-SHA256 signature verification logic.
- `test/integration/payment-webhook.test.ts`:
  - Simulates valid bKash webhook callback.
  - Simulates duplicate/replayed webhook (verifies idempotency).
  - Simulates payment failed callback (verifies seat lock release).
- `test/unit/wallet-refund.test.ts`: Tests 10% fee calculation and atomic balance credit to user wallet.

### 2.3 AI Engine Microservice (`ai-engine`)
- `test/unit/test_whisper_stt.py`: Mock audio transcription tests for Bangla and English audio fixtures.
- `test/unit/test_intent_parser.py`: Evaluates LangChain output parser with 50+ diverse user utterances (Bangla, English, Banglish).
- `test/unit/test_demand_model.py`: Validates Prophet/XGBoost output format and ensures predicted passenger counts are strictly positive integers.
- `test/integration/test_schedule_optimizer.py`: Tests schedule shift calculation logic given low occupancy inputs.

---

## 3. High-Concurrency Race Condition Test Spec (`k6`)

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    seat_lock_rush: {
      executor: 'per-vu-iterations',
      vus: 100, // 100 concurrent users clicking the exact same seat
      iterations: 1,
      maxDuration: '10s',
    },
  },
};

export default function () {
  const payload = JSON.stringify({
    tripId: 'TRIP-DHAKA-KHULNA-101',
    seatNumbers: ['A1'],
    userId: `user_${__VU}`,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post('http://localhost:4001/api/seats/lock', payload, params);

  // Exactly 1 user MUST receive 200 OK. The other 99 MUST receive 409 Conflict.
  check(res, {
    'status is 200 or 409': (r) => r.status === 200 || r.status === 409,
  });
}
```

