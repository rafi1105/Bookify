# Bookify: Data Flow Diagram (DFD Level-1) Specification

> **Reference Diagram**: [Level-1 Data Flow Diagram](file:///d:/VS%20Code/agency/websites%20bussine/Bookify/.agent/diagrams/data-flow-diagram-level-1.jpg) (Slide 13 / `image12.jpg` from `bookify_slider_plan.pptx`).

---

## 1. DFD Level-1 Architecture

```
========================================================================================================================
                                                SIMPLIFIED LEVEL-1 DFD:
                                            E-TICKET & TRANSPORT SYSTEM
========================================================================================================================

                                         +-------------------------------------------------------------+
                                         |                      SYSTEM BOUNDARY                        |
                                         |                                                             |
                                         |  CUSTOMER SERVICES                                          |
                                         |  +--------------------+                                     |
                                         |  | D1: Trip Database  |<-----------------------------+      |
                                         |  +--------------------+                              |      |
                                         |       | Available              Trip Data             |      |
                                         |       | Trips                      |                 |      |
                                         |       v                            v                 |      |
+---------------------+ Search Request   |  +-----------------------------------+               |      |
|      CUSTOMER       |-------------------->|   Process 1.0: Process Booking    |               |      |
|   (Web & Mobile)    |<--------------------| - Search trips                    |               |      |
+---------------------+ Available Trips  |  | - Lock seats (Redis Cache D3)     |               |      |
         |                               |  | - Commit booking (PostgreSQL)     |               |      |
         | Voice Booking Query           |  +-----------------------------------+               |      |
         v                               |       | Booking             ^ Seats/                 |      |
+------------------------------------+   |       | Request             | Status                 |      |
| Process 4.0: Provide AI Voice      |   |       v                     |                        |      |
| Assistance                         |   |  +-----------------------------------+               |      |
| - Whisper STT                      |   |  | D3: Seat Status (Realtime Redis)  |               |      |
| - Bangla/English Intent Recognition|   |  | & Booking / Transaction Logs      |               |      |
| - Entity Extraction (LangChain)    |   |  +-----------------------------------+               |      |
+------------------------------------+   |                                                             |
         ^                               |  VENDOR MANAGEMENT                                          |
         | Processing Data               |  +-----------------------------------+                      |
+---------------------+                  |  | Process 2.0: Fleet / Routes       |                      |
|    AI ASSISTANT     |                  |  | - Register buses & drivers        |                      |
|  (External Service) |                  |  | - Set trip schedules              |                      |
+---------------------+                  |  +-----------------------------------+                      |
                                         |       | Fleet Update               ^ Fleet & Schedule Data  |
                                         |       v                            |                        |
                                         |  +--------------------+            |                        |
                                         |  | D4: Fleet Data     |------------+                        |
                                         |  +--------------------+                                     |
                                         |                                                             |
                                         |  +-----------------------------------+                      |
                                         |  | Process 5.0: Generate Demand      |                      |
                                         |  | Forecasts & Optimization Reports  |<--------------------+|
                                         |  +-----------------------------------+                     ||
                                         |       | Request                    ^                       ||
                                         |       v Forecast                   | D5 Forecasts          ||
                                         |  +--------------------+            |                       ||
                                         |  | D5: AI Models &    |------------+                       ||
                                         |  | Forecasts          |                                    ||
                                         |  +--------------------+                                    ||
                                         |                                                             |
                                         |  EXTERNAL GATEWAYS & PAYMENTS                               |
                                         |  +-----------------------------------+                      |
                                         |  | Process 6.0: Handle Payments      |                      |
                                         |  | - bKash / Nagad / SSLCommerz      |                      |
                                         |  | - Verify Webhook & Issue QR/PDF   |                      |
                                         |  +-----------------------------------+                      |
                                         |                                                             |
                                         |  +-----------------------------------+                      |
                                         |  | Process 3.0: System Admin & Sec   |                      |
                                         |  | - Multi-role permissions          |                      |
                                         |  | - Platform audit & rate limiting  |                      |
                                         |  +-----------------------------------+                      |
                                         +-------------------------------------------------------------+
```

---

## 2. Processes Definition

### Process 1.0: Process Booking
- **Inputs**: Search query (`From`, `To`, `Date`), Seat Selection payload (`[A1, A2]`), Customer info.
- **Data Stores Interacted**:
  - Read: `D1: Trip Database` (Fetches departure times, pricing, operators).
  - Read/Write: `D3: Seat Status` (Queries temporary Redis locks, issues atomic 10-minute hold).
  - Write: `D3: Booking Logs` (Persists committed ticket order upon payment confirmation).
- **Outputs**: Trip list, Seat Lock lease confirmation, Generated encrypted QR ticket.

### Process 2.0: Fleet & Route Management
- **Inputs**: Operator info, bus registration, route definitions, stop sequences, trip schedule templates.
- **Data Stores Interacted**:
  - Read/Write: `D4: Fleet Data` (Updates bus fleet status, driver rosters, route pricing).
- **Outputs**: Operational trip schedules dispatched to `D1: Trip Database`.

### Process 3.0: System Admin & Security
- **Inputs**: Admin role credentials, configuration parameters, vendor approval tokens.
- **Data Stores Interacted**:
  - Read/Write: `D2: AI and Analytics`, User credentials and audit tables.
- **Outputs**: Platform health status, security alerts, vendor activation status.

### Process 4.0: Provide AI Voice Assistance
- **Inputs**: Raw audio streams (WAV/WebM/Opus) via mobile or web microphone.
- **Internal Pipeline**:
  1. Audio Ingestion -> Whisper STT conversion into text transcript.
  2. Language Identification (Bangla, English, Banglish).
  3. LangChain entity extraction (`From`, `To`, `Date`, `Seats`, `BusType`).
  4. Validation & Slot Filling -> Generates search request for Process 1.0.
- **Outputs**: Text/Speech response, auto-filled booking form, trip cards.

### Process 5.0: Generate Demand Forecasts & Reports
- **Inputs**: Historical booking logs from `D3`, holiday calendar, traffic metrics, weather feeds.
- **Data Stores Interacted**:
  - Read: `D3: Booking & Transaction Logs`.
  - Read/Write: `D5: AI Models & Forecasts`.
- **Outputs**: Predictive passenger volume reports, schedule optimization recommendations for vendors.

### Process 6.0: Handle Payments
- **Inputs**: Payment initiation request, gateway callbacks (bKash / Nagad / SSLCommerz / Stripe).
- **Outputs**: Transaction ID, payment confirmation status, triggered QR code ticket generator.

