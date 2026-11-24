# Bookify: Technical Sequence Flows & Concurrency Model

> **Reference Diagram**: [Technical Sequence Diagram](file:///d:/VS%20Code/agency/websites%20bussine/Bookify/.agent/diagrams/technical-sequence-diagram.jpg) (Slide 14 / `image14.jpg` from `bookify_slider_plan.pptx`).

---

## Flow 1: Standard Seat Selection & Real-Time Redis Locking

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Web/App)
    participant FE as Frontend UI
    participant GW as API Gateway (NGINX)
    participant BS as Booking Service
    participant Redis as Seat Lock Manager (Redis)
    participant DB as PostgreSQL (Core DB)
    participant PG as Payment Gateway (bKash/SSL)
    participant NS as Notification Service

    Customer->>FE: Search Trip ("Dhaka -> Khulna, 2 Seats, AC")
    FE->>GW: GET /api/trips?from=Dhaka&to=Khulna&date=2026-10-20
    GW->>BS: Forward search query
    BS->>DB: Query available trips & schedules
    BS->>Redis: Check current locked seat keys for trips
    Redis-->>BS: Return active seat locks
    BS-->>FE: Return available trips with real-time seat availability
    FE-->>Customer: Render interactive seat picker

    Customer->>FE: Selects Seat "A1"
    FE->>GW: POST /api/seats/lock { tripId, seatNumbers: ["A1"], userId }
    GW->>BS: Acquire Seat Lock Request
    
    rect rgb(240, 248, 255)
        note over BS,Redis: Concurrency Lock via Atomic Redis Lua Script (10 Min TTL)
        BS->>Redis: EVAL script: Check if A1 exists in lock:trip:{id}:seat:A1. If free: SETNX EX 600
        alt Seat is Already Locked
            Redis-->>BS: Lock Rejected (Key exists, locked by another user)
            BS-->>FE: HTTP 409 Conflict: "Seat A1 is currently held by another customer"
            FE-->>Customer: Display seat lock warning & refresh map
        else Seat is Free
            Redis-->>BS: Lock Acquired (TTL = 600 seconds)
            BS-->>FE: HTTP 200 OK { lockedUntil: "timestamp + 10min", lockToken }
            FE-->>Customer: Highlight seat in yellow/pending with countdown timer (10:00)
        end
    end

    Customer->>FE: Enter Passenger Details & Choose Payment (bKash)
    FE->>GW: POST /api/payment/checkout { tripId, seats: ["A1"], method: "BKASH" }
    GW->>BS: Initialize Checkout
    BS->>PG: Create Payment Intent / Order
    PG-->>FE: Return bKash Payment URL / Modal Token
    Customer->>PG: Complete PIN / OTP verification
    PG-->>BS: Webhook: Payment Success { txnId: "TRX98421", amount: 1200, status: "SUCCESS" }
    
    rect rgb(240, 255, 240)
        note over BS,DB: Commit Booking Transaction & Finalize Seat Status
        BS->>DB: BEGIN Transaction
        BS->>DB: INSERT INTO bookings, booking_items, payments
        BS->>DB: COMMIT Transaction
        BS->>Redis: DEL lock:trip:{id}:seat:A1 (Clean release of temporary lease)
    end

    BS->>DB: INSERT INTO invoices (Encrypted QR Code Token + PDF)
    BS->>NS: Trigger Booking Confirmation Event
    par Async Dispatch
        NS->>Customer: Send SMS with Ticket Code & Booking Confirmation
        NS->>Customer: Send Push Notification (FCM)
    end
    BS-->>FE: Return Confirmed Ticket Object with QR Payload
    FE-->>Customer: Display Animated Confirmation & Downloadable QR Ticket
```

---

## Flow 2: AI-Driven Schedule Optimization & Vendor Response

```mermaid
sequenceDiagram
    autonumber
    participant DB as PostgreSQL / BigQuery
    participant AI as AI Engine (FastAPI)
    participant Redis as Redis Stream Queue
    actor Vendor as Vendor / Bus Operator
    participant VS as Fleet & Vendor Service

    Note over AI,DB: Continuous Telemetry Monitoring Loop
    AI->>DB: Fetch historical trip occupancy, delays, weather, festival dates
    AI->>AI: Run Prophet / XGBoost Demand Forecast Model
    AI->>AI: Evaluate Fleet Schedule Efficiency
    
    alt Schedule Inefficiency Detected
        Note over AI: E.g., 10:00 PM Trip has 32% occupancy; 01:00 PM has 135% demand spike
        AI->>Redis: Enqueue Optimization Recommendation { vendorId, route: "Dhaka->Cox", shiftTo: "13:00", projectedGain: "+18%" }
        Redis->>VS: Dispatch AI Recommendation Record to Vendor Dashboard
        VS->>Vendor: Alert: "AI Advisor: Move Bus from 10 PM to 1 PM next Friday to gain +18% revenue"
        
        alt Vendor Approves Recommendation
            Vendor->>VS: POST /api/vendor/recommendations/{id}/approve
            VS->>DB: UPDATE trip_schedules SET departure_time = '13:00:00' WHERE id = ...
            VS->>DB: UPDATE ai_recommendations SET status = 'APPROVED'
            VS-->>Vendor: Schedule updated successfully! New slots published to Search.
        else Vendor Rejects Recommendation
            Vendor->>VS: POST /api/vendor/recommendations/{id}/reject { reason: "Driver maintenance" }
            VS->>DB: UPDATE ai_recommendations SET status = 'REJECTED'
            VS->>AI: Log feedback into AI training buffer for reinforcement tuning
        end
    end
```

