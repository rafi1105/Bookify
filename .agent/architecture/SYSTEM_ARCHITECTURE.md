# Bookify: System Design Architecture Blueprint

> **Reference Diagram**: [System Design Architecture Diagram](file:///d:/VS%20Code/agency/websites%20bussine/Bookify/.agent/diagrams/system-design-architecture.png) (Slide 15 / `image17.png` from `bookify_slider_plan.pptx`).

```
========================================================================================================================
                                       SYSTEM DESIGN ARCHITECTURE:
                        Smart Bus E-Ticket Booking & AI Transport Management Platform
                               (Supabase Free Plan + Vercel Free Plan Cloud Stack)
========================================================================================================================

CLIENT APPLICATIONS & HOSTING LAYER (Vercel Free Tier):
+-------------------------------------------------+     +-------------------------------------------------+
|            React Native Mobile App              |     |          Next.js / Vite React Web App           |
|       (Expo, Tailwind, Cross-Platform UI)       |     |   (React 19, Tailwind, Three.js, GSAP Viewer)   |
+-------------------------------------------------+     +-------------------------------------------------+
                                      \                             /
                                       \                           /
                                   Vercel Edge Network / Global CDN
                                         \                       /
VERCEL SERVERLESS & API ROUTING:          v                     v
+---------------------------------------------------------------------------------------------------------+
|                                    Vercel Serverless API Functions                                      |
|                       (/api/book, /api/seats, /api/payment/webhook, /api/ai/voice)                      |
+---------------------------------------------------------------------------------------------------------+
       |                                                                               |
       v                                                                               v
BACKEND CLOUD PLATFORM (Supabase Free Plan):                        AI & PREDICTIVE INTELLIGENCE:
+------------------------------------------------------------------+ +-----------------------------------+
|                           SUPABASE                               | | FastAPI / Serverless AI Engine    |
|  +---------------------------+    +---------------------------+  | | - Whisper Speech-to-Text          |
|  | Supabase Auth             |    | Supabase Realtime         |  | | - Multilingual LangChain NLP     |
|  | (Phone OTP, Email, RBAC)  |    | (Live Seat Map WebSocket) |  | |   (Bangla, English, Banglish)     |
|  +---------------------------+    +---------------------------+  | | - Demand Forecast (Prophet/XGB)   |
|  +---------------------------+    +---------------------------+  | | - Schedule Optimization Advisor   |
|  | PostgreSQL (23 Tables)    |    | Supabase Storage          |  | +-----------------------------------+
|  | (RLS Multi-Tenant Scoping)|    | (Encrypted QR & Invoices) |  |   |
|  +---------------------------+    +---------------------------+  |   | Push AI Suggestions & Alerts
|  +---------------------------+    +---------------------------+  |   v
|  | Atomic RPC Stored Procs   |    | Supabase Edge Functions   |--+---+
|  | (10-min Seat Lock Engine) |    | (Deno / TypeScript API)   |
|  +---------------------------+    +---------------------------+
+------------------------------------------------------------------+
                               |
DISTRIBUTED CACHE & LEASE:     v
+------------------------------------------------------------------+
| Upstash Redis Free Tier (10,000 req/day) / Postgres Advisory Locks |
| Key: lock:trip:{tripId}:seat:{seatNo} (TTL: 600s)                 |
+------------------------------------------------------------------+
```

---

## 1. Client Applications Layer
1. **Next.js / React Web Application**:
   - Customer booking portal, interactive bus seat layout (2-2 and 1-2 configurations), live seat lock indicators, 3D bus inspection using Three.js & GSAP.
   - Vendor Operator SaaS portal: Bus scheduling, driver allocation, revenue charts, AI schedule approval inbox.
   - Admin Control Center: User management, operator vetting, platform telemetry, AI configuration.
2. **React Native (Expo) Mobile App**:
   - Native voice booking interface with tap-to-talk mic, push notifications, offline QR ticket storage.

---

## 2. API Gateway & Load Balancer Layer (NGINX)
- Serves as the single ingress point on ports `80` (HTTP redirect) and `443` (HTTPS / TLS 1.3).
- Path routing:
  - `/api/book/*`, `/api/seats/*`, `/api/trips/*` -> `booking-seat-service:4001`
  - `/api/fleet/*`, `/api/routes/*` -> `fleet-route-service:4002`
  - `/api/auth/*`, `/api/users/*`, `/api/admin/*` -> `user-admin-service:4003`
  - `/api/payment/*`, `/api/wallet/*` -> `payment-service:4004`
  - `/api/analytics/*`, `/api/reports/*` -> `analytics-reporting-service:4005`
  - `/api/notify/*` -> `notification-service:4006`
  - `/api/ai/*`, `/api/voice/*` -> `ai-engine-service:8000`
- Rate Limiting: 60 requests/minute per IP on search, 10 requests/minute on booking/seat locking to prevent scraping and lock hoarding.

---

## 3. Microservices Breakdown

### 3.1 Booking & Seat Service (`Node.js / Express`)
- **Core Function**: Real-time seat inventory, high-concurrency seat locking, booking lifecycle.
- **Seat Locking Mechanism**:
  - Uses Redis `SET key value NX EX 600` (10-minute temporary lease).
  - Lock Key: `lock:trip:{tripId}:seat:{seatNo}`.
  - Value: `{ userId: string, lockedAt: timestamp, expiresAt: timestamp }`.
  - Atomic Multi-Seat Lock via Lua script to avoid partial locks.
- **State Machine**: `SEAT_FREE` -> `SEAT_LOCKED` (10m) -> `PAYMENT_PENDING` -> `BOOKED` (persisted to PostgreSQL) or `RELEASED_EXPIRED`.

### 3.2 Fleet & Route Management Service (`Node.js / Fastify`)
- **Core Function**: Bus operator management, vehicle fleet registration (AC / Non-AC, Sleeper / Seater), route geometry and intermediate stops with travel durations, driver rosters.
- **Trip Generator**: Automatically instantiates daily trips from recurring trip schedule templates.

### 3.3 User & Admin Service (`Node.js / Express / Supabase`)
- **Core Function**: Authentication & Multi-Role Access Control (`CUSTOMER`, `VENDOR`, `ADMIN`).
- **Auth Modes**: Phone OTP (Twilio / Greenweb SMS), Email + Password (Argon2 / bcrypt), OAuth (Google / Facebook).
- **JWT Standard**: 15-minute access token + 7-day refresh token stored in secure HTTP-only cookies.

### 3.4 Payment Service (`Node.js / Express`)
- **Core Function**: Integrates local and global payment gateways:
  - Local BD: **bKash** (Tokenized Checkout & Webhooks), **Nagad**, **Rocket**, **SSLCommerz**.
  - Global: **Stripe** (Card & Digital Wallets).
- **Features**: Idempotent webhook listener, automatic retry, wallet refund system for ticket cancellations.

### 3.5 Notification Service (`Node.js`)
- **Core Function**: Omnichannel notification delivery:
  - SMS: Booking confirmation OTP, trip delay alerts.
  - Push Notifications: Firebase Cloud Messaging (FCM).
  - Email: PDF ticket and VAT invoice via SendGrid / Resend.

### 3.6 Analytics & Reporting Service (`Node.js / BigQuery`)
- **Core Function**: Computes operator KPIs:
  - Daily & monthly gross revenue, passenger volume, seat occupancy percentage.
  - Peak hour distribution, route profitability, cancellation ratios.
  - Asynchronous pipeline pushing daily logs to Google BigQuery / Snowflake.

### 3.7 AI & Predictive Intelligence Engine (`Python / FastAPI`)
- **Core Function**: Specialized microservice running high-performance machine learning and NLP workloads.
- **Sub-Modules**:
  1. **Voice Booking & NLP Pipeline**: Whisper STT + LangChain LLM parser with custom few-shot prompts for Bangla (`bn-BD`), English (`en-US`), and Banglish.
  2. **Demand Forecast Engine**: Predicts route passenger load 7 to 14 days in advance using historical booking trends, holidays (Eid, Puja), weather conditions, and school vacation calendars.
  3. **Schedule Optimization Engine**: Identifies underutilized buses and flags scheduling clashes; suggests moving departure times (e.g., from 10:00 PM to 01:00 PM) to boost seat occupancy by +15% to +25%.
  4. **AI Business Advisor**: Generates automated executive action cards for vendor dashboard (e.g. "Add 1 extra coach on Dhaka -> Cox's Bazar next Friday: Expected Revenue +18%").

