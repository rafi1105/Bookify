---
name: bangladesh-payments
description: Expertise in integrating Bangladeshi payment gateways (bKash, Nagad, Rocket, SSLCommerz), Stripe, encrypted QR ticket signing, and PDF tax invoices.
---

# Bangladesh Payments & QR Ticketing Skill

Activate this skill when implementing checkout gateways, payment webhooks, HMAC signature verification, QR ticket generation, or wallet balance refunds.

## Core Directives
1. **Never trust client-side payment completion**:
   - Always await and cryptographically verify the server-to-server webhook callback from bKash, Nagad, SSLCommerz, or Stripe.
2. **Idempotency**:
   - Webhook endpoints must be strictly idempotent. If the same `trxID` is received twice, return 200 OK without creating duplicate ticket or payment records.
3. **Encrypted QR Generation**:
   - QR tickets must encode a signed JWT containing passenger details, trip ID, and seat numbers to allow offline verification by bus conductors.
4. **Wallet & Refunds**:
   - When a ticket is cancelled, calculate the cancellation fee and immediately credit the remainder to the user's Bookify Wallet balance within an atomic transaction.

