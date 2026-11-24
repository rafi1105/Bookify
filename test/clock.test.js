import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('useNow always returns an object and every consumer destructures it safely', () => {
  assert.match(read('src/lib/useNow.js'), /return \{ now, speed \};/);
  for (const file of readdirSync(new URL('../src/components', import.meta.url)).filter((f) => f.endsWith('.jsx'))) {
    const src = read('src/components/' + file);
    for (const m of src.matchAll(/=\s*useNow\(\)([^;]*);/g)) {
      assert.match(m[1], /\|\|/, `${file} must fall back when useNow() returns nothing`);
    }
  }
});
