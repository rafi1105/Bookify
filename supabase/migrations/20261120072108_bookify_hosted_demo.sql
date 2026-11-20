create table public.bookify_buses (
  id uuid primary key default gen_random_uuid(),
  vendor text not null,
  name text not null,
  registration text not null unique,
  coach text not null check (coach in ('AC','Non-AC','Sleeper')),
  seats text[] not null check (cardinality(seats) between 1 and 60),
  image text,
  suspended boolean not null default false
);

create table public.bookify_proposals (
  id uuid primary key default gen_random_uuid(),
  vendor text not null,
  origin text not null,
  destination text not null,
  fare integer not null check (fare between 10000 and 1000000),
  duration integer check (duration between 15 and 1440),
  boarding text not null,
  dropping text not null,
  decision text not null default 'pending' check (decision in ('pending','approved','rejected')),
  reason text,
  check (lower(origin) <> lower(destination)),
  check (decision <> 'approved' or duration is not null)
);

create table public.bookify_trips (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references public.bookify_buses(id),
  proposal_id uuid not null references public.bookify_proposals(id),
  vendor text not null,
  coach text not null,
  bus_name text not null,
  image text,
  origin text not null,
  destination text not null,
  boarding text not null,
  dropping text not null,
  seats text[] not null,
  departure timestamptz not null,
  arrival timestamptz not null,
  fare integer not null,
  cancelled boolean not null default false
);

create table public.bookify_orders (
  id uuid primary key,
  trip_id uuid not null references public.bookify_trips(id),
  passenger text not null,
  contact text not null,
  customer text not null,
  seats text[] not null,
  total integer not null,
  expires timestamptz not null,
  state text not null default 'held' check (state in ('held','confirmed','refund_required','refunded')),
  stripe_session text unique,
  payment_intent text unique,
  created_at timestamptz not null default now()
);

create table public.bookify_incidents (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references public.bookify_buses(id),
  note text not null,
  created_at timestamptz not null default now()
);

create table public.bookify_reviews (
  order_id uuid primary key references public.bookify_orders(id),
  bus_id uuid not null references public.bookify_buses(id),
  rating integer not null check (rating between 1 and 5)
);

create table public.bookify_suspensions (
  vendor text primary key,
  reason text not null
);

alter table public.bookify_buses enable row level security;
alter table public.bookify_proposals enable row level security;
alter table public.bookify_trips enable row level security;
alter table public.bookify_orders enable row level security;
alter table public.bookify_incidents enable row level security;
alter table public.bookify_reviews enable row level security;
alter table public.bookify_suspensions enable row level security;

revoke all on public.bookify_buses, public.bookify_proposals, public.bookify_trips, public.bookify_orders,
  public.bookify_incidents, public.bookify_reviews, public.bookify_suspensions from anon, authenticated;
grant select, insert, update, delete on public.bookify_buses, public.bookify_proposals, public.bookify_trips,
  public.bookify_orders, public.bookify_incidents, public.bookify_reviews, public.bookify_suspensions to service_role;

create index bookify_trip_departure on public.bookify_trips (departure);
create index bookify_trip_bus on public.bookify_trips (bus_id, departure);
create index bookify_order_trip on public.bookify_orders (trip_id);
create index bookify_order_customer on public.bookify_orders (customer, created_at desc);

create function public.bookify_publish(bus uuid, proposal uuid, operator text, starts timestamptz)
returns public.bookify_trips language plpgsql set search_path = '' as $$
declare
  b public.bookify_buses;
  p public.bookify_proposals;
  t public.bookify_trips;
  finish timestamptz;
begin
  select * into b from public.bookify_buses where id = bus and vendor = operator for update;
  select * into p from public.bookify_proposals where id = proposal and vendor = operator;
  if b.id is null or b.suspended or p.decision is distinct from 'approved'
     or exists (select 1 from public.bookify_suspensions where vendor = operator)
     or starts <= clock_timestamp() or starts > now() + interval '90 days' then
    raise exception 'Bus, approval or departure is ineligible';
  end if;
  finish := starts + make_interval(mins => p.duration);
  if exists (select 1 from public.bookify_trips
    where bus_id = bus and not cancelled and departure < finish + interval '30 minutes'
      and arrival + interval '30 minutes' > starts) then
    raise exception 'Departure overlaps a trip or turnaround';
  end if;
  insert into public.bookify_trips
    (bus_id, proposal_id, vendor, coach, bus_name, image, origin, destination, boarding, dropping, seats, departure, arrival, fare)
  values (b.id, p.id, operator, b.coach, b.name, b.image, p.origin, p.destination, p.boarding, p.dropping, b.seats, starts, finish, p.fare)
  returning * into t;
  return t;
end
$$;

create function public.bookify_hold(order_id uuid, trip uuid, buyer text, requested text[], rider text, email text)
returns public.bookify_orders language plpgsql set search_path = '' as $$
declare
  t public.bookify_trips;
  result public.bookify_orders;
begin
  select * into t from public.bookify_trips where id = trip for update;
  if not found or t.cancelled or t.departure <= clock_timestamp() + interval '10 minutes'
     or exists (select 1 from public.bookify_buses where id = t.bus_id and suspended)
     or exists (select 1 from public.bookify_suspensions where vendor = t.vendor) then
    raise exception 'Trip is unavailable';
  end if;
  if cardinality(requested) not between 1 and 6 or not requested <@ t.seats
     or cardinality(requested) <> (select count(distinct s) from unnest(requested) as s) then
    raise exception 'Invalid seats';
  end if;
  if exists (select 1 from public.bookify_orders o where o.trip_id = trip and o.seats && requested
    and (o.state = 'confirmed' or (o.state = 'held' and o.expires > clock_timestamp()))) then
    raise exception 'One or more seats are unavailable';
  end if;
  insert into public.bookify_orders (id, trip_id, customer, seats, passenger, contact, total, expires)
  values (order_id, trip, buyer, requested, rider, email, t.fare * cardinality(requested), clock_timestamp() + interval '600 seconds')
  returning * into result;
  return result;
end
$$;

create function public.bookify_fulfill(order_id uuid, intent text)
returns public.bookify_orders language plpgsql set search_path = '' as $$
declare
  t public.bookify_trips;
  o public.bookify_orders;
begin
  select * into o from public.bookify_orders where id = order_id;
  if not found then raise exception 'Unknown order'; end if;
  select * into t from public.bookify_trips where id = o.trip_id for update;
  select * into o from public.bookify_orders where id = order_id for update;
  if o.state <> 'held' then return o; end if;
  update public.bookify_orders set payment_intent = intent, state =
    case when expires > clock_timestamp() and t.departure > clock_timestamp() and not t.cancelled
      and not exists (select 1 from public.bookify_buses where id = t.bus_id and suspended)
      and not exists (select 1 from public.bookify_suspensions where vendor = t.vendor)
    then 'confirmed' else 'refund_required' end
  where id = order_id returning * into o;
  return o;
end
$$;

revoke execute on function public.bookify_publish(uuid, uuid, text, timestamptz),
  public.bookify_hold(uuid, uuid, text, text[], text, text), public.bookify_fulfill(uuid, text)
  from public, anon, authenticated;
grant execute on function public.bookify_publish(uuid, uuid, text, timestamptz),
  public.bookify_hold(uuid, uuid, text, text[], text, text), public.bookify_fulfill(uuid, text)
  to service_role;

create table public.bookify_route_durations (
  origin text not null,
  destination text not null,
  duration integer not null check (duration between 15 and 1440),
  primary key (origin, destination)
);
alter table public.bookify_route_durations enable row level security;
revoke all on public.bookify_route_durations from anon, authenticated;
grant select, insert on public.bookify_route_durations to service_role;

create function public.bookify_decide_proposal(proposal uuid, accept boolean, minutes integer, note text)
returns void language plpgsql set search_path = '' as $$
declare
  p public.bookify_proposals;
  approved_duration integer;
begin
  select * into p from public.bookify_proposals where id = proposal for update;
  if not found or p.decision <> 'pending' then
    raise exception 'Proposal has already been decided or is missing';
  end if;
  if accept then
    insert into public.bookify_route_durations values (lower(p.origin), lower(p.destination), minutes)
      on conflict do nothing;
    select duration into approved_duration from public.bookify_route_durations
      where origin = lower(p.origin) and destination = lower(p.destination);
    if minutes is distinct from approved_duration then
      raise exception 'The approved route duration is % minutes', approved_duration;
    end if;
  end if;
  update public.bookify_proposals set decision = case when accept then 'approved' else 'rejected' end,
    duration = approved_duration, reason = note where id = proposal;
end
$$;

create function public.bookify_publish_schedule(bus uuid, proposal uuid, operator text, starts timestamptz, occurrences integer)
returns void language plpgsql set search_path = '' as $$
begin
  if occurrences not between 1 and 14 then raise exception 'Choose between 1 and 14 daily departures'; end if;
  for step in 0..occurrences - 1 loop
    perform public.bookify_publish(bus, proposal, operator, starts + step * interval '24 hours');
  end loop;
end
$$;

revoke execute on function public.bookify_decide_proposal(uuid, boolean, integer, text),
  public.bookify_publish_schedule(uuid, uuid, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.bookify_decide_proposal(uuid, boolean, integer, text),
  public.bookify_publish_schedule(uuid, uuid, text, timestamptz, integer) to service_role;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('bookify-coaches', 'bookify-coaches', true, 1048576, array['image/jpeg','image/png','image/webp'])
    on conflict (id) do nothing;
  end if;
end
$$;

create function public.bookify_cancel_trip(trip uuid, operator text)
returns setof public.bookify_orders language plpgsql set search_path = '' as $$
declare
  t public.bookify_trips;
begin
  select * into t from public.bookify_trips where id = trip for update;
  if not found or (operator is not null and t.vendor <> operator)
     or (not t.cancelled and t.departure <= clock_timestamp()) then
    raise exception 'Future trip not found';
  end if;
  update public.bookify_trips set cancelled = true where id = trip;
  update public.bookify_orders set state = 'refund_required' where trip_id = trip and state = 'confirmed';
  return query select * from public.bookify_orders where trip_id = trip and state = 'refund_required';
end
$$;

revoke execute on function public.bookify_cancel_trip(uuid, text) from public, anon, authenticated;
grant execute on function public.bookify_cancel_trip(uuid, text) to service_role;
