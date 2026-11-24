-- =====================================================================================
-- Bookify v2: production booking engine
-- Self-contained: works on an empty database and on one that already has the old
-- 23-table schema (20261016_init_bookify_schema.sql), complete or partial.
-- Additive only. The old bookify_* demo tables are not touched; drop them yourself
-- once v2 is live.
--
-- After applying, promote your own account to admin once it has signed up:
--   update public.users set role_id = 3 where email = 'you@example.com';
-- =====================================================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------------------------
-- 0. Base tables. This file is self-contained: it creates what it needs if the old
--    schema is absent, and leaves existing tables (and any extra legacy tables) alone.
--    Requires Supabase (auth.users). Safe to run more than once.
-- -------------------------------------------------------------------------------------
do $$ begin
  create type user_status_enum as enum ('ACTIVE', 'INACTIVE', 'SUSPENDED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type bus_type_enum as enum ('AC_BUSINESS', 'AC_ECONOMY', 'NON_AC', 'SLEEPER_AC', 'DOUBLE_DECKER');
exception when duplicate_object then null; end $$;
do $$ begin
  create type trip_status_enum as enum ('SCHEDULED', 'BOARDING', 'EN_ROUTE', 'COMPLETED', 'CANCELLED', 'DELAYED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type booking_status_enum as enum ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'EXPIRED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type payment_status_enum as enum ('INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED', 'DISPUTED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type payment_gateway_enum as enum ('BKASH', 'NAGAD', 'ROCKET', 'SSLCOMMERZ', 'STRIPE', 'WALLET');
exception when duplicate_object then null; end $$;

CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL, -- 'CUSTOMER', 'VENDOR', 'ADMIN'
    permissions_json JSONB NOT NULL DEFAULT '{}'
);

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

CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    license_no VARCHAR(100) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    status user_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bus_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    operator_name VARCHAR(150) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bus_capacities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capacity_value INT NOT NULL,
    seat_layout_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    stop_name VARCHAR(150) NOT NULL,
    location_coords POINT,
    travel_time_min INT NOT NULL,
    sequence_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trip_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    base_price NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID NOT NULL REFERENCES public.buses(id),
    route_id UUID NOT NULL REFERENCES public.routes(id),
    driver_id UUID, -- optional, unused by Bookify v2
    schedule_id UUID NOT NULL REFERENCES public.trip_schedules(id),
    date DATE NOT NULL,
    status trip_status_enum NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_bus_schedule_date UNIQUE (bus_id, date, schedule_id)
);

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    trip_id UUID NOT NULL REFERENCES public.trips(id),
    booking_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_amount NUMERIC(10,2) NOT NULL,
    status booking_status_enum NOT NULL DEFAULT 'PENDING_PAYMENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    CONSTRAINT unique_seat_per_trip UNIQUE (booking_id, seat_number)
);

CREATE TABLE IF NOT EXISTS public.passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_item_id UUID UNIQUE NOT NULL REFERENCES public.booking_items(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    seat_preference VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL,
    is_percentage BOOLEAN NOT NULL DEFAULT FALSE,
    expiration_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
);

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

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID UNIQUE NOT NULL REFERENCES public.bookings(id),
    user_id UUID NOT NULL REFERENCES public.users(id),
    rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    review_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

insert into public.roles (id, role_name, permissions_json) values
  (1, 'CUSTOMER', '{"can_book": true, "can_cancel": true}'),
  (2, 'VENDOR', '{"can_manage_fleet": true}'),
  (3, 'ADMIN', '{"can_manage_all": true}')
on conflict (id) do nothing;


-- -------------------------------------------------------------------------------------
-- 1. Users: profile row created from Supabase Auth
-- -------------------------------------------------------------------------------------
alter table public.users alter column phone drop not null;

create or replace function public.bk_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists bk_users_updated_at on public.users;
create trigger bk_users_updated_at before update on public.users
  for each row execute function public.bk_touch_updated_at();

create or replace function public.bk_handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  display_name text := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''),
                                nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Traveller');
  phone_number text := nullif(trim(new.raw_user_meta_data->>'phone'), '');
begin
  begin
    insert into public.users (id, name, email, phone, role_id)
    values (new.id, left(display_name, 150), new.email, phone_number, 1)
    on conflict (id) do nothing;
  exception when unique_violation then
    -- Phone already used by another account: keep the account, drop the phone.
    insert into public.users (id, name, email, role_id)
    values (new.id, left(display_name, 150), new.email, 1)
    on conflict (id) do nothing;
  end;
  return new;
end
$$;

drop trigger if exists bk_on_auth_user_created on auth.users;
create trigger bk_on_auth_user_created after insert on auth.users
  for each row execute function public.bk_handle_new_auth_user();

-- Accounts that signed up before this migration
insert into public.users (id, name, email, role_id)
select u.id, left(coalesce(nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'Traveller'), 150), u.email, 1
from auth.users u
on conflict do nothing;

-- -------------------------------------------------------------------------------------
-- 2. Operators (vendors) and their brand
-- -------------------------------------------------------------------------------------
alter table public.vendors
  add column if not exists approval_status text not null default 'APPROVED'
    check (approval_status in ('PENDING', 'APPROVED', 'REJECTED')),
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists rejection_reason text,
  add column if not exists decided_at timestamptz;

-- Operators register with just e-mail, password and company name: no licence, no approval.
alter table public.vendors alter column license_no drop not null, alter column address drop not null;
alter table public.vendors alter column approval_status set default 'APPROVED';

create index if not exists bk_bus_operators_vendor on public.bus_operators (vendor_id);

-- -------------------------------------------------------------------------------------
-- 3. Coach layouts and buses
--    seat_layout_json = {"kind":"SEAT"|"BERTH","decks":[{"label":"Lower","rows":[["A1","A2","","A3","A4"]]}]}
--    An empty string is an aisle or gap.
-- -------------------------------------------------------------------------------------
create or replace function public.bk_layout_seats(layout jsonb)
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(seat), '{}')
  from jsonb_array_elements(coalesce(layout->'decks', '[]'::jsonb)) deck,
       jsonb_array_elements(coalesce(deck->'rows', '[]'::jsonb)) row_cells,
       jsonb_array_elements_text(row_cells) seat
  where seat <> ''
$$;

alter table public.bus_capacities
  add column if not exists vendor_id uuid references public.vendors(id) on delete cascade,
  add column if not exists name text;

alter table public.bus_capacities drop constraint if exists bk_layout_valid;
alter table public.bus_capacities add constraint bk_layout_valid check (
  jsonb_typeof(seat_layout_json->'decks') = 'array'
  and cardinality(public.bk_layout_seats(seat_layout_json)) between 1 and 80
  and capacity_value = cardinality(public.bk_layout_seats(seat_layout_json))
) not valid;

alter table public.buses
  add column if not exists vendor_id uuid references public.vendors(id) on delete cascade,
  add column if not exists name text,
  add column if not exists amenities text[] not null default '{}';

-- Unique bus code, e.g. BUS-7K3QZ9
create or replace function public.bk_new_bus_code()
returns text language plpgsql set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate := 'BUS-';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.buses where code = candidate);
  end loop;
  return candidate;
end
$$;

alter table public.buses
  add column if not exists code text,
  add column if not exists image_url text,
  add column if not exists condition text not null default 'NORMAL'
    check (condition in ('NORMAL', 'IN_TRAFFIC', 'ACCIDENT', 'BREAKDOWN')),
  add column if not exists condition_note text,
  add column if not exists condition_updated_at timestamptz;
update public.buses set code = public.bk_new_bus_code() where code is null;
alter table public.buses alter column code set default public.bk_new_bus_code();
alter table public.buses alter column code set not null;
create unique index if not exists bk_buses_code on public.buses (code);
alter table public.buses drop constraint if exists bk_bus_image_url;
alter table public.buses add constraint bk_bus_image_url
  -- (Postgres regex repetition is capped at 255, so the length is checked separately)
  check (image_url is null or (char_length(image_url) <= 500 and image_url ~ '^https?://[^[:space:]]+$')) not valid;

-- status: ACTIVE (vendor says it can be used), OFF_DUTY (vendor takes it out), SUSPENDED (admin)
alter table public.buses drop constraint if exists bk_bus_status;
alter table public.buses add constraint bk_bus_status
  check (status in ('ACTIVE', 'OFF_DUTY', 'INACTIVE', 'SUSPENDED')) not valid;

create table if not exists public.bus_status_events (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references public.buses(id) on delete cascade,
  actor_id uuid references public.users(id),
  kind text not null,
  value text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists bk_bus_events on public.bus_status_events (bus_id, created_at desc);

create index if not exists bk_buses_vendor on public.buses (vendor_id);

-- -------------------------------------------------------------------------------------
-- 4. Routes, stops and operator permission to sell a route
-- -------------------------------------------------------------------------------------
create unique index if not exists bk_routes_pair on public.routes (lower(start_point), lower(end_point));

alter table public.route_stops
  add column if not exists stop_type text not null default 'BOTH'
    check (stop_type in ('BOARDING', 'DROPPING', 'BOTH')),
  add column if not exists address text;


-- A vendor proposes a route (any two points), class, fare and journey time.
-- The admin approves it, and may change the fare and duration. Approval creates the route
-- (if new) and the vendor's boarding and dropping points for it.
create table if not exists public.route_permissions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  route_id uuid references public.routes(id) on delete set null,
  origin text not null check (length(trim(origin)) between 2 and 100),
  destination text not null check (length(trim(destination)) between 2 and 100),
  boarding_points text[] not null check (cardinality(boarding_points) between 1 and 6),
  dropping_points text[] not null check (cardinality(dropping_points) between 1 and 6),
  bus_type bus_type_enum not null,
  proposed_fare numeric(10,2) not null check (proposed_fare between 50 and 20000),
  proposed_duration_min int not null check (proposed_duration_min between 15 and 1440),
  approved_fare numeric(10,2) check (approved_fare between 50 and 20000),
  approved_duration_min int check (approved_duration_min between 15 and 1440),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED')),
  note text,
  decided_by uuid references public.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (lower(trim(origin)) <> lower(trim(destination))),
  check (status <> 'APPROVED' or (approved_fare is not null and approved_duration_min is not null and route_id is not null))
);
create unique index if not exists bk_permission_open
  on public.route_permissions (vendor_id, lower(trim(origin)), lower(trim(destination)), bus_type)
  where status in ('PENDING', 'APPROVED');

-- Stops belong to the approved request, so each vendor has its own boarding points and timing.
alter table public.route_stops add column if not exists permission_id uuid references public.route_permissions(id) on delete cascade;
drop index if exists bk_route_stops_order;
create unique index if not exists bk_route_stops_order on public.route_stops (coalesce(permission_id, route_id), sequence_order);
alter table public.routes alter column distance_km set default 0;

-- -------------------------------------------------------------------------------------
-- 5. Schedules and dated trips
-- -------------------------------------------------------------------------------------
alter table public.trip_schedules
  add column if not exists vendor_id uuid references public.vendors(id) on delete cascade,
  add column if not exists route_id uuid references public.routes(id),
  add column if not exists bus_id uuid references public.buses(id),
  add column if not exists permission_id uuid references public.route_permissions(id),
  add column if not exists days_of_week smallint[] not null default '{0,1,2,3,4,5,6}',
  add column if not exists valid_from date,
  add column if not exists valid_until date,
  add column if not exists active boolean not null default true;

create index if not exists bk_schedules_vendor on public.trip_schedules (vendor_id);

alter table public.trips
  add column if not exists vendor_id uuid references public.vendors(id),
  add column if not exists permission_id uuid references public.route_permissions(id),
  add column if not exists departure_at timestamptz,
  add column if not exists arrival_at timestamptz,
  add column if not exists fare numeric(10,2),
  add column if not exists cancel_reason text,
  add column if not exists cancelled_at timestamptz,
  -- Delays: dep_delay_min pushes the whole trip later (the bus was still on its previous trip);
  -- traffic_delay_min is time lost in traffic on this trip. jam_started_at / jam_prior_min describe
  -- the stoppages so the bus position can be derived. All times here are simulation times.
  add column if not exists dep_delay_min int not null default 0 check (dep_delay_min >= 0),
  add column if not exists traffic_delay_min int not null default 0 check (traffic_delay_min >= 0),
  add column if not exists jam_prior_min int not null default 0 check (jam_prior_min >= 0),
  add column if not exists jam_started_at timestamptz,
  add column if not exists delay_cause text check (delay_cause in ('TRAFFIC', 'PREVIOUS_TRIP')),
  add column if not exists delay_note text;

create index if not exists bk_trips_route_departure on public.trips (route_id, departure_at);
create index if not exists bk_trips_bus_departure on public.trips (bus_id, departure_at);
create index if not exists bk_trips_vendor_departure on public.trips (vendor_id, departure_at);

-- -------------------------------------------------------------------------------------
-- 6. Bookings, seats, passengers, payments, tickets
-- -------------------------------------------------------------------------------------
alter table public.bookings
  add column if not exists pnr text,
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists boarding_stop_id uuid,
  add column if not exists dropping_stop_id uuid,
  add column if not exists seat_count int,
  add column if not exists expires_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text,
  add column if not exists refund_amount numeric(10,2) not null default 0,
  add column if not exists refund_status text not null default 'NONE'
    check (refund_status in ('NONE', 'PENDING', 'PROCESSED')),
  add column if not exists refund_reference text;

do $$ begin
  alter table public.bookings add constraint bk_bookings_boarding_fk
    foreign key (boarding_stop_id) references public.route_stops(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.bookings add constraint bk_bookings_dropping_fk
    foreign key (dropping_stop_id) references public.route_stops(id);
exception when duplicate_object then null; end $$;

create unique index if not exists bk_bookings_pnr on public.bookings (pnr);
create index if not exists bk_bookings_user on public.bookings (user_id, created_at desc);
create index if not exists bk_bookings_trip on public.bookings (trip_id);

alter table public.booking_items
  add column if not exists trip_id uuid references public.trips(id),
  add column if not exists status text not null default 'HELD'
    check (status in ('HELD', 'CONFIRMED', 'RELEASED', 'CANCELLED'));

-- The single guarantee against double selling: one live item per seat per trip.
create unique index if not exists bk_booking_items_live_seat
  on public.booking_items (trip_id, seat_number) where status in ('HELD', 'CONFIRMED');

alter table public.passengers drop constraint if exists bk_passenger_gender;
alter table public.passengers add constraint bk_passenger_gender
  check (gender in ('MALE', 'FEMALE', 'OTHER')) not valid;
alter table public.passengers drop constraint if exists bk_passenger_age;
alter table public.passengers add constraint bk_passenger_age check (age between 0 and 120) not valid;

alter table public.payments
  add column if not exists currency text not null default 'BDT',
  add column if not exists gateway_session_id text,
  add column if not exists attempts int not null default 0,
  add column if not exists updated_at timestamptz not null default now();
create unique index if not exists bk_payments_session on public.payments (gateway_session_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists bk_audit_entity on public.audit_logs (entity, entity_id, created_at desc);

-- -------------------------------------------------------------------------------------
-- 7. Security: everything goes through the server (service_role). Browsers get nothing.
-- -------------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['roles','users','vendors','bus_operators','bus_capacities','buses','drivers','routes',
    'route_stops','trip_schedules','trips','bookings','booking_items','passengers','coupons','payments','invoices',
    'wallet','wallet_transactions','reviews','ai_logs','demand_forecasts','ai_recommendations','seat_locks',
    'route_permissions','audit_logs','bus_status_events','sim_clock'] loop
    -- legacy tables (drivers, wallet, ai_logs, ...) may or may not exist
    continue when to_regclass(format('public.%I', t)) is null;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end
$$;

-- -------------------------------------------------------------------------------------
-- 8. Business rules
-- -------------------------------------------------------------------------------------
create or replace function public.bk_fail(code text, message text)
returns void language plpgsql set search_path = '' as $$
begin
  -- code BK400 / BK403 / BK404 / BK409 maps to the HTTP status in the API
  raise exception using errcode = code, message = message;
end
$$;

create or replace function public.bk_new_pnr()
returns text language plpgsql set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate := 'BK';
    for i in 1..8 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.bookings where pnr = candidate);
  end loop;
  return candidate;
end
$$;

-- Refund share by hours left before departure. Keep in sync with the refund policy page.
create or replace function public.bk_refund_percent(hours_left numeric)
returns int language sql immutable set search_path = '' as $$
  select case
    when hours_left >= 48 then 90
    when hours_left >= 24 then 75
    when hours_left >= 12 then 50
    else 0
  end
$$;

-- Trips are sellable until 30 minutes before departure.
-- -------------------------------------------------------------------------------------
-- Simulation clock. Fleet movement (trip start, finish, bus position, delays) runs on this
-- clock, which can run faster than real time (speed 60 = one real second is one minute).
-- Seat holds, payments and other ticketing timestamps stay on real time.
-- -------------------------------------------------------------------------------------
create table if not exists public.sim_clock (
  id boolean primary key default true check (id),
  speed numeric not null default 1 check (speed >= 1 and speed <= 600),
  real_anchor timestamptz not null default now(),
  sim_anchor timestamptz not null default now()
);
insert into public.sim_clock (id) values (true) on conflict do nothing;
-- Created after the security block above, so it is locked down here: server only.
alter table public.sim_clock enable row level security;
revoke all on public.sim_clock from anon, authenticated;
grant select, insert, update, delete on public.sim_clock to service_role;

create or replace function public.bk_now()
returns timestamptz language sql stable set search_path = '' as $$
  select c.sim_anchor + (now() - c.real_anchor) * c.speed::float8 from public.sim_clock c
$$;

-- Change the speed (continuing from the current simulated time) or reset to real time.
create or replace function public.bk_set_sim(p_speed numeric, p_reset boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.sim_clock;
begin
  if p_speed is not null and (p_speed < 1 or p_speed > 600) then
    perform public.bk_fail('BK400', 'Speed must be between 1 and 600');
  end if;
  if p_reset then
    update public.sim_clock set real_anchor = now(), sim_anchor = now(), speed = coalesce(p_speed, speed) where id;
  else
    update public.sim_clock set sim_anchor = public.bk_now(), real_anchor = now(), speed = coalesce(p_speed, speed) where id;
  end if;
  select * into c from public.sim_clock;
  return jsonb_build_object('speed', c.speed, 'real_anchor', c.real_anchor, 'sim_anchor', c.sim_anchor, 'now', now());
end
$$;

-- Expected departure and arrival, including delays.
create or replace function public.bk_trip_dep(t public.trips)
returns timestamptz language sql stable set search_path = '' as $$
  select t.departure_at + make_interval(mins => t.dep_delay_min)
$$;
create or replace function public.bk_trip_arr(t public.trips)
returns timestamptz language sql stable set search_path = '' as $$
  select t.arrival_at + make_interval(mins => t.dep_delay_min + t.traffic_delay_min)
$$;

create or replace function public.bk_trip_sellable(trip public.trips)
returns boolean language sql stable set search_path = '' as $$
  select trip.status in ('SCHEDULED', 'DELAYED')
    and public.bk_trip_dep(trip) > public.bk_now() + interval '30 minutes'
    and exists (select 1 from public.vendors v where v.id = trip.vendor_id
                and v.status = 'ACTIVE')
    and exists (select 1 from public.buses b where b.id = trip.bus_id and b.status = 'ACTIVE')
$$;

create or replace function public.bk_release_expired(p_trip uuid)
returns void language plpgsql set search_path = '' as $$
begin
  update public.booking_items bi set status = 'RELEASED'
  from public.bookings b
  where bi.booking_id = b.id and bi.trip_id = p_trip and bi.status = 'HELD'
    and b.status = 'PENDING_PAYMENT' and b.expires_at <= now();
  update public.bookings set status = 'EXPIRED'
  where trip_id = p_trip and status = 'PENDING_PAYMENT' and expires_at <= now();
end
$$;

-- Search ------------------------------------------------------------------------------
drop function if exists public.bk_search_trips(text, text, date);
create or replace function public.bk_search_trips(p_from text, p_to text, p_date date)
returns table (
  trip_id uuid, departure_at timestamptz, arrival_at timestamptz, fare numeric, bus_type bus_type_enum,
  bus_name text, amenities text[], operator_name text, vendor_id uuid, route_id uuid, origin text,
  destination text, duration_min int, total_seats int, available_seats int, seat_kind text,
  rating numeric, rating_count int, boarding_points text[], dropping_points text[], image_url text, bus_code text,
  scheduled_departure_at timestamptz, delay_min int, delay_cause text
) language sql stable security definer set search_path = '' as $$
  select t.id, public.bk_trip_dep(t), public.bk_trip_arr(t), t.fare, b.bus_type, coalesce(b.name, b.model_no), b.amenities,
    o.operator_name, t.vendor_id, r.id, r.start_point, r.end_point,
    (extract(epoch from t.arrival_at - t.departure_at) / 60)::int,
    cardinality(public.bk_layout_seats(c.seat_layout_json)),
    cardinality(public.bk_layout_seats(c.seat_layout_json)) - (
      select count(*)::int from public.booking_items bi join public.bookings bk on bk.id = bi.booking_id
      where bi.trip_id = t.id and (bi.status = 'CONFIRMED' or (bi.status = 'HELD' and bk.expires_at > now()))),
    coalesce(c.seat_layout_json->>'kind', 'SEAT'),
    rating.avg_rating, coalesce(rating.n, 0),
    array(select s.stop_name from public.route_stops s where s.permission_id = t.permission_id
          and s.stop_type in ('BOARDING', 'BOTH') order by s.sequence_order),
    array(select s.stop_name from public.route_stops s where s.permission_id = t.permission_id
          and s.stop_type in ('DROPPING', 'BOTH') order by s.sequence_order),
    b.image_url, b.code, t.departure_at, t.dep_delay_min + t.traffic_delay_min, t.delay_cause
  from public.trips t
  join public.routes r on r.id = t.route_id
  join public.buses b on b.id = t.bus_id
  join public.bus_operators o on o.id = b.operator_id
  join public.bus_capacities c on c.id = b.capacity_id
  left join lateral (
    select round(avg(rv.rating), 1) as avg_rating, count(*)::int as n
    from public.reviews rv join public.bookings bk on bk.id = rv.booking_id
    join public.trips tt on tt.id = bk.trip_id where tt.vendor_id = t.vendor_id
  ) rating on true
  where lower(r.start_point) = lower(trim(p_from)) and lower(r.end_point) = lower(trim(p_to))
    and r.status = 'ACTIVE'
    and (t.departure_at at time zone 'Asia/Dhaka')::date = p_date
    and public.bk_trip_sellable(t)
  order by public.bk_trip_dep(t)
$$;

create or replace function public.bk_cities()
returns table (city text, as_origin boolean, as_destination boolean)
language sql stable security definer set search_path = '' as $$
  select city, bool_or(is_origin), bool_or(not is_origin) from (
    select start_point as city, true as is_origin from public.routes where status = 'ACTIVE'
    union all
    select end_point, false from public.routes where status = 'ACTIVE'
  ) x group by city order by city
$$;

-- Popular routes: by confirmed seats in the last 60 days, then by upcoming trips.
create or replace function public.bk_popular_routes(p_limit int default 8)
returns table (route_id uuid, origin text, destination text, duration_min int, distance_km numeric,
               upcoming_trips int, lowest_fare numeric, operators int)
language sql stable security definer set search_path = '' as $$
  select r.id, r.start_point, r.end_point, r.travel_time_min, r.distance_km,
    count(t.id)::int, min(t.fare), count(distinct t.vendor_id)::int
  from public.routes r
  join public.trips t on t.route_id = r.id and public.bk_trip_sellable(t)
    and t.departure_at < now() + interval '30 days'
  where r.status = 'ACTIVE'
  group by r.id
  order by (select count(*) from public.booking_items bi join public.trips tt on tt.id = bi.trip_id
            where tt.route_id = r.id and bi.status = 'CONFIRMED'
              and tt.departure_at > now() - interval '60 days') desc,
           count(t.id) desc
  limit greatest(1, least(p_limit, 24))
$$;

-- Seat map ----------------------------------------------------------------------------
create or replace function public.bk_trip_seat_map(p_trip uuid, p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  t public.trips;
  result jsonb;
begin
  select * into t from public.trips where id = p_trip;
  if not found then perform public.bk_fail('BK404', 'This trip does not exist'); end if;

  select jsonb_build_object(
    'trip', jsonb_build_object(
      'id', t.id, 'departure_at', public.bk_trip_dep(t), 'arrival_at', public.bk_trip_arr(t), 'fare', t.fare,
      'scheduled_departure_at', t.departure_at, 'delay_min', t.dep_delay_min + t.traffic_delay_min, 'delay_cause', t.delay_cause, 'delay_note', t.delay_note,
      'status', t.status, 'sellable', public.bk_trip_sellable(t),
      'origin', r.start_point, 'destination', r.end_point, 'route_id', r.id,
      'bus_name', coalesce(b.name, b.model_no), 'bus_code', b.code, 'image_url', b.image_url, 'bus_type', b.bus_type, 'amenities', b.amenities,
      'operator_name', o.operator_name, 'reg_no', b.reg_no),
    'layout', c.seat_layout_json,
    'stops', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.stop_name, 'address', s.address, 'type', s.stop_type,
        'sequence', s.sequence_order, 'time', public.bk_trip_dep(t) + make_interval(mins => s.travel_time_min))
        order by s.sequence_order) from public.route_stops s where s.permission_id = t.permission_id), '[]'),
    'booked', coalesce((select jsonb_agg(bi.seat_number) from public.booking_items bi
        where bi.trip_id = t.id and bi.status = 'CONFIRMED'), '[]'),
    'held', coalesce((select jsonb_agg(bi.seat_number) from public.booking_items bi
        join public.bookings bk on bk.id = bi.booking_id
        where bi.trip_id = t.id and bi.status = 'HELD' and bk.expires_at > now()
          and bk.user_id is distinct from p_user), '[]'),
    'my_hold', (select jsonb_build_object('booking_id', bk.id, 'expires_at', bk.expires_at,
          'seats', (select jsonb_agg(seat_number) from public.booking_items where booking_id = bk.id and status = 'HELD'))
        from public.bookings bk where bk.trip_id = t.id and bk.user_id = p_user
          and bk.status = 'PENDING_PAYMENT' and bk.expires_at > now()
        order by bk.created_at desc limit 1)
  ) into result
  from public.routes r
  join public.buses b on b.id = t.bus_id
  join public.bus_operators o on o.id = b.operator_id
  join public.bus_capacities c on c.id = b.capacity_id
  where r.id = t.route_id;
  return result;
end
$$;

-- Hold seats for 10 minutes -----------------------------------------------------------
create or replace function public.bk_hold_seats(p_user uuid, p_trip uuid, p_seats text[],
  p_boarding uuid, p_dropping uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  t public.trips;
  u public.users;
  layout_seats text[];
  board public.route_stops;
  drop_stop public.route_stops;
  bk public.bookings;
  seat text;
begin
  select * into u from public.users where id = p_user;
  if not found or u.status <> 'ACTIVE' then perform public.bk_fail('BK403', 'Your account cannot book right now'); end if;

  select * into t from public.trips where id = p_trip for update;
  if not found then perform public.bk_fail('BK404', 'This trip does not exist'); end if;
  if not public.bk_trip_sellable(t) then
    perform public.bk_fail('BK409', 'Ticket sales for this trip are closed');
  end if;

  select public.bk_layout_seats(c.seat_layout_json) into layout_seats
  from public.buses b join public.bus_capacities c on c.id = b.capacity_id where b.id = t.bus_id;

  if p_seats is null or cardinality(p_seats) not between 1 and 4 then
    perform public.bk_fail('BK400', 'Choose between 1 and 4 seats');
  end if;
  if cardinality(p_seats) <> (select count(distinct s) from unnest(p_seats) s) or not p_seats <@ layout_seats then
    perform public.bk_fail('BK400', 'One or more seats are not on this coach');
  end if;

  select * into board from public.route_stops where id = p_boarding and permission_id = t.permission_id;
  select * into drop_stop from public.route_stops where id = p_dropping and permission_id = t.permission_id;
  if board.id is null or board.stop_type = 'DROPPING' or drop_stop.id is null or drop_stop.stop_type = 'BOARDING'
     or board.sequence_order >= drop_stop.sequence_order then
    perform public.bk_fail('BK400', 'Choose a valid boarding and dropping point');
  end if;

  perform public.bk_release_expired(p_trip);

  -- One live hold per passenger per trip: replace the previous one.
  update public.booking_items set status = 'RELEASED'
  where status = 'HELD' and booking_id in (select id from public.bookings
    where trip_id = p_trip and user_id = p_user and status = 'PENDING_PAYMENT');
  update public.bookings set status = 'CANCELLED', cancelled_at = now(), cancel_reason = 'Replaced by a new seat selection'
  where trip_id = p_trip and user_id = p_user and status = 'PENDING_PAYMENT';

  if (select count(*) from public.bookings where user_id = p_user and status = 'PENDING_PAYMENT'
      and expires_at > now()) >= 3 then
    perform public.bk_fail('BK409', 'You have too many unpaid seat holds. Pay for or release one first');
  end if;

  if exists (select 1 from public.booking_items where trip_id = p_trip and seat_number = any(p_seats)
             and status in ('HELD', 'CONFIRMED')) then
    perform public.bk_fail('BK409', 'One or more of these seats were just taken. Please choose again');
  end if;

  insert into public.bookings (user_id, trip_id, total_amount, status, pnr, contact_name, contact_phone,
    contact_email, boarding_stop_id, dropping_stop_id, seat_count, expires_at)
  values (p_user, p_trip, t.fare * cardinality(p_seats), 'PENDING_PAYMENT', public.bk_new_pnr(), u.name, u.phone,
    u.email, p_boarding, p_dropping, cardinality(p_seats), now() + interval '10 minutes')
  returning * into bk;

  foreach seat in array p_seats loop
    insert into public.booking_items (booking_id, trip_id, seat_number, price, status)
    values (bk.id, p_trip, seat, t.fare, 'HELD');
  end loop;
  return bk;
exception when unique_violation then
  perform public.bk_fail('BK409', 'One or more of these seats were just taken. Please choose again');
end
$$;

create or replace function public.bk_release_hold(p_user uuid, p_booking uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.booking_items set status = 'RELEASED'
  where booking_id = p_booking and status = 'HELD'
    and exists (select 1 from public.bookings where id = p_booking and user_id = p_user and status = 'PENDING_PAYMENT');
  update public.bookings set status = 'CANCELLED', cancelled_at = now(), cancel_reason = 'Released by passenger'
  where id = p_booking and user_id = p_user and status = 'PENDING_PAYMENT';
end
$$;

-- Passenger details -------------------------------------------------------------------
-- p_passengers = [{"seat":"A1","name":"...","age":30,"gender":"MALE"}]
create or replace function public.bk_save_passengers(p_user uuid, p_booking uuid, p_contact jsonb, p_passengers jsonb)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  bk public.bookings;
  item public.booking_items;
  p jsonb;
begin
  select * into bk from public.bookings where id = p_booking and user_id = p_user for update;
  if not found then perform public.bk_fail('BK404', 'Booking not found'); end if;
  if bk.status <> 'PENDING_PAYMENT' or bk.expires_at <= now() then
    perform public.bk_fail('BK409', 'Your seat hold has expired. Please choose your seats again');
  end if;
  if length(trim(coalesce(p_contact->>'name', ''))) not between 2 and 100
     or coalesce(p_contact->>'phone', '') !~ '^\+?[0-9]{10,15}$'
     or coalesce(p_contact->>'email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    perform public.bk_fail('BK400', 'Enter a valid contact name, mobile number and e-mail');
  end if;

  delete from public.passengers where booking_item_id in (select id from public.booking_items where booking_id = bk.id);
  for item in select * from public.booking_items where booking_id = bk.id and status = 'HELD' loop
    select value into p from jsonb_array_elements(p_passengers) where value->>'seat' = item.seat_number limit 1;
    if p is null or length(trim(coalesce(p->>'name', ''))) not between 2 and 100
       or coalesce(p->>'age', '') !~ '^[0-9]{1,3}$' or (p->>'age')::int > 120
       or coalesce(p->>'gender', '') not in ('MALE', 'FEMALE', 'OTHER') then
      perform public.bk_fail('BK400', 'Enter name, age and gender for seat ' || item.seat_number);
    end if;
    insert into public.passengers (booking_item_id, name, age, gender)
    values (item.id, trim(p->>'name'), (p->>'age')::int, p->>'gender');
  end loop;

  update public.bookings set contact_name = trim(p_contact->>'name'), contact_phone = p_contact->>'phone',
    contact_email = lower(p_contact->>'email')
  where id = bk.id returning * into bk;
  return bk;
end
$$;

-- Payment start: one payment row per booking, a fresh gateway reference per attempt ---
create or replace function public.bk_start_payment(p_user uuid, p_booking uuid, p_method payment_gateway_enum)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  bk public.bookings;
  pay public.payments;
  reference text;
begin
  select * into bk from public.bookings where id = p_booking and user_id = p_user for update;
  if not found then perform public.bk_fail('BK404', 'Booking not found'); end if;
  if bk.status <> 'PENDING_PAYMENT' or bk.expires_at <= now() + interval '30 seconds' then
    perform public.bk_fail('BK409', 'Your seat hold has expired. Please choose your seats again');
  end if;
  if exists (select 1 from public.booking_items bi where bi.booking_id = bk.id and bi.status = 'HELD'
             and not exists (select 1 from public.passengers ps where ps.booking_item_id = bi.id)) then
    perform public.bk_fail('BK400', 'Add passenger details for every seat first');
  end if;

  insert into public.payments (booking_id, payment_method, amount, status, currency, attempts)
  values (bk.id, p_method, bk.total_amount, 'INITIATED', 'BDT', 0)
  on conflict (booking_id) do update set payment_method = excluded.payment_method, amount = excluded.amount,
    status = 'INITIATED', updated_at = now()
  returning * into pay;

  reference := bk.pnr || '-' || (pay.attempts + 1);
  update public.payments set attempts = attempts + 1, gateway_session_id = reference
  where id = pay.id returning * into pay;

  return jsonb_build_object('payment_id', pay.id, 'reference', reference, 'amount', bk.total_amount,
    'currency', 'BDT', 'pnr', bk.pnr, 'expires_at', bk.expires_at);
end
$$;

-- Payment confirmation (webhook / IPN after signature and amount checks) --------------
create or replace function public.bk_confirm_payment(p_reference text, p_amount numeric, p_currency text,
  p_transaction text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pay public.payments;
  bk public.bookings;
  t public.trips;
  outcome text;
begin
  select * into pay from public.payments where gateway_session_id = p_reference for update;
  if not found then return jsonb_build_object('outcome', 'UNKNOWN'); end if;
  select * into bk from public.bookings where id = pay.booking_id for update;
  select * into t from public.trips where id = bk.trip_id for update;

  if bk.status = 'CONFIRMED' or pay.status = 'SUCCESS' then
    return jsonb_build_object('outcome', 'ALREADY_CONFIRMED', 'booking_id', bk.id, 'pnr', bk.pnr);
  end if;
  if upper(p_currency) <> 'BDT' or p_amount <> bk.total_amount then
    update public.payments set status = 'DISPUTED', webhook_data_json = p_payload, transaction_id = p_transaction,
      updated_at = now() where id = pay.id;
    return jsonb_build_object('outcome', 'AMOUNT_MISMATCH', 'booking_id', bk.id);
  end if;

  update public.payments set status = 'SUCCESS', transaction_id = p_transaction, payment_time = now(),
    webhook_data_json = p_payload, updated_at = now() where id = pay.id;

  if bk.status = 'PENDING_PAYMENT' and bk.expires_at > now() and t.status in ('SCHEDULED', 'DELAYED')
     and public.bk_trip_dep(t) > public.bk_now() then
    update public.booking_items set status = 'CONFIRMED' where booking_id = bk.id and status = 'HELD';
    outcome := 'CONFIRMED';
  elsif t.status in ('SCHEDULED', 'DELAYED') and public.bk_trip_dep(t) > public.bk_now() then
    -- Paid after the hold lapsed: confirm only if every seat is still free.
    begin
      update public.booking_items set status = 'CONFIRMED' where booking_id = bk.id;
      outcome := 'CONFIRMED';
    exception when unique_violation then
      outcome := 'REFUND_REQUIRED';
    end;
  else
    outcome := 'REFUND_REQUIRED';
  end if;

  if outcome = 'CONFIRMED' then
    update public.bookings set status = 'CONFIRMED', confirmed_at = now(), cancelled_at = null, cancel_reason = null
    where id = bk.id;
    insert into public.invoices (booking_id, payment_id, invoice_no, qr_ticket_data)
    values (bk.id, pay.id, 'INV-' || bk.pnr, bk.pnr) on conflict (booking_id) do nothing;
  else
    update public.booking_items set status = 'RELEASED' where booking_id = bk.id and status = 'HELD';
    update public.bookings set status = 'CANCELLED', cancelled_at = now(),
      cancel_reason = 'Payment arrived after the seats were released', refund_amount = bk.total_amount,
      refund_status = 'PENDING' where id = bk.id;
  end if;
  return jsonb_build_object('outcome', outcome, 'booking_id', bk.id, 'pnr', bk.pnr);
end
$$;

create or replace function public.bk_fail_payment(p_reference text, p_payload jsonb)
returns void language sql security definer set search_path = '' as $$
  update public.payments set status = 'FAILED', webhook_data_json = p_payload, updated_at = now()
  where gateway_session_id = p_reference and status = 'INITIATED'
$$;

-- Passenger cancellation --------------------------------------------------------------
create or replace function public.bk_cancel_booking(p_user uuid, p_booking uuid, p_reason text)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  bk public.bookings;
  t public.trips;
  hours_left numeric;
  percent int;
begin
  select * into bk from public.bookings where id = p_booking and user_id = p_user for update;
  if not found then perform public.bk_fail('BK404', 'Booking not found'); end if;
  if bk.status <> 'CONFIRMED' then perform public.bk_fail('BK409', 'Only confirmed tickets can be cancelled'); end if;
  select * into t from public.trips where id = bk.trip_id;
  hours_left := extract(epoch from public.bk_trip_dep(t) - public.bk_now()) / 3600;
  percent := public.bk_refund_percent(hours_left);
  if percent = 0 then
    perform public.bk_fail('BK409', 'Tickets can no longer be cancelled less than 12 hours before departure');
  end if;
  update public.booking_items set status = 'CANCELLED' where booking_id = bk.id and status = 'CONFIRMED';
  update public.bookings set status = 'CANCELLED', cancelled_at = now(),
    cancel_reason = left(coalesce(nullif(trim(p_reason), ''), 'Cancelled by passenger'), 300),
    refund_amount = round(bk.total_amount * percent / 100.0, 2), refund_status = 'PENDING'
  where id = bk.id returning * into bk;
  return bk;
end
$$;

create or replace function public.bk_mark_refunded(p_admin uuid, p_booking uuid, p_reference text)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare bk public.bookings;
begin
  select * into bk from public.bookings where id = p_booking for update;
  if not found or bk.refund_status <> 'PENDING' then
    perform public.bk_fail('BK409', 'This booking has no pending refund');
  end if;
  update public.bookings set status = 'REFUNDED', refund_status = 'PROCESSED',
    refund_reference = left(trim(p_reference), 120) where id = bk.id returning * into bk;
  update public.payments set status = 'REFUNDED', updated_at = now() where booking_id = bk.id;
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (p_admin, 'REFUND_PROCESSED', 'booking', bk.id, jsonb_build_object('reference', p_reference, 'amount', bk.refund_amount));
  return bk;
end
$$;

-- Admin approves a route request, optionally changing the fare and duration ------------
create or replace function public.bk_approve_route_request(p_admin uuid, p_permission uuid,
  p_fare numeric, p_duration int, p_note text)
returns public.route_permissions language plpgsql security definer set search_path = '' as $$
declare
  perm public.route_permissions;
  r public.routes;
  stop_name text;
  seq int := 0;
begin
  select * into perm from public.route_permissions where id = p_permission for update;
  if not found then perform public.bk_fail('BK404', 'Route request not found'); end if;
  if perm.status <> 'PENDING' then perform public.bk_fail('BK409', 'This request has already been decided'); end if;
  if p_fare is null or p_fare not between 50 and 20000 then perform public.bk_fail('BK400', 'Fare must be between 50 and 20000 BDT'); end if;
  if p_duration is null or p_duration not between 15 and 1440 then perform public.bk_fail('BK400', 'Duration must be between 15 minutes and 24 hours'); end if;

  select * into r from public.routes where lower(start_point) = lower(trim(perm.origin)) and lower(end_point) = lower(trim(perm.destination));
  if not found then
    insert into public.routes (route_name, start_point, end_point, distance_km, travel_time_min, status)
    values (trim(perm.origin) || ' to ' || trim(perm.destination), trim(perm.origin), trim(perm.destination), 0, p_duration, 'ACTIVE')
    returning * into r;
  end if;

  foreach stop_name in array perm.boarding_points loop
    seq := seq + 1;
    insert into public.route_stops (route_id, permission_id, stop_name, stop_type, travel_time_min, sequence_order)
    values (r.id, perm.id, trim(stop_name), 'BOARDING', 0, seq);
  end loop;
  foreach stop_name in array perm.dropping_points loop
    seq := seq + 1;
    insert into public.route_stops (route_id, permission_id, stop_name, stop_type, travel_time_min, sequence_order)
    values (r.id, perm.id, trim(stop_name), 'DROPPING', p_duration, seq);
  end loop;

  update public.route_permissions set status = 'APPROVED', route_id = r.id, approved_fare = p_fare,
    approved_duration_min = p_duration, note = nullif(trim(p_note), ''), decided_by = p_admin, decided_at = now()
  where id = perm.id returning * into perm;
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (p_admin, 'ROUTE_REQUEST_APPROVED', 'route_permission', perm.id,
    jsonb_build_object('fare', p_fare, 'duration', p_duration, 'proposed_fare', perm.proposed_fare, 'proposed_duration', perm.proposed_duration_min));
  return perm;
end
$$;

-- Operator: schedule and generate dated trips ----------------------------------------
-- A bus is free again the moment a trip's duration is over (no turnaround padding).
create or replace function public.bk_create_schedule(p_vendor uuid, p_bus uuid, p_permission uuid,
  p_departure time, p_days smallint[], p_from date, p_until date, p_fare numeric)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.vendors;
  b public.buses;
  perm public.route_permissions;
  sched public.trip_schedules;
  today date := (now() at time zone 'Asia/Dhaka')::date;
  d date;
  starts timestamptz;
  finish timestamptz;
  created int := 0;
begin
  select * into v from public.vendors where id = p_vendor;
  if not found or v.status <> 'ACTIVE' then
    perform public.bk_fail('BK403', 'Your operator account is suspended');
  end if;
  select * into b from public.buses where id = p_bus and vendor_id = p_vendor for update;
  if not found or b.status <> 'ACTIVE' then perform public.bk_fail('BK400', 'Choose one of your available buses'); end if;
  select * into perm from public.route_permissions where id = p_permission and vendor_id = p_vendor;
  if not found or perm.status <> 'APPROVED' then
    perform public.bk_fail('BK403', 'This route has not been approved for you');
  end if;
  if perm.bus_type <> b.bus_type then
    perform public.bk_fail('BK400', 'The bus class does not match the approved route class');
  end if;
  if p_fare is null or p_fare < 50 or p_fare > perm.approved_fare then
    perform public.bk_fail('BK400', 'Fare must be between 50 and the approved ' || perm.approved_fare || ' BDT');
  end if;
  if p_from is null or p_until is null or p_from < today or p_until < p_from or p_until > p_from + 90 then
    perform public.bk_fail('BK400', 'Choose a date range starting today or later and at most 90 days long');
  end if;
  if p_days is null or cardinality(p_days) = 0 or not p_days <@ array[0,1,2,3,4,5,6]::smallint[] then
    perform public.bk_fail('BK400', 'Choose at least one day of the week');
  end if;

  insert into public.trip_schedules (departure_time, arrival_time, base_price, currency, vendor_id, route_id, bus_id,
    permission_id, days_of_week, valid_from, valid_until, active)
  values (p_departure, p_departure + make_interval(mins => perm.approved_duration_min), p_fare, 'BDT', p_vendor, perm.route_id, b.id,
    perm.id, p_days, p_from, p_until, true)
  returning * into sched;

  d := p_from;
  while d <= p_until loop
    if extract(dow from d)::smallint = any(p_days) then
      starts := (d + p_departure) at time zone 'Asia/Dhaka';
      finish := starts + make_interval(mins => perm.approved_duration_min);
      if starts > public.bk_now() + interval '1 hour' then
        if exists (select 1 from public.trips x where x.bus_id = b.id and x.status <> 'CANCELLED'
                   and public.bk_trip_dep(x) < finish and public.bk_trip_arr(x) > starts) then
          perform public.bk_fail('BK409', 'Bus ' || b.code || ' is still on another trip around '
            || to_char(starts at time zone 'Asia/Dhaka', 'DD Mon YYYY HH24:MI'));
        end if;
        insert into public.trips (bus_id, route_id, schedule_id, date, status, vendor_id, permission_id, departure_at, arrival_at, fare)
        values (b.id, perm.route_id, sched.id, d, 'SCHEDULED', p_vendor, perm.id, starts, finish, p_fare);
        created := created + 1;
      end if;
    end if;
    d := d + 1;
  end loop;

  if created = 0 then perform public.bk_fail('BK400', 'No departures fall inside this date range'); end if;
  return jsonb_build_object('schedule_id', sched.id, 'trips_created', created);
end
$$;

-- Bus availability and condition (vendor for own buses; admin with p_vendor null) -------
drop function if exists public.bk_set_bus_state(uuid, uuid, uuid, text, text, text);
create or replace function public.bk_set_bus_state(p_actor uuid, p_vendor uuid, p_bus uuid,
  p_status text, p_condition text, p_note text, p_delay int default null)
returns public.buses language plpgsql security definer set search_path = '' as $$
declare
  b public.buses;
  cur public.trips;
  prior int;
begin
  select * into b from public.buses where id = p_bus for update;
  if not found or (p_vendor is not null and b.vendor_id <> p_vendor) then
    perform public.bk_fail('BK404', 'Bus not found');
  end if;

  if p_status is not null and p_status <> b.status then
    if p_status not in ('ACTIVE', 'OFF_DUTY', 'SUSPENDED') or (p_status = 'SUSPENDED' and p_vendor is not null) then
      perform public.bk_fail('BK400', 'Unknown bus status');
    end if;
    if b.status = 'SUSPENDED' and p_vendor is not null then
      perform public.bk_fail('BK403', 'This bus was suspended by an administrator');
    end if;
    if p_status <> 'ACTIVE' and exists (select 1 from public.trips t where t.bus_id = b.id and t.status <> 'CANCELLED'
                                         and public.bk_trip_arr(t) > public.bk_now()) then
      perform public.bk_fail('BK409', 'This bus has trips that are running or on sale. Cancel those trips first');
    end if;
    update public.buses set status = p_status where id = b.id;
    insert into public.bus_status_events (bus_id, actor_id, kind, value, note) values (b.id, p_actor, 'STATUS', p_status, nullif(trim(p_note), ''));
  end if;

  if p_delay is not null and (p_delay < 5 or p_delay > 720) then
    perform public.bk_fail('BK400', 'Give the expected traffic delay in minutes, between 5 and 720');
  end if;
  if p_condition is not null and p_condition not in ('NORMAL', 'IN_TRAFFIC', 'ACCIDENT', 'BREAKDOWN') then
    perform public.bk_fail('BK400', 'Unknown bus condition');
  end if;

  -- A traffic jam with an expected delay holds the running trip still for that long and
  -- pushes its arrival, and every later trip of this bus, back by the same amount.
  if p_condition = 'IN_TRAFFIC' and p_delay is not null then
    select t.* into cur from public.trips t where t.bus_id = b.id and t.status = 'EN_ROUTE'
      order by t.departure_at limit 1 for update;
    if not found then
      perform public.bk_fail('BK409', 'This bus is not on a trip right now, so a traffic delay cannot be recorded');
    end if;
    prior := cur.jam_prior_min + case when cur.jam_started_at is null then 0 else
      round(least(greatest(extract(epoch from public.bk_now() - cur.jam_started_at) / 60, 0), cur.traffic_delay_min - cur.jam_prior_min))::int end;
    update public.trips set jam_prior_min = prior, traffic_delay_min = prior + p_delay, jam_started_at = public.bk_now(),
      delay_cause = 'TRAFFIC', delay_note = nullif(trim(p_note), '') where id = cur.id;
    perform public.bk_recompute_bus_delays(b.id);
  elsif p_condition = 'NORMAL' and b.condition = 'IN_TRAFFIC' then
    -- The jam cleared early: only the time already lost counts.
    update public.trips set traffic_delay_min = jam_prior_min + round(least(greatest(
        extract(epoch from public.bk_now() - jam_started_at) / 60, 0), traffic_delay_min - jam_prior_min))::int
    where bus_id = b.id and status = 'EN_ROUTE' and jam_started_at is not null and traffic_delay_min > jam_prior_min
      and public.bk_now() < jam_started_at + make_interval(mins => traffic_delay_min - jam_prior_min);
    perform public.bk_recompute_bus_delays(b.id);
  end if;

  if p_condition is not null and (p_condition <> b.condition or p_delay is not null) then
    update public.buses set condition = p_condition, condition_note = nullif(trim(p_note), ''), condition_updated_at = public.bk_now() where id = b.id;
    insert into public.bus_status_events (bus_id, actor_id, kind, value, note)
    values (b.id, p_actor, 'CONDITION', p_condition,
      nullif(trim(concat_ws(' · ', case when p_delay is not null then 'Expected delay ' || p_delay || ' min' end, nullif(trim(p_note), ''))), ''));
  end if;

  select * into b from public.buses where id = p_bus;
  return b;
end
$$;

-- Delay cascade: walk a bus's unfinished trips in order. A trip cannot leave before the bus
-- has arrived from the one before, so it is pushed back (status DELAYED) by the overlap.
create or replace function public.bk_recompute_bus_delays(p_bus uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.trips;
  prev_arr timestamptz;
  dd int;
begin
  for r in select * from public.trips where bus_id = p_bus and status <> 'CANCELLED' order by departure_at loop
    if r.status in ('SCHEDULED', 'BOARDING', 'DELAYED') then
      dd := case when prev_arr is not null and prev_arr > r.departure_at
                 then ceil(extract(epoch from prev_arr - r.departure_at) / 60)::int else 0 end;
      update public.trips set dep_delay_min = dd,
        status = case when dd > 0 then 'DELAYED'::public.trip_status_enum else 'SCHEDULED'::public.trip_status_enum end,
        delay_cause = case when dd > 0 then 'PREVIOUS_TRIP' else null end
      where id = r.id and (dep_delay_min is distinct from dd or (status = 'DELAYED') <> (dd > 0));
      prev_arr := r.arrival_at + make_interval(mins => dd + r.traffic_delay_min);
    else
      prev_arr := r.arrival_at + make_interval(mins => r.dep_delay_min + r.traffic_delay_min);
    end if;
  end loop;
end
$$;

-- Fleet playground: real status from vendor/admin updates plus trip timing ----------------
create or replace function public.bk_fleet_status(p_vendor uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(row order by row->>'code'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', b.id, 'code', b.code, 'name', coalesce(b.name, b.model_no), 'reg_no', b.reg_no, 'bus_type', b.bus_type,
      'image_url', b.image_url, 'operator', o.operator_name, 'status', b.status, 'condition', b.condition,
      'condition_note', b.condition_note, 'condition_updated_at', b.condition_updated_at,
      'state', case
        when b.status = 'SUSPENDED' then 'SUSPENDED'
        when b.status <> 'ACTIVE' then 'OFF_DUTY'
        when b.condition in ('ACCIDENT', 'BREAKDOWN') then b.condition
        when cur.id is not null and (jam.active or (b.condition = 'IN_TRAFFIC' and cur.traffic_delay_min = 0)) then 'IN_TRAFFIC'
        when cur.id is not null then 'ON_TRIP'
        else 'AVAILABLE' end,
      'current_trip', case when cur.id is null then null else jsonb_build_object(
        'id', cur.id, 'origin', cr.start_point, 'destination', cr.end_point,
        'departure_at', public.bk_trip_dep(cur), 'scheduled_departure_at', cur.departure_at,
        'arrival_at', public.bk_trip_arr(cur), 'scheduled_arrival_at', cur.arrival_at,
        'duration_min', round(extract(epoch from cur.arrival_at - cur.departure_at) / 60),
        'dep_delay_min', cur.dep_delay_min, 'traffic_delay_min', cur.traffic_delay_min, 'jam_prior_min', cur.jam_prior_min,
        'jam_started_at', cur.jam_started_at, 'jam_active', jam.active, 'delay_cause', cur.delay_cause, 'delay_note', cur.delay_note,
        'stops', coalesce((select jsonb_agg(jsonb_build_object('name', st.stop_name, 'minutes', st.travel_time_min) order by st.travel_time_min)
                           from public.route_stops st where st.permission_id = cur.permission_id and st.travel_time_min > 0
                             and st.travel_time_min < extract(epoch from cur.arrival_at - cur.departure_at) / 60), '[]'::jsonb),
        'progress', round(least(100, greatest(0, 100 * (extract(epoch from public.bk_now() - public.bk_trip_dep(cur)) - jam.stopped)
                          / nullif(extract(epoch from cur.arrival_at - cur.departure_at), 0)))::numeric, 1)) end,
      'next_trip', case when nxt.id is null then null else jsonb_build_object(
        'id', nxt.id, 'origin', nr.start_point, 'destination', nr.end_point,
        'departure_at', public.bk_trip_dep(nxt), 'scheduled_departure_at', nxt.departure_at,
        'dep_delay_min', nxt.dep_delay_min, 'delay_cause', nxt.delay_cause,
        'waiting_for_bus', cur.id is not null and nxt.delay_cause = 'PREVIOUS_TRIP') end,
      'free_at', case when cur.id is null then null else public.bk_trip_arr(cur) end
    ) as row
    from public.buses b
    join public.bus_operators o on o.id = b.operator_id
    left join lateral (select t.* from public.trips t where t.bus_id = b.id and t.status <> 'CANCELLED'
      and public.bk_trip_dep(t) <= public.bk_now() and public.bk_trip_arr(t) > public.bk_now() order by t.departure_at limit 1) cur on true
    left join lateral (select
        coalesce(cur.jam_prior_min, 0) + coalesce(least(greatest(extract(epoch from public.bk_now() - cur.jam_started_at) / 60, 0),
          cur.traffic_delay_min - cur.jam_prior_min), 0) as stopped_min) jm on true
    left join lateral (select jm.stopped_min * 60 as stopped,
        (cur.jam_started_at is not null and public.bk_now() < cur.jam_started_at + make_interval(mins => cur.traffic_delay_min - cur.jam_prior_min)) as active) jam on true
    left join public.routes cr on cr.id = cur.route_id
    left join lateral (select t.* from public.trips t where t.bus_id = b.id and t.status not in ('CANCELLED', 'COMPLETED')
      and public.bk_trip_dep(t) > public.bk_now() order by public.bk_trip_dep(t) limit 1) nxt on true
    left join public.routes nr on nr.id = nxt.route_id
    where p_vendor is null or b.vendor_id = p_vendor
  ) x
$$;

-- Operator or admin cancels a trip: every paid passenger gets a full refund -----------
create or replace function public.bk_cancel_trip(p_actor uuid, p_trip uuid, p_vendor uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t public.trips;
  affected int;
begin
  select * into t from public.trips where id = p_trip for update;
  if not found or (p_vendor is not null and t.vendor_id <> p_vendor) then
    perform public.bk_fail('BK404', 'Trip not found');
  end if;
  if t.status in ('CANCELLED', 'COMPLETED') or public.bk_trip_dep(t) <= public.bk_now() then
    perform public.bk_fail('BK409', 'Only upcoming trips can be cancelled');
  end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then
    perform public.bk_fail('BK400', 'Give passengers a reason for the cancellation');
  end if;

  update public.trips set status = 'CANCELLED', cancel_reason = trim(p_reason), cancelled_at = now() where id = t.id;
  update public.booking_items set status = 'RELEASED' where trip_id = t.id and status = 'HELD';
  update public.bookings set status = 'CANCELLED', cancelled_at = now(), cancel_reason = 'Trip cancelled by operator'
  where trip_id = t.id and status = 'PENDING_PAYMENT';
  update public.booking_items set status = 'CANCELLED' where trip_id = t.id and status = 'CONFIRMED';
  update public.bookings set status = 'CANCELLED', cancelled_at = now(),
    cancel_reason = 'Trip cancelled: ' || trim(p_reason), refund_amount = total_amount, refund_status = 'PENDING'
  where trip_id = t.id and status = 'CONFIRMED';
  get diagnostics affected = row_count;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (p_actor, 'TRIP_CANCELLED', 'trip', t.id, jsonb_build_object('reason', p_reason, 'refunds', affected));
  return jsonb_build_object('trip_id', t.id, 'passenger_refunds', affected);
end
$$;

-- Manifest ----------------------------------------------------------------------------
create or replace function public.bk_trip_manifest(p_trip uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'seat', bi.seat_number, 'passenger', ps.name, 'age', ps.age, 'gender', ps.gender,
    'pnr', bk.pnr, 'contact_phone', bk.contact_phone, 'boarding', sb.stop_name, 'dropping', sd.stop_name
  ) order by bi.seat_number), '[]')
  from public.booking_items bi
  join public.bookings bk on bk.id = bi.booking_id
  left join public.passengers ps on ps.booking_item_id = bi.id
  left join public.route_stops sb on sb.id = bk.boarding_stop_id
  left join public.route_stops sd on sd.id = bk.dropping_stop_id
  where bi.trip_id = p_trip and bi.status = 'CONFIRMED'
$$;

-- Reports (Asia/Dhaka calendar days) -------------------------------------------------
create or replace function public.bk_sales_report(p_vendor uuid, p_from date, p_to date)
returns jsonb language sql stable security definer set search_path = '' as $$
  with trips_in as (
    select t.*, (t.departure_at at time zone 'Asia/Dhaka')::date as day,
      cardinality(public.bk_layout_seats(c.seat_layout_json)) as seats
    from public.trips t join public.buses b on b.id = t.bus_id join public.bus_capacities c on c.id = b.capacity_id
    where (p_vendor is null or t.vendor_id = p_vendor)
      and (t.departure_at at time zone 'Asia/Dhaka')::date between p_from and p_to
  ), sold as (
    select bk.trip_id, count(bi.id) filter (where bi.status = 'CONFIRMED') as seats_sold,
      sum(bi.price) filter (where bi.status = 'CONFIRMED') as revenue
    from public.bookings bk join public.booking_items bi on bi.booking_id = bk.id
    where bk.trip_id in (select id from trips_in) group by bk.trip_id
  ), money as (
    select coalesce(sum(p.amount) filter (where p.status in ('SUCCESS', 'REFUNDED')), 0) as captured,
      coalesce(sum(bk.refund_amount) filter (where bk.refund_status = 'PROCESSED'), 0) as refunded,
      coalesce(sum(bk.refund_amount) filter (where bk.refund_status = 'PENDING'), 0) as refunds_pending
    from public.bookings bk join public.payments p on p.booking_id = bk.id
    where bk.trip_id in (select id from trips_in)
  )
  select jsonb_build_object(
    'trips', (select count(*) filter (where status <> 'CANCELLED') from trips_in),
    'cancelled_trips', (select count(*) filter (where status = 'CANCELLED') from trips_in),
    'seats_offered', (select coalesce(sum(seats) filter (where status <> 'CANCELLED'), 0) from trips_in),
    'seats_sold', (select coalesce(sum(seats_sold), 0) from sold),
    'ticket_revenue', (select coalesce(sum(revenue), 0) from sold),
    'captured', (select captured from money),
    'refunded', (select refunded from money),
    'refunds_pending', (select refunds_pending from money),
    'net', (select captured - refunded from money),
    'by_day', coalesce((select jsonb_agg(row_to_json(x) order by x.day) from (
        select ti.day, count(*) filter (where ti.status <> 'CANCELLED') as trips,
          coalesce(sum(s.seats_sold), 0) as seats_sold, coalesce(sum(s.revenue), 0) as revenue
        from trips_in ti left join sold s on s.trip_id = ti.id group by ti.day) x), '[]'),
    'by_route', coalesce((select jsonb_agg(row_to_json(x) order by x.revenue desc) from (
        select r.start_point || ' → ' || r.end_point as route, count(*) filter (where ti.status <> 'CANCELLED') as trips,
          coalesce(sum(s.seats_sold), 0) as seats_sold, coalesce(sum(s.revenue), 0) as revenue
        from trips_in ti join public.routes r on r.id = ti.route_id left join sold s on s.trip_id = ti.id
        group by r.start_point, r.end_point) x), '[]')
  )
$$;

-- -------------------------------------------------------------------------------------
-- Automatic trip status: SCHEDULED -> EN_ROUTE at departure, -> COMPLETED at arrival.
-- The playground also derives status from the clock when it reads, so the screens are right
-- even if this job is late. Run every minute by pg_cron where available (see below),
-- and by /api/cron/sync-trips or any page that reads the fleet.
-- -------------------------------------------------------------------------------------
create or replace function public.bk_sync_trip_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  finished int;
  started int;
  cleared int;
  r record;
begin
  update public.trips t set status = 'COMPLETED'
  where t.status in ('SCHEDULED', 'BOARDING', 'EN_ROUTE', 'DELAYED') and public.bk_trip_arr(t) <= public.bk_now();
  get diagnostics finished = row_count;

  -- Push later trips of delayed buses back before deciding what has started.
  for r in select distinct bus_id from public.trips
           where status in ('SCHEDULED', 'BOARDING', 'DELAYED', 'EN_ROUTE') and (dep_delay_min > 0 or traffic_delay_min > 0) loop
    perform public.bk_recompute_bus_delays(r.bus_id);
  end loop;

  update public.trips t set status = 'EN_ROUTE'
  where t.status in ('SCHEDULED', 'BOARDING', 'DELAYED')
    and public.bk_trip_dep(t) <= public.bk_now() and public.bk_trip_arr(t) > public.bk_now();
  get diagnostics started = row_count;

  -- A traffic jam with a set delay ends by itself when that time has passed.
  with ended as (
    update public.buses bu set condition = 'NORMAL', condition_note = null, condition_updated_at = public.bk_now()
    where bu.condition = 'IN_TRAFFIC' and exists (
      select 1 from public.trips t where t.bus_id = bu.id and t.jam_started_at = bu.condition_updated_at
        and t.traffic_delay_min > t.jam_prior_min
        and t.jam_started_at + make_interval(mins => t.traffic_delay_min - t.jam_prior_min) <= public.bk_now())
    returning bu.id)
  insert into public.bus_status_events (bus_id, kind, value, note) select id, 'CONDITION', 'NORMAL', 'Traffic cleared' from ended;
  get diagnostics cleared = row_count;

  return jsonb_build_object('started', started, 'completed', finished, 'traffic_cleared', cleared, 'sim_now', public.bk_now());
end
$$;

-- Once a minute, if the pg_cron extension can be enabled (Supabase: Database > Extensions).
-- Without it the app still syncs on every fleet read and through /api/cron/sync-trips.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'bookify-trip-status';
  perform cron.schedule('bookify-trip-status', '* * * * *', 'select public.bk_sync_trip_status()');
exception when others then
  raise notice 'pg_cron not enabled (%): trips are still synced whenever the fleet is read', sqlerrm;
end
$$;

-- -------------------------------------------------------------------------------------
-- 9. Function permissions: server only
-- -------------------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'bk\_%' loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end
$$;

-- The trigger on auth.users runs as its owner; it needs no grant.
