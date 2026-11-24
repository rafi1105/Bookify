-- Removes ONLY the rows created by bookify_seed_operators.sql (matched by the operator login e-mails below).
-- Refuses to run if passengers have bookings on those trips: cancel and refund those first.
do $clean$
declare
  vendor_ids uuid[];
  user_ids uuid[];
  route_ids uuid[];
  n int;
begin
  select array_agg(id) into user_ids from auth.users where lower(email) in ('travel@sr.com', 'travel@hanif.com', 'travel@greenline.com', 'travel@shyamoli.com', 'travel@manik.com', 'travel@nabil.com', 'travel@ena.com', 'travel@anna.com', 'travel@saintmartin.com', 'travel@national.com', 'travel@soudia.com');
  select array_agg(id) into vendor_ids from public.vendors where user_id = any(coalesce(user_ids, '{}'));
  vendor_ids := coalesce(vendor_ids, '{}');

  select count(*) into n from public.bookings b join public.trips t on t.id = b.trip_id where t.vendor_id = any(vendor_ids);
  if n > 0 then raise exception '% booking(s) exist on seeded trips. Cancel/refund them first.', n; end if;

  select array_agg(distinct route_id) into route_ids from public.route_permissions where vendor_id = any(vendor_ids) and route_id is not null;
  delete from public.trips where vendor_id = any(vendor_ids);
  delete from public.trip_schedules where vendor_id = any(vendor_ids);
  delete from public.route_permissions where vendor_id = any(vendor_ids);
  delete from public.buses where vendor_id = any(vendor_ids);
  delete from public.bus_capacities where vendor_id = any(vendor_ids);
  delete from public.vendors where id = any(vendor_ids);
  delete from public.routes r where r.id = any(coalesce(route_ids, '{}'))
    and not exists (select 1 from public.route_permissions x where x.route_id = r.id)
    and not exists (select 1 from public.trips x where x.route_id = r.id)
    and not exists (select 1 from public.trip_schedules x where x.route_id = r.id)
    and not exists (select 1 from public.route_stops x where x.route_id = r.id);
  delete from auth.identities where user_id = any(user_ids);
  delete from auth.users where id = any(user_ids);

  -- The test administrator and passenger logins. A passenger who has made bookings is kept.
  select array_agg(id) into user_ids from auth.users where lower(email) in ('admin@bookify.com', 'passenger@bookify.com');
  delete from auth.identities i where i.user_id = any(coalesce(user_ids, '{}'))
    and not exists (select 1 from public.bookings b where b.user_id = i.user_id);
  delete from auth.users u where u.id = any(coalesce(user_ids, '{}'))
    and not exists (select 1 from public.bookings b where b.user_id = u.id);
  raise notice 'Seed removed';
end
$clean$;
