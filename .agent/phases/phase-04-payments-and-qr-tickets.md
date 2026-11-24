# Phase 4: Payments, Encrypted QR & Notifications

## Objective
Integrate local Bangladesh payment gateways (bKash, Nagad, SSLCommerz, Stripe), process asynchronous webhooks, issue cryptographically signed QR tickets, and dispatch notifications.

---

## Actionable Execution Chunks

### Chunk 4.1: Gateway Integration & Webhook Handler
- **Tasks**:
  1. Implement bKash tokenized checkout & execute payment flow.
  2. Implement SSLCommerz session creation & IPN listener.
  3. Implement Stripe payment intent flow for international cards.
  4. Implement webhook receiver with HMAC signature validation and idempotency protection.
- **SDD Reference**: `.agent/sdd/sdd-03-payment-and-ticket-generation.md`
- **BDD Reference**: `.agent/bdd/payment_gateway_lifecycle.feature`
- **DoD**: Webhook confirms payment, updates booking to `CONFIRMED`, and deletes Redis temporary locks.

### Chunk 4.2: Encrypted Offline-Verifiable QR Ticket Generator
- **Tasks**:
  1. Generate cryptographically signed JWT containing ticket verification payload.
  2. Encode signed token into QR code PNG data URL using `qrcode` library.
  3. Create Conductor offline verification API: `POST /api/invoices/verify-qr` to check validity.
- **DoD**: QR code can be scanned and validated both online and offline.

### Chunk 4.3: PDF Tax Invoice & Notification Dispatch
- **Tasks**:
  1. Generate branded PDF ticket invoice with passenger itinerary, fare, 5% VAT, and QR code.
  2. Integrate Firebase Cloud Messaging (FCM) for push notifications.
  3. Integrate SMS gateway mock for booking confirmation dispatch.
- **DoD**: Upon payment success, passenger receives SMS and downloadable PDF ticket.

