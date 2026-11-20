import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

test('approved publication, overlap prevention, atomic inventory and idempotent fulfillment', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls');
  const migration = await readFile(new URL('../../../supabase/migrations/20261120072108_bookify_hosted_demo.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  const [{ id: bus }] = (await db.query(`insert into bookify_buses (vendor,name,registration,coach,seats)
    values ('Vendor','Bus','Demo-1','AC',array['1A','1B','1C']) returning id`)).rows;
  const [{ id: proposal }] = (await db.query(`insert into bookify_proposals (vendor,origin,destination,fare,boarding,dropping)
    values ('Vendor','Dhaka','Bogura',50000,'Terminal A','Terminal B') returning id`)).rows;

  const publish = (operator, offset) => db.query(
    "select * from bookify_publish($1,$2,$3,now() + $4::int * interval '1 hour')", [bus, proposal, operator, offset]);
  await assert.rejects(publish('Vendor', 24), /ineligible/);
  await db.query("select bookify_decide_proposal($1,true,480,null)", [proposal]);
  await assert.rejects(publish('Other vendor', 24), /ineligible/);
  const [{ id: trip, arrival, departure }] = (await publish('Vendor', 24)).rows;
  assert.equal(Date.parse(arrival) - Date.parse(departure), 480 * 60000);
  await assert.rejects(publish('Vendor', 26), /overlaps/);
  await publish('Vendor', 34);
  await db.query("select bookify_publish_schedule($1,$2,'Vendor',now() + interval '60 hours',2)", [bus, proposal]);
  assert.equal((await db.query('select count(*)::int as count from bookify_trips')).rows[0].count, 4);
  const hold = (id, seats) => db.query('select * from bookify_hold($1,$2,$3,$4,$5,$6)',
    [id, trip, 'buyer-' + id, seats, 'Test passenger', 'test@example.com']);
  const first = randomUUID();
  const second = randomUUID();
  const attempts = await Promise.allSettled([hold(first, ['1A', '1B']), hold(second, ['1A', '1C'])]);
  assert.equal(attempts.filter(({ status }) => status === 'fulfilled').length, 1);
  assert.equal((await db.query('select count(*)::int as count from bookify_orders')).rows[0].count, 1);
  const [{ id: winner, seats, total }] = (await db.query('select * from bookify_orders')).rows;
  assert.equal(total, 100000);
  const freeSeat = seats.includes('1C') ? '1B' : '1C';
  const expired = randomUUID();
  await hold(expired, [freeSeat]);
  await db.query("update bookify_orders set expires = now() - interval '1 second' where id = $1", [expired]);
  await hold(randomUUID(), [freeSeat]);
  const fulfill = async (id, intent) => (await db.query('select * from bookify_fulfill($1,$2)', [id, intent])).rows[0];
  assert.equal((await fulfill(winner, 'pi_success')).state, 'confirmed');
  assert.equal((await fulfill(winner, 'pi_success')).payment_intent, 'pi_success');
  await assert.rejects(hold(randomUUID(), ['1A']), /unavailable/);
  assert.equal((await fulfill(expired, 'pi_late')).state, 'refund_required');
  await assert.rejects(db.query("select * from bookify_cancel_trip($1,'Other vendor')", [trip]), /not found/);
  for (let retry = 0; retry < 2; retry += 1) {
    const cancellation = await db.query("select * from bookify_cancel_trip($1,'Vendor')", [trip]);
    assert.ok(cancellation.rows.some((order) => order.id === winner && order.state === 'refund_required'));
  }
  await assert.rejects(hold(randomUUID(), ['1A']), /Trip is unavailable/);
  const seed = await readFile(new URL('../../../supabase/seed.sql', import.meta.url), 'utf8');
  await db.exec(seed);
  await db.exec(seed);
  assert.equal((await db.query("select count(*)::int as count from bookify_trips where vendor like 'Demo%'")).rows[0].count, 21);
  await db.exec('set role anon');
  await assert.rejects(db.query('select * from bookify_orders'), /permission denied/);
  await assert.rejects(hold(randomUUID(), ['1A']), /permission denied/);
});
