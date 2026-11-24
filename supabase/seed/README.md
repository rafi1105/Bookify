# Bookify sample data (seed)

Run **after** the v2 migration, in the Supabase SQL editor. Nothing here runs automatically.

1. `supabase/seed/bookify_seed_operators.sql` creates the operators, buses, approved routes (both directions) and 14 days of trips. Safe to re-run: it reuses what exists, creates what is missing and resets every operator login (password and confirmation).
2. `supabase/seed/bookify_seed_cleanup.sql` removes only these rows (it refuses if passengers have bookings on the seeded trips).
3. Regenerate with `node scripts/generate-seed.mjs` after editing the data in that script.

## Admin and passenger logins (sign in at /sign-in)

| Role | E-mail | Password | Lands on |
|---|---|---|---|
| Administrator | admin@bookify.com | admin1234 | /admin |
| Passenger | passenger@bookify.com | passenger1234 | home page, My bookings |

The seed creates them (confirmed, with a sign-in identity) and repairs their password and role on every re-run. The cleanup SQL removes them too, except a passenger who has made bookings.

## Operator logins (sign in at /sign-in, you land on the operator dashboard)

| Operator | E-mail | Password | Buses (Non-AC / AC / Sleeper) | Routes from Dhaka (and back) |
|---|---|---|---|---|
| SR Travels | travel@sr.com | srtravel1234 | 15 (6 / 6 / 3) | Bogura, Rangpur, Dinajpur, Rajshahi |
| Hanif Enterprise | travel@hanif.com | haniftravel1234 | 15 (5 / 7 / 3) | Chattogram, Cox's Bazar, Rajshahi, Khulna, Barishal |
| Green Line | travel@greenline.com | greenlinetravel1234 | 14 (2 / 8 / 4) | Khulna, Jessore, Barishal, Chattogram |
| Shyamoli | travel@shyamoli.com | shyamolitravel1234 | 12 (4 / 6 / 2) | Chattogram, Cox's Bazar, Bogura, Rangpur, Dinajpur |
| Manik | travel@manik.com | maniktravel1234 | 10 (5 / 4 / 1) | Jessore, Khulna, Rajshahi |
| Nabil | travel@nabil.com | nabiltravel1234 | 8 (4 / 3 / 1) | Rajshahi, Bogura, Rangpur |
| Ena Transport | travel@ena.com | enatravel1234 | 6 (3 / 3 / 0) | Cox's Bazar, Chattogram, Sylhet |
| Anna | travel@anna.com | annatravel1234 | 5 (3 / 2 / 0) | Jessore, Khulna |
| Saintmartin | travel@saintmartin.com | saintmartintravel1234 | 4 (0 / 2 / 2) | Cox's Bazar, Chattogram |
| National Travels | travel@national.com | nationaltravel1234 | 3 (1 / 2 / 0) | Sylhet, Chattogram |
| Soudia | travel@soudia.com | soudiatravel1234 | 2 (0 / 2 / 0) | Cox's Bazar |

Registration numbers are `<PREFIX>-100`, `<PREFIX>-101`, ... per operator (stored upper-case, e.g. SR-100, MANIK-100). Image URLs are empty: add them with Edit.

## Checking it worked
The seed ends with a table (one row per operator). `password_ok` and `confirmed` must be `true` and `buses` and `trips` above 0. Then `public.vendors` and `public.bus_operators` list 11 operators (plus your own), and `public.buses` about 94 rows. If the SQL editor shows an error instead, send me the exact message: the whole run is rolled back, so nothing is half-created.

## Where the numbers come from

Operators and destinations follow public listings (Shohoz, Bookaway, Shyamoli's counter list, press reports). Anchors: Dhaka-Rangpur AC Tk 1,200-1,500 and non-AC Tk 600-700; Dhaka-Cox's Bazar non-AC Tk 1,100, AC economy Tk 1,300, Hyundai business Tk 2,000, sleeper Tk 1,800 (bdnews24/Financial Express, 2023); BRTA long-haul rate Tk 2.15/km. Everything else (other fares, journey times, terminal names, which operator runs which fleet mix) is an estimate. Fix any value in the operator or admin screens.

Seeded passwords (`<brand>travel1234`, lower case, no spaces) are for development. Change or delete these accounts before real use (cleanup SQL deletes them).
