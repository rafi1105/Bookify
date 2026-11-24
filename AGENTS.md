# Bookify Project Constitution & Agent Operating System

Welcome to **Bookify** — the Next-Generation Smart Bus E-Ticket Booking & AI Transport Management System.

This workspace implements a commercial-grade, multi-tenant bus ticketing and AI-powered fleet optimization platform based on the official Bookify System Design Blueprint and Defense Specification.

---

## 1. Core Engineering Protocols (Mandatory)

All agents and contributors working in this codebase MUST strictly follow these three engineering disciplines:

### 1.1 SDD (Spec-Driven Development)
- **Rule**: Never write implementation code without first consulting or authoring the corresponding specification in `.agent/sdd/`.
- **Requirement**: Check the API specifications in `.agent/architecture/API_SPECIFICATION.md` and database schemas in `.agent/architecture/DATABASE_SCHEMA.md`. Any data model or endpoint change requires updating the spec first.

### 1.2 TDD (Test-Driven Development)
- **Rule**: For all services (Seat Locking, Booking, Payments, AI, Fleet), tests MUST be authored before or in lockstep with implementation.
- **Workflow**:
  1. Write failing unit/integration test in the service's `__tests__` or `test/` directory.
  2. Implement the minimum code required to make tests pass.
  3. Refactor while maintaining green tests.
- **Critical Path**: High-concurrency seat locking and payment webhook verification MUST have automated unit and concurrency tests with 100% path coverage.

### 1.3 BDD (Behavior-Driven Development)
- **Rule**: All user-facing and operator workflows are documented as executable Gherkin feature files in `.agent/bdd/`.
- **Structure**: Every user story must satisfy `Given [context]`, `When [action]`, `Then [expected outcome]`.
- **Traceability**: Before marking any task or phase complete, verify that all scenarios in the relevant `.feature` file pass.

### 1.4 Strict External CSS Mandate (No Tailwind, No Inline Styles)
- **Rule**: Use ONLY pure external CSS located in `src/styles/`.
- **Prohibitions**:
  - NEVER write Tailwind CSS utility classes.
  - NEVER use inline CSS (`style={{ ... }}` or `style="..."`) anywhere in JSX or HTML.
- **Design System Structure**:
  - `src/styles/variables.css`: Design tokens, palette, liquid glass effects, typography scales.
  - `src/styles/global.css`: Base resets, layout containers, global animations.
  - `src/styles/liquid-glass.css`: Liquid glassmorphism blur and border treatments.
  - `src/styles/components.css`: Discrete styling for UI components (cards, seat map, trackers).
  - `src/styles/pages.css`: Dedicated page-level views and grids.

---

## 2. High-Level Architecture Overview (Supabase Free Plan & Vercel Free Plan)

Bookify is structured as a cloud-native, zero-cost production platform running on **Supabase Free Plan** and **Vercel Free Plan**:
- **Client Applications & Frontend Hosting (Vercel Free Tier)**:
  - Web Application: Next.js / Vite React 19 (TypeScript, Pure External CSS, Lucide Icons, GSAP / Three.js interactive seat/bus viewer).
  - Vercel Edge Network: Global CDN, automatic previews, and serverless routing.
- **Backend, Database & Real-Time Engine (Supabase Free Tier)**:
  1. `Supabase PostgreSQL (Database)`: Core relational data (23 normalized tables) with Row Level Security (RLS) for multi-tenant vendor isolation.
  2. `Supabase Auth`: Phone OTP (Twilio/SMS provider), Email + Password, Google OAuth, and secure JWT session management.
  3. `Supabase Realtime`: High-speed WebSocket engine broadcasting live seat lock states to all active viewers with sub-100ms latency.
  4. `Supabase Storage`: Encrypted QR ticket assets, PDF tax invoices, and bus operator branding logos (1 GB free storage).
  5. `Supabase Edge Functions / Vercel Serverless`: Deno/TypeScript serverless functions for payments (bKash, Nagad, SSLCommerz, Stripe webhooks), atomic seat leases, and PDF invoice generation.
- **Concurrency & Cache Layer**:
  - Supabase Atomic PostgreSQL Functions (`acquire_seat_lock`) + Upstash Redis Free Tier for distributed locks (10-minute TTL).
  - Supabase Realtime channel (`trip:{tripId}:seats`) for instant seat occupancy broadcasts.
- **AI & Predictive Intelligence Engine**:
  - Python FastAPI / Serverless endpoints (Whisper STT, LangChain Bangla/English/Banglish intent parsing, demand forecasting).

---

## 3. High-Concurrency Seat Locking Standard (Supabase + Realtime)
- When a customer selects seats, acquire an atomic lease with a 10-minute TTL (`600 seconds`) via Supabase RPC `acquire_seat_lock` (or Upstash Redis `SET lock:trip:{tripId}:seat:{seatNo} token EX 600 NX`).
- Upon lock acquisition, broadcast `seat_locked` event to all clients listening on the Supabase Realtime channel `trip:{tripId}:seats`.
- If any seat in a multi-seat selection is taken, the transaction rolls back cleanly with HTTP 409 Conflict.
- Upon payment webhook verification, the booking is committed to PostgreSQL as `CONFIRMED`, the lock is removed, and Supabase Realtime broadcasts `seat_booked`.
- Expired locks are automatically evicted by timestamp comparison (`expires_at < NOW()`).

---

## 4. Multilingual AI Voice Booking Standard
- Input audio -> Whisper Speech-to-Text.
- Language identification: Bangla (`bn-BD`), English (`en-US`), or mixed Banglish.
- Intent & entity extraction using LangChain / LLM:
  - Intent: `BookTicket`, `CheckAvailability`, `RescheduleTicket`, `CancelTicket`.
  - Entities: `From`, `To`, `Date`, `Seats`, `BusType`, `PreferredTime`.
- The system must clarify missing fields and confirm the itinerary with the customer before initiating seat reservation and payment.

---

## 5. Directory Knowledge Map

- Architecture & System Blueprint: `.agent/architecture/`
- Spec-Driven Development (SDD): `.agent/sdd/`
- Behavior-Driven Development (BDD): `.agent/bdd/`
- Test-Driven Development (TDD): `.agent/tdd/`
- Phased Implementation Guide: `.agent/phases/`
- Specialized Agent Skills: `.agent/skills/`
- System Architecture Diagrams: `.agent/diagrams/`

