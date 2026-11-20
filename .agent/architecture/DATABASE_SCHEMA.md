# Bookify: High-Resolution Database Schema & DDL Specification

> **Reference Diagram**: [High-Resolution ER Diagram](file:///d:/VS%20Code/agency/websites%20bussine/Bookify/.agent/diagrams/database-er-diagram.jpg) (Slide 16 / `image15.jpg` from `bookify_slider_plan.pptx`).

---

## 1. Relational Entity Overview (23 Tables)

| # | Entity Table | Primary Key | Foreign Keys | Purpose |
|---|---|---|---|---|
| 1 | `users` | `id (UUID)` | `role_id -> roles(id)` | Customers, Vendors, Admins core auth |
| 2 | `roles` | `id (INT)` | - | Role definitions & JSON permissions |
| 3 | `vendors` | `id (UUID)` | `user_id -> users(id)` | Fleet operator company profile & legal license |
| 4 | `bus_operators` | `id (UUID)` | `vendor_id -> vendors(id)` | Operating brand (e.g. Green Line, Hanif, Shohagh) |
| 5 | `bus_capacities` | `id (UUID)` | - | Seat count & layout template (2-2, 1-2, Sleeper) |
| 6 | `buses` | `id (UUID)` | `operator_id`, `capacity_id` | Physical bus fleet assets |
| 7 | `drivers` | `id (UUID)` | `vendor_id -> vendors(id)` | Driver roster & license verification |
| 8 | `routes` | `id (UUID)` | - | Master route (origin to destination) |
| 9 | `route_stops` | `id (UUID)` | `route_id -> routes(id)` | Intermediate boarding & dropping points |
| 10 | `trip_schedules` | `id (UUID)` | - | Recurring timetable template & base fare |
| 11 | `trips` | `id (UUID)` | `bus_id`, `route_id`, `driver_id`, `schedule_id` | Concrete scheduled departure on a specific date |
| 12 | `bookings` | `id (UUID)` | `user_id -> users(id)`, `trip_id -> trips(id)` | Order header for ticket purchases |
| 13 | `booking_items` | `id (UUID)` | `booking_id -> bookings(id)` | Individual seat reservations on a trip |
| 14 | `passengers` | `id (UUID)` | `booking_item_id -> booking_items(id)` | Passenger details (name, age, gender) |
| 15 | `coupons` | `id (UUID)` | - | Promo discount codes & validity |
| 16 | `payments` | `id (UUID)` | `booking_id`, `coupon_id` | Transaction records (bKash, Nagad, Stripe) |
| 17 | `invoices` | `id (UUID)` | `booking_id`, `payment_id` | Tax invoice, encrypted QR ticket & PDF URL |
| 18 | `wallet` | `id (UUID)` | `user_id -> users(id)` | Customer balance for instant refund/topup |
| 19 | `wallet_transactions` | `id (UUID)` | `wallet_id -> wallet(id)` | Audit trail of credits & debits |
| 20 | `reviews` | `id (UUID)` | `booking_id`, `user_id` | Ratings & user reviews for trips/operators |
| 21 | `ai_logs` | `id (UUID)` | `user_id -> users(id)` | Telemetry for Voice STT & NLP intent/entity parsing |
| 22 | `demand_forecasts` | `id (UUID)` | `route_id -> routes(id)` | ML passenger count & bus capacity predictions |
| 23 | `ai_recommendations` | `id (UUID)` | `vendor_id -> vendors(id)` | AI advisor suggestions for schedule/pricing |

---

## 2. Production PostgreSQL DDL Script

```sql
-- Enums
CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE bus_type_enum AS ENUM ('AC_BUSINESS', 'AC_ECONOMY', 'NON_AC', 'SLEEPER_AC', 'DOUBLE_DECKER');
CREATE TYPE trip_status_enum AS ENUM ('SCHEDULED', 'BOARDING', 'EN_ROUTE', 'COMPLETED', 'CANCELLED', 'DELAYED');
CREATE TYPE booking_status_enum AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'EXPIRED');
CREATE TYPE payment_status_enum AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED', 'DISPUTED');
CREATE TYPE payment_gateway_enum AS ENUM ('BKASH', 'NAGAD', 'ROCKET', 'SSLCOMMERZ', 'STRIPE', 'WALLET');
CREATE TYPE recommendation_type_enum AS ENUM ('SCHEDULE_SHIFT', 'EXTRA_BUS', 'REDUCE_BUS', 'DYNAMIC_PRICING');

-- 1. Roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL, -- 'CUSTOMER', 'VENDOR', 'ADMIN'
    permissions_json JSONB NOT NULL DEFAULT '{}'
);

-- 2. Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL REFERENCES roles(id),
    status user_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Vendors
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    license_no VARCHAR(100) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    status user_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Bus Operators
CREATE TABLE bus_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    operator_name VARCHAR(150) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Bus Capacities (Layout Templates)
CREATE TABLE bus_capacities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capacity_value INT NOT NULL, -- e.g. 28, 36, 40
    seat_layout_json JSONB NOT NULL, -- Matrix layout e.g. [["A1","A2","","A3","A4"], ...]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Buses
CREATE TABLE buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES bus_operators(id) ON DELETE CASCADE,
    reg_no VARCHAR(100) UNIQUE NOT NULL,
    model_no VARCHAR(100) NOT NULL,
    bus_type bus_type_enum NOT NULL,
    capacity_id UUID NOT NULL REFERENCES bus_capacities(id),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Drivers
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    license_no VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(30) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Routes
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_name VARCHAR(200) NOT NULL,
    start_point VARCHAR(100) NOT NULL,
    end_point VARCHAR(100) NOT NULL,
    distance_km NUMERIC(8,2) NOT NULL,
    travel_time_min INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Route Stops
CREATE TABLE route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    stop_name VARCHAR(150) NOT NULL,
    location_coords POINT,
    travel_time_min INT NOT NULL,
    sequence_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Trip Schedules (Templates)
CREATE TABLE trip_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    base_price NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Trips (Scheduled Occurrences)
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID NOT NULL REFERENCES buses(id),
    route_id UUID NOT NULL REFERENCES routes(id),
    driver_id UUID REFERENCES drivers(id),
    schedule_id UUID NOT NULL REFERENCES trip_schedules(id),
    date DATE NOT NULL,
    status trip_status_enum NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_bus_schedule_date UNIQUE (bus_id, date, schedule_id)
);

-- 12. Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    trip_id UUID NOT NULL REFERENCES trips(id),
    booking_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_amount NUMERIC(10,2) NOT NULL,
    status booking_status_enum NOT NULL DEFAULT 'PENDING_PAYMENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Booking Items (Seat level)
CREATE TABLE booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    CONSTRAINT unique_seat_per_trip UNIQUE (booking_id, seat_number)
);

-- 14. Passengers
CREATE TABLE passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_item_id UUID UNIQUE NOT NULL REFERENCES booking_items(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    seat_preference VARCHAR(50)
);

-- 15. Coupons
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL,
    is_percentage BOOLEAN NOT NULL DEFAULT FALSE,
    expiration_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
);

-- 16. Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
    transaction_id VARCHAR(150) UNIQUE,
    payment_method payment_gateway_enum NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_time TIMESTAMPTZ,
    status payment_status_enum NOT NULL DEFAULT 'INITIATED',
    coupon_id UUID REFERENCES coupons(id),
    webhook_data_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Invoices & QR Tickets
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
    payment_id UUID NOT NULL REFERENCES payments(id),
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    qr_ticket_data TEXT NOT NULL, -- Encrypted JWT containing ticket validation payload
    file_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'GENERATED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Wallet
CREATE TABLE wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Wallet Transactions
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallet(id) ON DELETE CASCADE,
    txn_type VARCHAR(50) NOT NULL, -- 'REFUND', 'TOPUP', 'PAYMENT'
    amount NUMERIC(10,2) NOT NULL,
    txn_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Reviews
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
    user_id UUID NOT NULL REFERENCES users(id),
    rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    review_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. AI Telemetry Logs
CREATE TABLE ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id),
    log_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    utterance_text TEXT,
    stt_text TEXT,
    intent_recognition_json JSONB,
    entity_extraction_json JSONB,
    response_text TEXT,
    latency_ms INT
);

-- 22. AI Demand Forecasts
CREATE TABLE demand_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id),
    recommendation_type VARCHAR(100) NOT NULL,
    prediction_data_json JSONB NOT NULL,
    target_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
);

-- 23. AI Recommendations
CREATE TABLE ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    type recommendation_type_enum NOT NULL,
    content_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL' -- 'APPROVED', 'REJECTED'
);

-- Strategic Performance Indexes
CREATE INDEX idx_trips_route_date ON trips(route_id, date);
CREATE INDEX idx_trips_bus ON trips(bus_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_trip ON bookings(trip_id);
CREATE INDEX idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_ai_logs_session ON ai_logs(session_id);
CREATE INDEX idx_demand_forecasts_route_date ON demand_forecasts(route_id, target_date);
```

---

## 3. Prisma Schema Reference (`schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Role {
  id              Int      @id @default(autoincrement())
  roleName        String   @unique @map("role_name")
  permissionsJson Json     @default("{}") @map("permissions_json")
  users           User[]

  @@map("roles")
}

model User {
  id           String      @id @default(uuid())
  name         String
  phone        String      @unique
  email        String?     @unique
  passwordHash String      @map("password_hash")
  roleId       Int         @map("role_id")
  status       String      @default("ACTIVE")
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  role         Role        @relation(fields: [roleId], references: [id])
  vendor       Vendor?
  bookings     Booking[]
  wallet       Wallet?
  reviews      Review[]
  aiLogs       AiLog[]

  @@map("users")
}

model Vendor {
  id           String         @id @default(uuid())
  userId       String         @unique @map("user_id")
  companyName  String         @map("company_name")
  licenseNo    String         @unique @map("license_no")
  address      String
  status       String         @default("ACTIVE")
  createdAt    DateTime       @default(now()) @map("created_at")

  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  operators    BusOperator[]
  drivers      Driver[]
  aiRecs       AiRecommendation[]

  @@map("vendors")
}

// ... All 23 models are fully mapped to matching Prisma models.
```


## Hosted demo schema

The hosted demo uses isolated bookify-prefixed tables and service-role-only inventory RPCs as described in [the hosted demo contract](../sdd/sdd-06-hosted-demo.md).
