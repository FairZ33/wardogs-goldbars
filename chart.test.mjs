import test from 'node:test';
import assert from 'node:assert/strict';
import { niceAxis } from './chart.mjs';

test('million-dollar range uses half-million steps and covers all prices', () => {
  const axis = niceAxis(166000, 2113114);
  assert.equal(axis.step, 500000);
  assert.deepEqual(axis.ticks, [0, 500000, 1000000, 1500000, 2000000, 2500000]);
});
test('smaller and flat ranges retain a useful, evenly spaced scale', () => {
  for (const [low,high] of [[229361,447691], [281880,281880], [1,1]]) {
    const axis = niceAxis(low,high);
    assert.ok(axis.min <= low && axis.max >= high && axis.max > axis.min);
    assert.ok(axis.ticks.length <= 8);
    axis.ticks.slice(1).forEach((tick,i)=>assert.ok(Math.abs(tick-axis.ticks[i]-axis.step) < 1e-8));
  }
});
