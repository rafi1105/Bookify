-- =====================================================================================
-- Bookify: Supabase Free Tier Master Schema & Atomic Concurrency Stored Procedures
-- Reference: Slide 16 ERD (23 Tables), Slide 14 Sequence Diagram, Supabase Realtime & RLS
-- =====================================================================================

-- Enable necessary Supabase extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================================
-- 1. ENUMS
-- =====================================================================================
DO $$ BEGIN
    CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE bus_type_enum AS ENUM ('AC_BUSINESS', 'AC_ECONOMY', 'NON_AC', 'SLEEPER_AC', 'DOUBLE_DECKER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE trip_status_enum AS ENUM ('SCHEDULED', 'BOARDING', 'EN_ROUTE', 'COMPLETED', 'CANCELLED', 'DELAYED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE booking_status_enum AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED', 'DISPUTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_gateway_enum AS ENUM ('BKASH', 'NAGAD', 'ROCKET', 'SSLCOMMERZ', 'STRIPE', 'WALLET');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE recommendation_type_enum AS ENUM ('SCHEDULE_SHIFT', 'EXTRA_BUS', 'REDUCE_BUS', 'DYNAMIC_PRICING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =====================================================================================
-- 2. CORE RELATIONAL TABLES (23 Tables)
-- =====================================================================================

-- 1. Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL, -- 'CUSTOMER', 'VENDOR', 'ADMIN'
    permissions_json JSONB NOT NULL DEFAULT '{}'
);

INSERT INTO public.roles (id, role_name, permissions_json)
VALUES 
    (1, 'CUSTOMER', '{"can_book": true, "can_cancel": true}'),
    (2, 'VENDOR', '{"can_manage_fleet": true, "can_view_vendor_reports": true, "can_approve_ai": true}'),
    (3, 'ADMIN', '{"can_manage_all": true, "can_configure_ai": true}')
ON CONFLICT (id) DO NOTHING;

-- 2. Users (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE,
    role_id INT NOT NULL DEFAULT 1 REFERENCES public.roles(id),
    status user_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Vendors
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    license_no VARCHAR(100) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    status user_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Bus Operators
CREATE TABLE IF NOT EXISTS public.bus_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    operator_name VARCHAR(150) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Bus Capacities (Layout Templates)
CREATE TABLE IF NOT EXISTS public.bus_capacities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capacity_value INT NOT NULL,
    seat_layout_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Buses
CREATE TABLE IF NOT EXISTS public.buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
    reg_no VARCHAR(100) UNIQUE NOT NULL,
    model_no VARCHAR(100) NOT NULL,
    bus_type bus_type_enum NOT NULL,
    capacity_id UUID NOT NULL REFERENCES public.bus_capacities(id),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Drivers
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    license_no VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(30) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Routes
CREATE TABLE IF NOT EXISTS public.routes (
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
CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    stop_name VARCHAR(150) NOT NULL,
    location_coords POINT,
    travel_time_min INT NOT NULL,
    sequence_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Trip Schedules (Templates)
CREATE TABLE IF NOT EXISTS public.trip_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    base_price NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Trips (Scheduled Occurrences)
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID NOT NULL REFERENCES public.buses(id),
    route_id UUID NOT NULL REFERENCES public.routes(id),
    driver_id UUID REFERENCES public.drivers(id),
    schedule_id UUID NOT NULL REFERENCES public.trip_schedules(id),
    date DATE NOT NULL,
    status trip_status_enum NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_bus_schedule_date UNIQUE (bus_id, date, schedule_id)
);

-- 12. Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    trip_id UUID NOT NULL REFERENCES public.trips(id),
    booking_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_amount NUMERIC(10,2) NOT NULL,
    status booking_status_enum NOT NULL DEFAULT 'PENDING_PAYMENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Booking Items (Individual Seat)
CREATE TABLE IF NOT EXISTS public.booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    CONSTRAINT unique_seat_per_trip UNIQUE (booking_id, seat_number)
);

-- 14. Passengers
CREATE TABLE IF NOT EXISTS public.passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_item_id UUID UNIQUE NOT NULL REFERENCES public.booking_items(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    seat_preference VARCHAR(50)
);

-- 15. Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL,
    is_percentage BOOLEAN NOT NULL DEFAULT FALSE,
    expiration_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
);

-- 16. Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID UNIQUE NOT NULL REFERENCES public.bookings(id),
    transaction_id VARCHAR(150) UNIQUE,
    payment_method payment_gateway_enum NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_time TIMESTAMPTZ,
    status payment_status_enum NOT NULL DEFAULT 'INITIATED',
    coupon_id UUID REFERENCES public.coupons(id),
    webhook_data_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Invoices & QR Tickets
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID UNIQUE NOT NULL REFERENCES public.bookings(id),
    payment_id UUID NOT NULL REFERENCES public.payments(id),
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    qr_ticket_data TEXT NOT NULL,
    file_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'GENERATED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Wallet
CREATE TABLE IF NOT EXISTS public.wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Wallet Transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallet(id) ON DELETE CASCADE,
    txn_type VARCHAR(50) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    txn_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID UNIQUE NOT NULL REFERENCES public.bookings(id),
    user_id UUID NOT NULL REFERENCES public.users(id),
    rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    review_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. AI Telemetry Logs
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES public.users(id),
    log_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    utterance_text TEXT,
    stt_text TEXT,
    intent_recognition_json JSONB,
    entity_extraction_json JSONB,
    response_text TEXT,
    latency_ms INT
);

-- 22. AI Demand Forecasts
CREATE TABLE IF NOT EXISTS public.demand_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.routes(id),
    recommendation_type VARCHAR(100) NOT NULL,
    prediction_data_json JSONB NOT NULL,
    target_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
);

-- 23. AI Recommendations
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id),
    type recommendation_type_enum NOT NULL,
    content_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL'
);

-- =====================================================================================
-- 3. HIGH-CONCURRENCY SEAT LOCKS TABLE (For Supabase Realtime + Concurrency)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.seat_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id),
    lock_token UUID NOT NULL DEFAULT gen_random_uuid(),
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    CONSTRAINT unique_active_seat_lock UNIQUE (trip_id, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_seat_locks_trip_seat ON public.seat_locks(trip_id, seat_number);
CREATE INDEX IF NOT EXISTS idx_seat_locks_expiry ON public.seat_locks(expires_at);

-- =====================================================================================
-- 4. ATOMIC CONCURRENCY STORED PROCEDURES (RPC)
-- =====================================================================================

-- Atomic Multi-Seat Lock Procedure (10-minute TTL)
CREATE OR REPLACE FUNCTION public.acquire_seat_lock(
    p_trip_id UUID,
    p_seat_numbers TEXT[],
    p_user_id UUID,
    p_ttl_seconds INT DEFAULT 600
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seat TEXT;
    v_conflict_seat TEXT;
    v_lock_token UUID := gen_random_uuid();
    v_expires_at TIMESTAMPTZ := NOW() + (p_ttl_seconds || ' seconds')::INTERVAL;
BEGIN
    -- Step 1: Clean up any expired locks on this trip first
    DELETE FROM public.seat_locks
    WHERE trip_id = p_trip_id AND expires_at < NOW();

    -- Step 2: Check if any requested seat is already locked or booked
    FOREACH v_seat IN ARRAY p_seat_numbers LOOP
        -- Check if seat is permanently booked
        IF EXISTS (
            SELECT 1 FROM public.booking_items bi
            JOIN public.bookings b ON b.id = bi.booking_id
            WHERE b.trip_id = p_trip_id 
              AND bi.seat_number = v_seat 
              AND b.status = 'CONFIRMED'
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'SEAT_ALREADY_BOOKED', 'seat', v_seat);
        END IF;

        -- Check if seat is currently locked by someone else
        IF EXISTS (
            SELECT 1 FROM public.seat_locks
            WHERE trip_id = p_trip_id 
              AND seat_number = v_seat 
              AND expires_at > NOW() 
              AND user_id != p_user_id
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'SEAT_ALREADY_LOCKED', 'seat', v_seat);
        END IF;
    END LOOP;

    -- Step 3: All seats are available. Insert or refresh locks atomically
    FOREACH v_seat IN ARRAY p_seat_numbers LOOP
        INSERT INTO public.seat_locks (trip_id, seat_number, user_id, lock_token, locked_at, expires_at)
        VALUES (p_trip_id, v_seat, p_user_id, v_lock_token, NOW(), v_expires_at)
        ON CONFLICT (trip_id, seat_number) DO UPDATE
        SET user_id = p_user_id,
            lock_token = v_lock_token,
            locked_at = NOW(),
            expires_at = v_expires_at;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'lockToken', v_lock_token,
        'lockedSeats', p_seat_numbers,
        'expiresAt', v_expires_at,
        'ttlSeconds', p_ttl_seconds
    );
END;
$$;

-- Release Seat Lock Procedure
CREATE OR REPLACE FUNCTION public.release_seat_lock(
    p_trip_id UUID,
    p_seat_numbers TEXT[],
    p_lock_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.seat_locks
    WHERE trip_id = p_trip_id 
      AND seat_number = ANY(p_seat_numbers)
      AND lock_token = p_lock_token;

    RETURN jsonb_build_object('success', true, 'message', 'Locks released successfully');
END;
$$;

-- =====================================================================================
-- 5. SUPABASE REALTIME ENABLEMENT
-- =====================================================================================
-- Enable Realtime publication on seat_locks and trips so clients receive 0ms updates
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.seat_locks;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
EXCEPTION WHEN others THEN null; END $$;

-- =====================================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_locks ENABLE ROW LEVEL SECURITY;

-- Customers can read their own profile
CREATE POLICY "Users can read own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Customers can view available seat locks
CREATE POLICY "Anyone can view active seat locks" ON public.seat_locks
    FOR SELECT USING (true);

-- Customers can view and create their own bookings
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Vendors can only manage their own buses
CREATE POLICY "Vendors manage own buses" ON public.buses
    FOR ALL USING (
        operator_id IN (
            SELECT bo.id FROM public.bus_operators bo
            JOIN public.vendors v ON v.id = bo.vendor_id
            WHERE v.user_id = auth.uid()
        )
    );

