# SDD-01: Real-Time Distributed Seat Lock Manager

## 1. Problem Definition
During festival rushes (Eid, Puja, New Year), thousands of users attempt to book the same bus seats simultaneously. Without strict atomic concurrency control, systems suffer from:
- **Double Bookings**: Multiple users charged for the same seat.
- **Phantom Locks**: Seats permanently locked due to crashed user sessions.
- **Database Hotspots**: High lock contention causing PostgreSQL connection pool exhaustion.

## 2. Architecture & Design Principles (Supabase Free Plan & Upstash)
- **Zero-Cost Native Implementation**: Concurrency locks are managed natively via **Supabase PostgreSQL Atomic Stored Procedure (`acquire_seat_lock`)** and broadcast in real-time via **Supabase Realtime WebSockets** to all connected clients.
- **Optional Redis Cache**: Upstash Redis Free Tier (10,000 commands/day) can be layered as an in-memory edge cache.
- **Lease Timeout**: Every lock has a hard TTL of **600 seconds (10 minutes)**. If payment is not finalized within 10 minutes, the lock expires and is evicted, freeing the seat.
- **Supabase Realtime Broadcast**: When `acquire_seat_lock` is invoked, Supabase automatically pushes the updated seat status on the `trip-seats-{tripId}` channel to all browser sessions without polling.

---

## 3. Supabase RPC Stored Procedure (`acquire_seat_lock`)

Executed inside a single atomic database transaction via Supabase:
```sql
SELECT public.acquire_seat_lock(
    p_trip_id := 'c1f7a2d8-...',
    p_seat_numbers := ARRAY['A1', 'A2'],
    p_user_id := 'user-uuid',
    p_ttl_seconds := 600
);
```
- **Returns**: `{ "success": true, "lockToken": "uuid", "lockedSeats": ["A1", "A2"], "expiresAt": "2026-10-16T16:15:00Z" }`
- **On Conflict**: `{ "success": false, "error": "SEAT_ALREADY_LOCKED", "seat": "A1" }` (HTTP 409)

---

## 4. Redis Data Structures (Alternative / Edge Cache)

### Key Format
`lock:trip:{tripId}:seat:{seatNumber}`

### Value Payload (JSON)
```json
{
  "userId": "usr_99182",
  "lockToken": "token_uuid4",
  "lockedAt": 1792150000000,
  "expiresAt": 1792150600000
}
```

## 4. Atomic Lua Scripts

### 4.1 Acquire Lock Script (`acquire_seat_lock.lua`)
```lua
-- KEYS: array of seat lock keys e.g. {"lock:trip:1:seat:A1", "lock:trip:1:seat:A2"}
-- ARGV[1]: user payload JSON
-- ARGV[2]: TTL in seconds (e.g. 600)

-- Step 1: Verify none of the requested seats are already locked
for i, key in ipairs(KEYS) do
    if redis.call("EXISTS", key) == 1 then
        return {0, key} -- Failure: seat key is already locked
    end
end

-- Step 2: All seats are free. Acquire lock on all requested seats
for i, key in ipairs(KEYS) do
    redis.call("SET", key, ARGV[1], "EX", ARGV[2])
end

return {1, "OK"} -- Success: all seats locked atomically
```

### 4.2 Release Lock Script (`release_seat_lock.lua`)
```lua
-- KEYS[1]: lock key
-- ARGV[1]: lockToken to ensure only the owner can release early

local currentVal = redis.call("GET", KEYS[1])
if not currentVal then
    return 1 -- Already expired or deleted
end

local decoded = cjson.decode(currentVal)
if decoded.lockToken == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0 -- Unauthorized release attempt
end
```

## 5. Failure Recovery & Edge Cases
1. **Network Disconnect**: If the user closes their browser or app, the Redis TTL ensures the lock expires automatically after 600 seconds.
2. **Partial Multi-Seat Failure**: The Lua script checks all seats before acquiring any lock. If seat `A1` is free but `A2` is taken, no lock is created, and the user receives a clean `409 Conflict`.
3. **Payment Completion Race**: When the payment webhook arrives, the booking service commits the record to PostgreSQL inside a transaction and then executes `DEL` on the Redis keys.

