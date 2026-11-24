# SDD-03: Payments, Invoicing & Encrypted QR Ticketing

## 1. Overview
Bookify provides a seamless checkout experience supporting Bangladesh-specific MFS providers (**bKash, Nagad, Rocket**), aggregator gateways (**SSLCommerz**), international credit/debit cards (**Stripe**), and an internal **Bookify Wallet** with instant refunds.

---

## 2. Payment Gateway Lifecycle & State Machine

```
[INITIATED] -> [REDIRECTED / MODAL OPEN]
                      |
        +-------------+-------------+
        |                           |
  (Payment Success)           (Failure / Cancel)
        |                           |
        v                           v
  [VERIFY_WEBHOOK]             [FAILED / CANCELLED]
        |                           |
  (HMAC Validated)             (Release Redis Lock)
        |
        v
   [CONFIRMED]
        |
        +--> Commit PostgreSQL Booking
        +--> Evict Redis Lock
        +--> Issue Encrypted QR Ticket
        +--> Render PDF Tax Invoice
        +--> Send SMS / Push Notification
```

---

## 3. Bangladesh MFS Integration Details

### 3.1 bKash Tokenized Checkout
- **Flow**:
  1. `grantToken`: Authenticate using `app_key` and `app_secret`.
  2. `createPayment`: Send `amount`, `invoiceNumber`, `callbackURL`.
  3. User enters PIN on bKash secure gateway.
  4. `executePayment`: Confirms and captures transaction.
  5. Webhook listener verifies signature and prevents replay attacks using nonces.

### 3.2 SSLCommerz & Nagad
- **SSLCommerz**:
  - Validates `tran_id` and `val_id` via SSLCommerz Order Validation API.
  - IPN (Instant Payment Notification) listener handles asynchronous network drops.
- **Nagad**:
  - RSA public key encryption for payload security.

---

## 4. Encrypted Offline-Verifiable QR Ticketing

### QR Payload Architecture
To enable ticket inspectors and bus conductors to verify tickets even in remote highway areas with no cellular network:
- The QR code contains a cryptographically signed JWT.
- **JWT Claims**:
  ```json
  {
    "iss": "bookify-transport",
    "sub": "tkt_819203",
    "trip": "c1f7a2d8",
    "bus": "DHA-MET-11-2092",
    "date": "2026-10-25",
    "seats": ["A1", "A2"],
    "pax": "Md. Shohail",
    "status": "PAID",
    "sig": "HMAC-SHA256"
  }
  ```
- The mobile Conductor App has the public key pre-loaded and can scan and validate the ticket authenticity instantly without internet access.

---

## 5. Automated PDF Tax Invoice Generation
- **Generator**: Headless HTML-to-PDF / PDFKit renderer.
- **Contents**:
  - Operator logo, company VAT registration number.
  - Passenger itinerary, boarding point location, departure time.
  - Fare breakdown: Base fare, 5% VAT, platform fee, coupon discount.
  - High-resolution QR code and bar code.
- **Storage**: Uploaded directly to S3 / Cloudflare R2 bucket with signed expiring download URLs.

