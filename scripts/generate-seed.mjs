// Generates supabase/seed/*.sql: realistic Bangladeshi operators, buses, approved routes and trips.
// Run: node scripts/generate-seed.mjs   (the output is committed; nothing here touches a database)
import { writeFileSync } from 'node:fs';
import { buildLayout } from '../src/lib/layout.js';

// Fares (BDT per seat) and journey time per destination from Dhaka. Anchors: Dhaka-Rangpur AC 1,200-1,500 and
// non-AC 600-700, Dhaka-Cox's Bazar non-AC 1,100 / AC 1,300 (2023 press reports); the rest are estimates.
const CITIES = {
  Bogura:   { dur: 330, nonAc: 500,  ac: 1000, sleeper: null, points: ['Satmatha Bus Terminal', 'Chelopara'] },
  Rangpur:  { dur: 480, nonAc: 700,  ac: 1400, sleeper: 1800, points: ['Rangpur Bus Terminal', 'Modern More'] },
  Dinajpur: { dur: 540, nonAc: 750,  ac: 1500, sleeper: 1900, points: ['Dinajpur Bus Terminal', 'Balubari'] },
  Rajshahi: { dur: 390, nonAc: 650,  ac: 1200, sleeper: null, points: ['Rajshahi Central Bus Terminal', 'Shiroil'] },
  Khulna:   { dur: 420, nonAc: 700,  ac: 1300, sleeper: 1800, points: ['Sonadanga Bus Terminal', 'Gollamari'] },
  Jessore:  { dur: 300, nonAc: 550,  ac: 1000, sleeper: null, points: ['Jessore Bus Terminal', 'Monihar'] },
  Barishal: { dur: 300, nonAc: 500,  ac: 900,  sleeper: null, points: ['Barishal Bus Terminal', 'Rupatali'] },
  Chattogram: { dur: 390, nonAc: 650, ac: 1200, sleeper: 1600, points: ['AK Khan', 'Dampara', 'GEC Circle'] },
  "Cox's Bazar": { dur: 540, nonAc: 1100, ac: 1300, sleeper: 1800, points: ['Kolatoli', "Cox's Bazar Bus Terminal", 'Link Road'] },
  Sylhet:   { dur: 390, nonAc: 650,  ac: 1200, sleeper: 1600, points: ['Kadamtoli Bus Terminal', 'Ambarkhana'] },
};
// Dhaka counters (names as used by operators; Kalyanpur spelled as on signboards).
const D = { kal: 'Kallyanpur', gab: 'Gabtoli', say: 'Sayedabad', fak: 'Fakirapool', abd: 'Abdullahpur', moh: 'Mohakhali', kam: 'Kamalapur', ara: 'Arambag', tec: 'Technical', asd: 'Asad Gate' };

const MODELS = {
  NON_AC: ['Ashok Leyland Viking', 'Hino RM2', 'Tata Marcopolo', 'Isuzu LT134'],
  AC_ECONOMY: ['Hyundai Universe AC', 'Hyundai Aero Space', 'Scania K310 AC', 'Volvo B9R AC', 'Daewoo BH115 AC'],
  SLEEPER_AC: ['Hyundai Universe Sleeper', 'Scania Sleeper', 'Volvo B11R Sleeper'],
};
const AMEN = { NON_AC: ['Water bottle'], AC_ECONOMY: ['Wi-Fi', 'Charging port', 'Water bottle', 'Snacks', 'Reclining seats'], SLEEPER_AC: ['Wi-Fi', 'Charging port', 'Water bottle', 'Blanket', 'Snacks', 'TV', 'Toilet'] };
// layout choices per class
const LAYOUTS = {
  NON_AC: [{ pattern: '2+2', rows: 11 }, { pattern: '2+2', rows: 10 }, { pattern: '2+2', rows: 12 }],
  AC_ECONOMY: [{ pattern: '2+2', rows: 10 }, { pattern: '1+2', rows: 10 }, { pattern: '2+2', rows: 9 }, { pattern: '1+2', rows: 11 }],
  SLEEPER_AC: [{ pattern: '2+1', rows: 6, decks: 2, kind: 'BERTH' }, { pattern: '1+1', rows: 8, decks: 2, kind: 'BERTH' }, { pattern: '2+1', rows: 7, decks: 2, kind: 'BERTH' }],
};
const TIMES = { NON_AC: ['06:00', '07:30', '09:00', '11:00', '13:00', '15:00'], AC_ECONOMY: ['07:00', '08:30', '10:00', '14:00', '15:30', '22:00'], SLEEPER_AC: ['21:00', '21:45', '22:30', '23:00'] };

// name, email, prefix, [nonAc, ac, sleeper] buses, dhaka counters, destinations
const OPERATORS = [
  ['SR Travels', 'travel@sr.com', 'SR', [6, 6, 3], [D.kal, D.gab, D.say], ['Bogura', 'Rangpur', 'Dinajpur', 'Rajshahi']],
  ['Hanif Enterprise', 'travel@hanif.com', 'Hanif', [5, 7, 3], [D.kam, D.say, D.fak], ['Chattogram', "Cox's Bazar", 'Rajshahi', 'Khulna', 'Barishal']],
  ['Green Line', 'travel@greenline.com', 'GreenLine', [2, 8, 4], [D.kal, D.say, D.fak], ['Khulna', 'Jessore', 'Barishal', 'Chattogram']],
  ['Shyamoli', 'travel@shyamoli.com', 'Shamoli', [4, 6, 2], [D.kal, D.gab, D.abd, D.say], ['Chattogram', "Cox's Bazar", 'Bogura', 'Rangpur', 'Dinajpur']],
  ['Manik', 'travel@manik.com', 'Manik', [5, 4, 1], [D.gab, D.abd, D.moh], ['Jessore', 'Khulna', 'Rajshahi']],
  ['Nabil', 'travel@nabil.com', 'Nabil', [4, 3, 1], [D.gab, D.abd, D.say], ['Rajshahi', 'Bogura', 'Rangpur']],
  ['Ena Transport', 'travel@ena.com', 'Ena', [3, 3, 0], [D.kam, D.say, D.fak], ["Cox's Bazar", 'Chattogram', 'Sylhet']],
  ['Anna', 'travel@anna.com', 'Anna', [3, 2, 0], [D.gab, D.kal, D.asd], ['Jessore', 'Khulna']],
  ['Saintmartin', 'travel@saintmartin.com', 'Saintmartin', [0, 2, 2], [D.kam, D.say, D.fak], ["Cox's Bazar", 'Chattogram']],
  ['National Travels', 'travel@national.com', 'National', [1, 2, 0], [D.say, D.fak, D.kam], ['Sylhet', 'Chattogram']],
  ['Soudia', 'travel@soudia.com', 'Soudia', [0, 2, 0], [D.kam, D.say], ["Cox's Bazar"]],
];
const CLASS_KEY = { NON_AC: 'nonAc', AC_ECONOMY: 'ac', SLEEPER_AC: 'sleeper' };
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

const data = OPERATORS.map(([company, email, prefix, [nA, aA, sA], counters, dests]) => {
  const brandShort = company.replace(/ (Travels|Enterprise|Transport)$/, '');
  const password = `${brandShort.toLowerCase().replace(/[^a-z0-9]/g, '')}travel1234`;
  const buses = []; const perms = new Map(); const schedules = [];
  const classes = [...Array(nA).fill('NON_AC'), ...Array(aA).fill('AC_ECONOMY'), ...Array(sA).fill('SLEEPER_AC')];
  const counter = {};
  classes.forEach((cls, i) => {
    const idx = buses.length;
    const reg = `${prefix.toUpperCase()}-${100 + idx}`;
    const lay = LAYOUTS[cls][(counter[cls] = (counter[cls] || 0) + 1) % LAYOUTS[cls].length];
    const built = buildLayout({ kind: 'SEAT', decks: 1, ...lay });
    const model = MODELS[cls][counter[cls] % MODELS[cls].length];
    const eligible = dests.filter((c) => CITIES[c][CLASS_KEY[cls]]);
    const city = eligible[idx % eligible.length];
    const c = CITIES[city];
    buses.push({ reg, name: `${brandShort} ${cls === 'NON_AC' ? 'Non-AC' : cls === 'SLEEPER_AC' ? 'Sleeper' : 'AC'} ${String(idx + 1).padStart(2, '0')}`, model, cls, seats: built.seatCount, layout: built.layout, amenities: AMEN[cls].slice(0, cls === 'NON_AC' ? 1 : 5) });
    for (const dir of ['out', 'back']) {
      const key = `${city}|${cls}|${dir}`;
      if (!perms.has(key)) {
        const fare = c[CLASS_KEY[cls]];
        perms.set(key, dir === 'out'
          ? { key, origin: 'Dhaka', destination: city, cls, fare, dur: c.dur, boarding: counters, dropping: c.points }
          : { key, origin: city, destination: 'Dhaka', cls, fare, dur: c.dur, boarding: c.points, dropping: counters });
      }
    }
    // Outbound at t; the bus returns 90 minutes after arrival, so it is free again before the next day's outbound.
    const t = toMin(TIMES[cls][idx % TIMES[cls].length]);
    let back = t + c.dur + 90; back = Math.ceil(back / 15) * 15;
    if (back + c.dur > t + 1440) throw new Error('turnaround does not fit: ' + reg);
    schedules.push({ bus: reg, perm: `${city}|${cls}|out`, time: hhmm(t), carry: 0 });
    schedules.push({ bus: reg, perm: `${city}|${cls}|back`, time: hhmm(back), carry: Math.floor(back / 1440) });
  });
  return { company, email, password, buses, perms: [...perms.values()], schedules };
});

// Non-operator test logins: an administrator (role 3) and a passenger (role 1).
const ACCOUNTS = [
  { email: 'admin@bookify.com', password: 'admin1234', name: 'Bookify Admin', role: 3 },
  { email: 'passenger@bookify.com', password: 'passenger1234', name: 'Test Passenger', role: 1 },
];
const accountsJson = JSON.stringify(ACCOUNTS);
const checkRows = [...data, ...ACCOUNTS].map((v) => `('${v.email}', '${v.password}')`).join(', ');
const json = JSON.stringify(data).replace(/\$/g, '\\u0024');
const seed = `-- Bookify sample data: ${data.length} operators, ${data.reduce((n, v) => n + v.buses.length, 0)} buses, approved routes (both directions) and 14 days of trips.
-- Generated by scripts/generate-seed.mjs. Run it yourself in the Supabase SQL editor AFTER the v2 migration.
-- Safe to re-run: existing rows are reused, missing ones are created.
-- Remove it again with supabase/seed/bookify_seed_cleanup.sql.
-- Also creates admin@bookify.com / admin1234 (administrator) and passenger@bookify.com / passenger1234 (passenger).
-- Logins: travel@<brand>.com with password <brand>travel1234, e.g. travel@sr.com / srtravel1234 (full table in supabase/seed/README.md).
-- Re-running also repairs and resets these logins (password, confirmation, identity).
-- Fares and journey times are realistic estimates (see README); fix anything in the operator or admin screens.

do $seed$
declare
  d jsonb;
  b jsonb;
  p jsonb;
  s jsonb;
  uid uuid;
  vid uuid;
  oid uuid;
  cap uuid;
  bid uuid;
  pid uuid;
  perm_ids jsonb;
  bus_ids jsonb;
  today date := (now() at time zone 'Asia/Dhaka')::date;
  made int;
  total_trips int := 0;
  total_buses int := 0;
  data jsonb := $json$${json}$json$::jsonb;
  accounts jsonb := $acc$${accountsJson}$acc$::jsonb;
  a jsonb;
begin
  -- Administrator and passenger test logins (created, or repaired if they already exist)
  for a in select * from jsonb_array_elements(accounts) loop
    select id into uid from auth.users where lower(email) = lower(a->>'email');
    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change)
      values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', a->>'email',
        crypt(a->>'password', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', a->>'name', 'email_verified', true), now(), now(), '', '', '', '');
    else
      update auth.users set encrypted_password = crypt(a->>'password', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()), aud = 'authenticated', role = 'authenticated',
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        confirmation_token = coalesce(confirmation_token, ''), recovery_token = coalesce(recovery_token, ''),
        email_change_token_new = coalesce(email_change_token_new, ''), email_change = coalesce(email_change, ''),
        updated_at = now()
      where id = uid;
    end if;
    if not exists (select 1 from auth.identities where user_id = uid and provider = 'email') then
      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (uid::text, uid, jsonb_build_object('sub', uid::text, 'email', a->>'email', 'email_verified', true), 'email', now(), now(), now());
    end if;
    insert into public.users (id, name, email, role_id) values (uid, left(a->>'name', 150), a->>'email', (a->>'role')::int)
    on conflict (id) do update set role_id = (a->>'role')::int, name = excluded.name, status = 'ACTIVE';
  end loop;

  for d in select * from jsonb_array_elements(data) loop
    -- 1. Login. Created if missing; if it exists (even half-seeded) the password and confirmation are reset.
    select id into uid from auth.users where lower(email) = lower(d->>'email');
    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change)
      values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', d->>'email',
        crypt(d->>'password', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', d->>'company', 'email_verified', true), now(), now(), '', '', '', '');
    else
      update auth.users set encrypted_password = crypt(d->>'password', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()), aud = 'authenticated', role = 'authenticated',
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        confirmation_token = coalesce(confirmation_token, ''), recovery_token = coalesce(recovery_token, ''),
        email_change_token_new = coalesce(email_change_token_new, ''), email_change = coalesce(email_change, ''),
        updated_at = now()
      where id = uid;
    end if;
    if not exists (select 1 from auth.identities where user_id = uid and provider = 'email') then
      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (uid::text, uid, jsonb_build_object('sub', uid::text, 'email', d->>'email', 'email_verified', true), 'email', now(), now(), now());
    end if;

    -- 2. Profile, operator and brand (the auth trigger normally creates public.users)
    insert into public.users (id, name, email, role_id) values (uid, left(d->>'company', 150), d->>'email', 2)
    on conflict (id) do update set role_id = 2, name = excluded.name, status = 'ACTIVE';
    select id into vid from public.vendors where user_id = uid;
    if vid is null then
      insert into public.vendors (user_id, company_name, approval_status) values (uid, d->>'company', 'APPROVED') returning id into vid;
    else
      update public.vendors set company_name = d->>'company', approval_status = 'APPROVED', status = 'ACTIVE' where id = vid;
    end if;
    select id into oid from public.bus_operators where vendor_id = vid limit 1;
    if oid is null then
      insert into public.bus_operators (vendor_id, operator_name) values (vid, d->>'company') returning id into oid;
    end if;

    -- 3. Buses (skipped when the registration number already exists)
    bus_ids := '{}'::jsonb;
    for b in select * from jsonb_array_elements(d->'buses') loop
      select id into bid from public.buses where reg_no = b->>'reg';
      if bid is null then
        insert into public.bus_capacities (capacity_value, seat_layout_json, vendor_id, name)
        values ((b->>'seats')::int, b->'layout', vid, (b->>'seats') || ' seats')
        returning id into cap;
        insert into public.buses (operator_id, vendor_id, reg_no, model_no, name, bus_type, capacity_id, amenities, status)
        values (oid, vid, b->>'reg', b->>'model', b->>'name', (b->>'cls')::bus_type_enum, cap,
          array(select jsonb_array_elements_text(b->'amenities')), 'ACTIVE')
        returning id into bid;
        total_buses := total_buses + 1;
      end if;
      bus_ids := bus_ids || jsonb_build_object(b->>'reg', bid);
    end loop;

    -- 4. Route requests, approved at the researched fare and journey time
    perm_ids := '{}'::jsonb;
    for p in select * from jsonb_array_elements(d->'perms') loop
      select id into pid from public.route_permissions
      where vendor_id = vid and lower(trim(origin)) = lower(p->>'origin') and lower(trim(destination)) = lower(p->>'destination')
        and bus_type = (p->>'cls')::bus_type_enum and status in ('PENDING', 'APPROVED');
      if pid is null then
        insert into public.route_permissions (vendor_id, origin, destination, boarding_points, dropping_points, bus_type,
          proposed_fare, proposed_duration_min)
        values (vid, p->>'origin', p->>'destination', array(select jsonb_array_elements_text(p->'boarding')),
          array(select jsonb_array_elements_text(p->'dropping')), (p->>'cls')::bus_type_enum, (p->>'fare')::numeric, (p->>'dur')::int)
        returning id into pid;
      end if;
      if (select status from public.route_permissions where id = pid) = 'PENDING' then
        perform public.bk_approve_route_request(null, pid, (p->>'fare')::numeric, (p->>'dur')::int, 'Sample data');
      end if;
      perm_ids := perm_ids || jsonb_build_object(p->>'key', pid);
    end loop;

    -- 5. Trips for the next 14 days (a bus/route schedule that already exists is left alone)
    for s in select * from jsonb_array_elements(d->'schedules') loop
      if not exists (select 1 from public.trip_schedules
                     where bus_id = (bus_ids->>(s->>'bus'))::uuid and permission_id = (perm_ids->>(s->>'perm'))::uuid) then
        made := (public.bk_create_schedule(vid, (bus_ids->>(s->>'bus'))::uuid, (perm_ids->>(s->>'perm'))::uuid,
          (s->>'time')::time, array[0,1,2,3,4,5,6]::smallint[], today + (s->>'carry')::int, today + 13 + (s->>'carry')::int,
          (select approved_fare from public.route_permissions where id = (perm_ids->>(s->>'perm'))::uuid))->>'trips_created')::int;
        total_trips := total_trips + made;
      end if;
    end loop;
  end loop;
  raise notice 'Seed finished: % buses and % trips created this run', total_buses, total_trips;
end
$seed$;

-- Check: one row per login. password_ok and confirmed must be true. Operators need buses and trips above 0;
-- role_id is 3 for the administrator, 1 for the passenger, 2 for operators.
select u.email,
       v.company_name,
       (select pu.role_id from public.users pu where pu.id = u.id) as role_id,
       (u.encrypted_password = crypt(c.pw, u.encrypted_password)) as password_ok,
       u.email_confirmed_at is not null as confirmed,
       (select count(*) from public.buses b where b.vendor_id = v.id) as buses,
       (select count(*) from public.trips t where t.vendor_id = v.id) as trips
from (values ${checkRows}) as c(email, pw)
left join auth.users u on lower(u.email) = c.email
left join public.vendors v on v.user_id = u.id
order by u.email;
`;
writeFileSync(new URL('../supabase/seed/bookify_seed_operators.sql', import.meta.url), seed);

const emails = data.map((v) => `'${v.email}'`).join(', ');
const accountEmails = ACCOUNTS.map((a) => `'${a.email}'`).join(', ');
const cleanup = `-- Removes ONLY the rows created by bookify_seed_operators.sql (matched by the operator login e-mails below).
-- Refuses to run if passengers have bookings on those trips: cancel and refund those first.
do $clean$
declare
  vendor_ids uuid[];
  user_ids uuid[];
  route_ids uuid[];
  n int;
begin
  select array_agg(id) into user_ids from auth.users where lower(email) in (${emails});
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
  select array_agg(id) into user_ids from auth.users where lower(email) in (${accountEmails});
  delete from auth.identities i where i.user_id = any(coalesce(user_ids, '{}'))
    and not exists (select 1 from public.bookings b where b.user_id = i.user_id);
  delete from auth.users u where u.id = any(coalesce(user_ids, '{}'))
    and not exists (select 1 from public.bookings b where b.user_id = u.id);
  raise notice 'Seed removed';
end
$clean$;
`;
writeFileSync(new URL('../supabase/seed/bookify_seed_cleanup.sql', import.meta.url), cleanup);
console.log(data.map((v) => `${v.company}: ${v.buses.length} buses, ${v.perms.length} route permissions, ${v.schedules.length} schedules`).join('\n'));
