-- Optional synthetic fixtures for a dedicated Bookify demo database.
insert into public.bookify_buses (id, vendor, name, registration, coach, seats)
values
  ('a0000000-0000-4000-8000-000000000001','Demo Express','Demo Coach 101','DEMO-101','AC',
    array['1A','1B','1C','2A','2B','2C','3A','3B','3C','4A','4B','4C']),
  ('a0000000-0000-4000-8000-000000000002','Demo Transit','Demo Coach 202','DEMO-202','Sleeper',
    array['1A','1B','2A','2B','3A','3B','4A','4B']),
  ('a0000000-0000-4000-8000-000000000003','Demo Express','Demo Coach 303','DEMO-303','Non-AC',
    array['1A','1B','1C','1D','2A','2B','2C','2D','3A','3B','3C','3D'])
on conflict (id) do nothing;

insert into public.bookify_proposals (id, vendor, origin, destination, boarding, dropping, fare)
values
  ('b0000000-0000-4000-8000-000000000001','Demo Express','Dhaka','Chattogram','Sayedabad','Dampara',120000),
  ('b0000000-0000-4000-8000-000000000002','Demo Transit','Dhaka','Chattogram','Sayedabad','Dampara',180000),
  ('b0000000-0000-4000-8000-000000000003','Demo Express','Dhaka','Bogura','Gabtoli','Bogura terminal',80000)
on conflict (id) do nothing;

do $$
declare
  p public.bookify_proposals;
  b public.bookify_buses;
  hour_local integer := 8;
begin
  for p in select * from public.bookify_proposals where id::text like 'b0000000-0000-4000-8000-00000000000%'
    order by id loop
    if p.decision = 'pending' then
      perform public.bookify_decide_proposal(p.id, true, case when p.destination = 'Bogura' then 480 else 360 end, 'Demo seed');
    end if;
    select * into b from public.bookify_buses where id::text = 'a' || substring(p.id::text from 2);
    if b.id is not null and not exists (select 1 from public.bookify_trips where bus_id = b.id and departure > now()) then
      perform public.bookify_publish_schedule(b.id, p.id, p.vendor,
        (date_trunc('day', now() at time zone 'Asia/Dhaka') + interval '1 day' + hour_local * interval '1 hour') at time zone 'Asia/Dhaka', 7);
    end if;
    hour_local := hour_local + 3;
  end loop;
end
$$;
