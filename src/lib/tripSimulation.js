export function assignScenarios(random = Math.random) {
  const scenarios = ['normal', 'traffic', 'accident'];
  for (let index = scenarios.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [scenarios[index], scenarios[other]] = [scenarios[other], scenarios[index]];
  }
  return scenarios;
}

export function getTripSnapshot(scenario, tick) {
  const disruptionTicks = Math.min(4, Math.max(0, tick - 2));
  const lostProgress = disruptionTicks * { normal: 0, traffic: 3, accident: 5 }[scenario];
  const progress = Math.min(100, 25 + tick * 5 - lostProgress);
  if (progress === 100) return { progress, speed: 0, eta: 0, status: 'Arrived' };

  const recovering = tick >= 7 && lostProgress > 0;
  const active = tick >= 3 && tick < 7 ? scenario : 'normal';
  const speed = { normal: 80, traffic: 32, accident: 0 }[active];
  const status = {
    normal: recovering ? 'Running late' : 'On time',
    traffic: 'Simulated traffic delay',
    accident: 'Simulated accident',
  }[active];
  const expectedLoss = active === 'normal' ? 0 : (7 - tick) * (5 - speed / 16);
  return { progress, speed, eta: Math.ceil((100 - progress + expectedLoss) * 2), status };
}
