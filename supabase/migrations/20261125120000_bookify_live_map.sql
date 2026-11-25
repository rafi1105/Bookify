-- Bookify live map: operator colours, GPS positions, driver tracking links, road incidents,
-- cached road geometry and geocoding, and "buses passing through" search.
-- Additive and safe to re-run. Run it after 20261124120000_bookify_v2_production.sql.

-- 1. Operator colour on the map -------------------------------------------------------
alter table public.bus_operators add column if not exists map_color text;
do $$ begin
  alter table public.bus_operators add constraint bk_operator_map_color check (map_color is null or map_color ~ '^#[0-9a-fA-F]{6}$');
exception when duplicate_object then null; end $$;

-- 2. Geocoding and road geometry caches (one OpenRouteService call per place / per road) ----
create table if not exists public.geo_places (
  name_key text primary key,
  name text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  source text not null check (source in ('GAZETTEER', 'ORS', 'NOMINATIM', 'MANUAL')),
  created_at timestamptz not null default now()
);

create table if not exists public.route_geometries (
  key text primary key,
  waypoints jsonb not null,
  coords jsonb not null,
  distance_km numeric(8,2) not null check (distance_km >= 0),
  duration_min int not null check (duration_min >= 0),
  source text not null check (source in ('ORS', 'OSRM', 'STRAIGHT')),
  created_at timestamptz not null default now()
);

-- 3. Driver tracking links: a secret per bus; only its SHA-256 is stored -----------------
create table if not exists public.bus_trackers (
  bus_id uuid primary key references public.buses(id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

-- 4. GPS positions pushed by a driver's phone or a GPS device ----------------------------
create table if not exists public.bus_positions (
  id bigint generated always as identity primary key,
  bus_id uuid not null references public.buses(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  speed_kmh real check (speed_kmh between 0 and 200),
  heading real check (heading >= 0 and heading < 360),
  accuracy_m real check (accuracy_m >= 0),
  recorded_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index if not exists bk_positions_bus on public.bus_positions (bus_id, recorded_at desc);
create index if not exists bk_positions_received on public.bus_positions (received_at);

-- 5. Accidents and other road incidents reported by an admin, operator or driver ----------
create table if not exists public.road_incidents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('ACCIDENT', 'TRAFFIC_JAM', 'BREAKDOWN', 'ROAD_BLOCK', 'OTHER')),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  note text check (note is null or length(note) <= 300),
  bus_id uuid references public.buses(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  reported_by uuid references public.users(id) on delete set null,
  reporter_role text not null check (reporter_role in ('ADMIN', 'OPERATOR', 'DRIVER')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users(id) on delete set null
);
create index if not exists bk_incidents_open on public.road_incidents (created_at desc) where resolved_at is null;

do $$
declare t text;
begin
  foreach t in array array['geo_places', 'route_geometries', 'bus_trackers', 'bus_positions', 'road_incidents'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end
$$;
grant usage, select on sequence public.bus_positions_id_seq to service_role;

-- Keep two days of positions; called by the ingest endpoint now and then.
create or replace function public.bk_prune_positions()
returns int language sql security definer set search_path = '' as $$
  with gone as (delete from public.bus_positions where received_at < now() - interval '2 days' returning 1)
  select count(*)::int from gone
$$;

-- Latest fix of each bus since p_since (vendor's buses only when p_vendor is set).
create or replace function public.bk_latest_positions(p_vendor uuid, p_since timestamptz)
returns table (bus_id uuid, trip_id uuid, lat double precision, lng double precision, speed_kmh real,
  heading real, accuracy_m real, recorded_at timestamptz, received_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select distinct on (p.bus_id) p.bus_id, p.trip_id, p.lat, p.lng, p.speed_kmh, p.heading, p.accuracy_m, p.recorded_at, p.received_at
  from public.bus_positions p join public.buses b on b.id = p.bus_id
  where p.received_at >= p_since and (p_vendor is null or b.vendor_id = p_vendor)
  order by p.bus_id, p.recorded_at desc
$$;

-- 6. Buses passing through: trips whose boarding and dropping points include the searched cities,
-- e.g. a Dhaka to Rangpur coach that drops at Bogura answers a Dhaka to Bogura search.
drop function if exists public.bk_search_via(text, text, date);
create or replace function public.bk_search_via(p_from text, p_to text, p_date date)
returns table (trip_id uuid, board_at text, drop_at text, route_origin text, route_destination text)
language sql stable security definer set search_path = '' as $$
  select t.id, coalesce(sb.stop_name, r.start_point), sd.stop_name, r.start_point, r.end_point
  from public.trips t
  join public.routes r on r.id = t.route_id
  left join lateral (select s.stop_name, s.sequence_order from public.route_stops s
    where s.permission_id = t.permission_id and s.stop_type in ('BOARDING', 'BOTH')
      and lower(s.stop_name) like lower(trim(p_from)) || '%' order by s.sequence_order limit 1) sb on true
  join lateral (select s.stop_name, s.sequence_order from public.route_stops s
    where s.permission_id = t.permission_id and s.stop_type in ('DROPPING', 'BOTH')
      and lower(s.stop_name) like lower(trim(p_to)) || '%'
      and (sb.sequence_order is null or s.sequence_order > sb.sequence_order)
    order by s.sequence_order limit 1) sd on true
  where (sb.stop_name is not null or lower(r.start_point) = lower(trim(p_from)))
    and not (lower(r.start_point) = lower(trim(p_from)) and lower(r.end_point) = lower(trim(p_to)))
    and r.status = 'ACTIVE'
    and (t.departure_at at time zone 'Asia/Dhaka')::date = p_date
    and public.bk_trip_sellable(t)
$$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('bk_prune_positions', 'bk_latest_positions', 'bk_search_via') loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end
$$;
