import assert from 'node:assert/strict';
import core from '../workbench-prototype/research-core.js';

const migrated = core.migrateResearch({ active: 'paper', projects: {
  paper: { title: '小论文', stage: 2, progress: 42, milestone: '完成变量关系图' },
  thesis: { title: '毕业论文', stage: 0, progress: 18, milestone: '确定研究问题' }
} });
assert.equal(migrated.version, 2);
assert.equal(migrated.projects.paper.id, 'paper');
assert.equal(migrated.projects.paper.title, '小论文');
assert.equal(migrated.projects.paper.stages.length, 8);
assert.ok(core.projectProgress(migrated.projects.paper) >= 42, 'legacy progress must not decrease');
assert.deepEqual(core.validateStageWeights(migrated.projects.paper), { valid: true, total: 100 });

const project = core.createProject({ title: '测试项目', type: '课程论文', startDate: '2026-08-01', endDate: '2026-12-01' });
const milestone = { id: 'm1', title: '完成初稿', weight: 1, required: true, evidence: [], startDate: '2026-08-10', endDate: '2026-09-10' };
project.stages[0].milestones.push(milestone);
assert.throws(() => core.completeMilestone(project, 'm1', null), /evidence_required/);
core.completeMilestone(project, 'm1', { type: '文字说明', value: '初稿已完成' }, '2026-09-10T10:00:00.000Z');
assert.equal(project.stages[0].milestones[0].completedAt, '2026-09-10T10:00:00.000Z');
assert.equal(core.ganttRange([project]).scale, '周');
console.log('PASS: research migration, weighted progress, evidence gate, and gantt range.');
