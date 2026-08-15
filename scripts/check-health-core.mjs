import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const core = require('../workbench-prototype/health-core.js');

const periods = [
  { id: 1, start: '2026-01-01', end: '2026-01-05' },
  { id: 2, start: '2026-01-29', end: '2026-02-02' },
  { id: 3, start: '2026-02-26', end: '2026-03-02' },
  { id: 4, start: '2026-03-26', end: '2026-03-30' }
];
const prediction = core.prediction(periods);
assert.equal(prediction.ready, true);
assert.equal(prediction.cycleLength, 28);
assert.equal(prediction.duration, 5);
assert.equal(prediction.likelyStart, '2026-04-23');
assert.equal(core.prediction(periods.slice(0, 2)).ready, false);
assert.equal(core.overlaps(periods, '2026-01-04', '2026-01-07'), true);
assert.equal(core.overlaps(periods, '2026-04-01', '2026-04-05'), false);
assert.equal(core.monthMatrix(2026, 7).length, 42);
assert.equal(core.monthMatrix(2026, 7)[0].key, '2026-07-27');
assert.deepEqual(core.statistics(periods), { count: 4, averageCycle: 28, averageDuration: 5, variation: 0 });
console.log('PASS: cycle median prediction, confidence range, overlap detection, Monday month grid and statistics');
