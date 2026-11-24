import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLayout } from '../src/lib/layout.js';

test('2+2 layout has an aisle and unique labels', () => {
  const { layout, seatCount } = buildLayout({ pattern: '2+2', rows: 10 });
  assert.equal(seatCount, 40);
  assert.deepEqual(layout.decks[0].rows[0], ['A1', 'A2', '', 'A3', 'A4']);
  const labels = layout.decks.flatMap((d) => d.rows.flat()).filter(Boolean);
  assert.equal(new Set(labels).size, labels.length);
});

test('double deck continues row letters on the upper deck and respects the seat cap', () => {
  const { layout } = buildLayout({ pattern: '2+1', rows: 6, decks: 2, kind: 'BERTH' });
  assert.equal(layout.decks[1].rows[0][0], 'G1');
  assert.throws(() => buildLayout({ pattern: '3+2', rows: 20 }), /at most 80/);
  assert.throws(() => buildLayout({ pattern: '2+2', rows: 14, decks: 2 }), /13 rows/);
});
