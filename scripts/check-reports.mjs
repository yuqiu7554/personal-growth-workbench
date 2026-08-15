import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../workbench-prototype/report-core.js');

const week = core.weekPeriod('2026-08-05');
assert.deepEqual(week, { key: '2026-08-03', start: '2026-08-03', endExclusive: '2026-08-10', end: '2026-08-09' });
assert.equal(core.inPeriod({ date: '2026-08-03' }, week), true);
assert.equal(core.inPeriod({ completedAt: '2026-08-09T23:59:00+08:00' }, week), true);
assert.equal(core.inPeriod({ date: '2026-08-10' }, week), false);

const month = core.monthPeriod('2026-08-12');
assert.equal(core.inPeriod({ date: '2026-07-31' }, month), false);
assert.equal(core.inPeriod({ date: '2026-08-31' }, month), true);
assert.equal(core.inPeriod({ date: '2026-09-01' }, month), false);

const live = { metrics: { total: 2 }, proposedTasks: [] };
const frozen = core.snapshot(live); live.metrics.total = 99;
assert.equal(frozen.metrics.total, 2);

const weeklySnapshot = { id: 'week-2026-08-03', periodStart: '2026-08-03', proposedTasks: [{ id: 'paper', title: '论文里程碑' }, { id: 'english', title: '英语训练' }] };
const createdTasks = core.nextWeekTasks(weeklySnapshot, ['paper', 'english'], [], '2026-08-09T23:59:00+08:00');
assert.deepEqual(createdTasks.map(item => item.date), ['2026-08-10', '2026-08-11']);
assert.ok(createdTasks.every(item => item.targetWeek === '2026-08-10'));
assert.equal(core.nextWeekTasks(weeklySnapshot, ['paper'], createdTasks, '2026-08-09').length, 0);

const monthlySnapshot = { id: 'month-2026-08', periodStart: '2026-08-01', proposedOutcomes: [{ id: 'paper', title: '论文成果' }, { id: 'exam', title: '模考成果' }] };
const createdGoals = core.nextMonthGoals(monthlySnapshot, ['exam'], [], '2026-08-31T23:59:00+08:00');
assert.deepEqual(createdGoals.map(item => item.title), ['模考成果']);
assert.equal(createdGoals[0].targetMonth, '2026-09');
assert.equal(core.nextMonthGoals(monthlySnapshot, ['exam'], createdGoals, '2026-08-31').length, 0);

console.log('PASS: report periods, immutable snapshots, dated next-week tasks, selected next-month goals, and duplicate protection.');
