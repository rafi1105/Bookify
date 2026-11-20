# Bookify: RESTful & Streaming API Specification

All services expose standards-compliant REST endpoints secured via Bearer JWT and API keys.

---

## 1. Authentication & RBAC Service (`/api/auth`)

### 1.1 Phone OTP Login
- `POST /api/auth/otp/send`
  - Body: `{ "phone": "+8801711223344" }`
  - Response: `{ "status": "OTP_SENT", "expiresIn": 120 }`
- `POST /api/auth/otp/verify`
  - Body: `{ "phone": "+8801711223344", "code": "654321" }`
  - Response: `{ "accessToken": "eyJ...", "refreshToken": "eyJ...", "user": { "id": "...", "role": "CUSTOMER" } }`

### 1.2 Multi-Role Email Login
- `POST /api/auth/login`
  - Body: `{ "email": "operator@greenline.com", "password": "securePassword123" }`
  - Response: `{ "accessToken": "eyJ...", "role": "VENDOR", "vendorId": "uuid" }`

---

## 2. Trips, Routes & Fleet Service (`/api/trips`, `/api/routes`)

### 2.1 Search Trips
- `GET /api/trips?from=Dhaka&to=Chittagong&date=2026-10-25&busType=AC_BUSINESS`
  - Response:
    ```json
    {
      "count": 4,
      "trips": [
        {
          "id": "c1f7a2d8-...",
          "operatorName": "Green Line Paribahan",
          "busModel": "Scania Multi-Axle",
          "busType": "AC_BUSINESS",
          "departureTime": "08:00 AM",
          "arrivalTime": "02:30 PM",
          "fare": 1400.00,
          "availableSeats": 18,
          "totalSeats": 28
        }
      ]
    }
    ```

---

## 3. Real-Time Seat Management Service (`/api/seats`)

### 3.1 Get Live Seat Map & Availability
- `GET /api/seats/:tripId/map`
  - Response:
    ```json
    {
      "tripId": "c1f7a2d8-...",
      "layout": "2-2",
      "seats": [
        { "seatNumber": "A1", "status": "AVAILABLE", "price": 1400.00 },
        { "seatNumber": "A2", "status": "LOCKED", "lockedUntil": "2026-10-16T15:55:00Z" },
        { "seatNumber": "B1", "status": "BOOKED", "gender": "MALE" }
      ]
    }
    ```

### 3.2 Acquire Distributed 10-Minute Seat Lock
- `POST /api/seats/lock`
  - Headers: `Authorization: Bearer <jwt>`
  - Body: `{ "tripId": "c1f7a2d8-...", "seatNumbers": ["A1", "A2"] }`
  - Success (200 OK):
    ```json
    {
      "success": true,
      "lockToken": "lk_9f41a87b",
      "lockedSeats": ["A1", "A2"],
      "lockedUntil": "2026-10-16T15:55:00.000Z",
      "ttlSeconds": 600
    }
    ```
  - Conflict (409 Conflict):
    ```json
    {
      "success": false,
      "error": "SEAT_ALREADY_LOCKED",
      "conflictSeats": ["A1"],
      "message": "Seat A1 is currently being reserved by another customer."
    }
    ```

### 3.3 Explicit Release of Seat Lock
- `POST /api/seats/release`
  - Body: `{ "tripId": "c1f7a2d8-...", "lockToken": "lk_9f41a87b" }`
  - Response: `{ "success": true, "message": "Seats released" }`

---

## 4. Booking & Payment Service (`/api/book`, `/api/payment`)

### 4.1 Create Booking Intent
- `POST /api/book/create`
  - Body:
    ```json
    {
      "tripId": "c1f7a2d8-...",
      "lockToken": "lk_9f41a87b",
      "passengers": [
        { "name": "Shohail Ahmmed", "age": 24, "gender": "MALE", "seatNumber": "A1" }
      ],
      "paymentMethod": "BKASH"
    }
    ```
  - Response:
    ```json
    {
      "bookingId": "bk_771829",
      "totalAmount": 1400.00,
      "paymentRedirectUrl": "https://payment.bkash.com/redirect?token=..."
    }
    ```

### 4.2 bKash & SSLCommerz Payment Webhook
- `POST /api/payment/webhook/bkash`
  - Headers: `X-Signature: <hmac-sha256>`
  - Body:
    ```json
    {
      "paymentID": "TR001192",
      "trxID": "9H7182KA",
      "transactionStatus": "Completed",
      "amount": "1400.00",
      "currency": "BDT",
      "merchantInvoiceNumber": "INV-20261016-01"
    }
    ```
  - Processing:
    1. Verify HMAC SHA-256 signature using `BKASH_APP_SECRET`.
    2. Commit booking in PostgreSQL (`status = 'CONFIRMED'`).
    3. Clear Redis seat lock.
    4. Generate encrypted QR code and PDF invoice.
    5. Trigger SMS confirmation to passenger.

---

## 5. AI Engine Microservice (`/api/ai` - FastAPI)

### 5.1 Voice Booking: Speech-to-Text & Intent Recognition
- `POST /api/ai/voice/pipeline`
  - Multipart Form: `audio: <binary_audio_file> (WAV/WebM)`
  - Response:
    ```json
    {
      "sttTranscript": "আগামীকাল ঢাকা থেকে খুলনার দুইটা এসি টিকিট বুক করো।",
      "detectedLanguage": "bn-BD",
      "intent": "BOOK_TICKET",
      "entities": {
        "origin": "Dhaka",
        "destination": "Khulna",
        "date": "2026-10-17",
        "seatCount": 2,
        "busType": "AC"
      },
      "clarificationNeeded": false,
      "recommendedTrips": [
        { "tripId": "...", "operator": "Eagle Paribahan", "time": "09:30 AM", "fare": 1100.00 }
      ]
    }
    ```

### 5.2 Predictive Demand Forecasting
- `GET /api/ai/forecast/demand?routeId=...&targetDate=2026-10-23`
  - Response:
    ```json
    {
      "route": "Dhaka -> Cox's Bazar",
      "targetDate": "2026-10-23",
      "isHoliday": true,
      "holidayName": "Weekend & Puja Holiday",
      "predictedPassengers": 520,
      "currentlyAllocatedSeats": 360,
      "recommendedBuses": 14,
      "busShortage": 4,
      "confidenceScore": 0.94
    }
    ```

### 5.3 Schedule Optimization Engine
- `GET /api/ai/schedule/recommendations?vendorId=...`
  - Response:
    ```json
    {
      "recommendations": [
        {
          "id": "rec_01",
          "type": "SCHEDULE_SHIFT",
          "route": "Dhaka -> Khulna",
          "currentDeparture": "22:00:00",
          "suggestedDeparture": "13:00:00",
          "reason": "High afternoon traffic demand, 10 PM slot has only 32% historical occupancy",
          "projectedRevenueIncrease": "+18.4%",
          "status": "PENDING_APPROVAL"
        }
      ]
    }
    ```


## Hosted demo contract

The v1 demo uses /api/trips, /api/session, /api/workspace, /api/checkout, /api/bookings and /api/stripe/webhook as described in [the hosted demo contract](../sdd/sdd-06-hosted-demo.md).
