Feature: High-Concurrency Seat Selection & Distributed Locking
  As a bus passenger
  I want to select and lock my chosen seats for 10 minutes
  So that no other passenger can book the same seats while I complete my payment

  Background:
    Given a scheduled trip "TRIP-DHAKA-KHULNA-101" exists on "2026-10-25"
    And the bus has 36 seats with layout "2-2"
    And seat "A1" and seat "A2" are currently "AVAILABLE"

  Scenario: Successfully locking seats with a 10-minute lease
    Given customer "Shohail" is authenticated
    When "Shohail" requests to lock seats ["A1", "A2"] on trip "TRIP-DHAKA-KHULNA-101"
    Then the Redis seat lock should be created with key "lock:trip:TRIP-DHAKA-KHULNA-101:seat:A1"
    And the Redis seat lock should be created with key "lock:trip:TRIP-DHAKA-KHULNA-101:seat:A2"
    And both locks should have a TTL of 600 seconds
    And "Shohail" receives HTTP 200 with lock token and timer set to 10 minutes

  Scenario: Prevent double-booking when two users click the same seat simultaneously
    Given customer "Shohail" has locked seat "A1" on trip "TRIP-DHAKA-KHULNA-101"
    When customer "Rabeya" requests to lock seat "A1" on trip "TRIP-DHAKA-KHULNA-101"
    Then the request for "Rabeya" must be rejected with HTTP 409 Conflict
    And the error code should be "SEAT_ALREADY_LOCKED"
    And seat "A1" must remain exclusively allocated to "Shohail"

  Scenario: Automatic lock eviction upon payment timeout
    Given customer "Shohail" locked seat "A1" on trip "TRIP-DHAKA-KHULNA-101"
    When 600 seconds elapse without a successful payment confirmation
    Then Redis must automatically evict key "lock:trip:TRIP-DHAKA-KHULNA-101:seat:A1"
    And when customer "Rabeya" views the seat map, seat "A1" must show as "AVAILABLE"

  Scenario: Finalizing booking commitment upon payment webhook
    Given customer "Shohail" has locked seat "A1" with lock token "token_123"
    When the payment gateway sends a verified webhook with status "SUCCESS" for booking "BK-901"
    Then the booking status in PostgreSQL must change to "CONFIRMED"
    And seat "A1" must be persisted as permanently booked
    And the Redis lock key "lock:trip:TRIP-DHAKA-KHULNA-101:seat:A1" must be deleted
    And an encrypted QR ticket must be generated for "Shohail"

