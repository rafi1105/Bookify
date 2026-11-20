import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignScenarios, getTripSnapshot } from '../tripSimulation.js';

test('random assignment preserves one bus per scenario', () => {
  assert.deepEqual(assignScenarios(() => 0), ['traffic', 'accident', 'normal']);
  assert.deepEqual(assignScenarios(() => 0.99), ['normal', 'traffic', 'accident']);
});

test('only assigned trips slow or stop and their ETA reflects the delay', () => {
  const normal = getTripSnapshot('normal', 3);
  const traffic = getTripSnapshot('traffic', 3);
  const accident = getTripSnapshot('accident', 3);
  assert.equal(normal.status, 'On time');
  assert.equal(traffic.status, 'Simulated traffic delay');
  assert.equal(accident.status, 'Simulated accident');
  assert.equal(accident.speed, 0);
  assert.ok(normal.speed > traffic.speed);
  assert.ok(normal.eta < traffic.eta && traffic.eta < accident.eta);
  assert.equal(accident.progress, getTripSnapshot('accident', 2).progress);
});

test('trips resume after the disruption and stay at the destination', () => {
  assert.equal(getTripSnapshot('accident', 7).status, 'Running late');
  for (const scenario of ['normal', 'traffic', 'accident']) {
    assert.deepEqual(getTripSnapshot(scenario, 100), {
      progress: 100, speed: 0, eta: 0, status: 'Arrived',
    });
  }
});
