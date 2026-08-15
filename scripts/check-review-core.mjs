import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const core = require('../workbench-prototype/review-core.js');
const reviews = core.normalize({}, { completed: '完成成果', obstacle: '时间不足', tomorrow: '提交初稿', free: '记录', ratings: { energy: 4 } }, '2026-08-15');
const record = core.ensureRecord(reviews, '2026-08-15'); assert.equal(record.draft.answers.completed, '完成成果'); assert.equal(core.validate(record, '2026-08-15').ok, false);
Object.assign(record.draft.ratings, { energy: 4, stress: 2, satisfaction: 4, focus: 3, physical: 4 }); assert.equal(core.validate(record, '2026-08-15').ok, true);
const result = core.submit(record, new Date('2026-08-15T22:30:00+08:00'), '2026-08-15'); assert.equal(result.ok, true); assert.equal(result.version.number, 1);
record.draft.answers.completed = '修改后'; assert.equal(result.version.answers.completed, '完成成果'); assert.equal(core.restore(record, result.version.id), true); assert.equal(record.draft.answers.completed, '完成成果');
assert.equal(core.isMonthEnd('2026-08-31'), true); assert.equal(core.actionId('v1', 'task', 0), 'review:v1:task:0'); console.log('review-core: ok');
