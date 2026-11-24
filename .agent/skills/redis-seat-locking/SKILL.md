---
name: redis-seat-locking
description: Expertise in high-concurrency seat locking, distributed locking with Redis, atomic Lua scripts, TTL leases, and preventing phantom bookings during festival rush.
---

# Redis Distributed Seat Locking Skill

Activate this skill when designing, implementing, or debugging seat reservation concurrency, seat layout mapping, and race condition prevention.

## Core Rules
1. **Never write direct database locks for preliminary seat selection**:
   - Use Redis `SET key value NX EX 600`.
   - Never hold a long-lived database transaction while a customer is entering credit card or OTP details.
2. **Key Conventions**:
   - `lock:trip:{tripId}:seat:{seatNumber}`
3. **Atomic Lua Execution**:
   - Always run multi-seat reservation using `acquire_seat_lock.lua`.
   - If any seat fails, immediately abort and release all locks.
4. **Clean Finalization**:
   - When payment completes, commit `bookings` and `booking_items` to PostgreSQL, then delete the Redis lock keys.
   - If payment times out, let Redis automatically expire the key.

