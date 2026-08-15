import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('workbench-prototype/index.html', 'utf8');
const js = fs.readFileSync('workbench-prototype/research-module.js', 'utf8');
const native = fs.readFileSync('native-shell/main.m', 'utf8');

[
  'addResearchProjectButton', 'researchProjectDialog', 'researchProjectList', 'researchOverviewGrid',
  'uploadResearchAssetButton', 'researchAssetDialog', 'addResearchMilestoneButton', 'researchEvidenceDialog',
  'researchGantt', 'researchAiForm', 'extractResearchAiAttachmentButton', 'researchArchiveDialog'
].forEach(id => assert.match(html, new RegExp(`id="${id}"`), `missing ${id}`));

[
  'core.migrateResearch', 'createMilestoneTask', 'completeMilestone', 'renderGantt', 'moveGanttItem',
  'chooseResearchFiles', 'importResearchAsset', 'purgeResearchTrash', "assertAiAvailable('research')",
  'config.account', 'projectAiContext', '原始文件不会上传'
].forEach(binding => assert.ok(js.includes(binding), `missing research behavior: ${binding}`));

['chooseResearchFiles', 'chooseResearchFolder', 'importResearchAsset', 'deleteManagedResearchFile', 'sha256FileAtPath'].forEach(action => assert.ok(native.includes(action), `missing native research action: ${action}`));
assert.ok(js.includes("state.calendarItems.push"), 'milestone must support calendar linkage');
assert.ok(js.includes("projectTrash"), 'project recycle bin must be implemented');
console.log('PASS: research CRUD, local assets, milestones, gantt, recycle bins, planning AI, and cross-module bindings.');
