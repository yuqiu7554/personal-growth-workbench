import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../workbench-prototype/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../workbench-prototype/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../workbench-prototype/styles.css', import.meta.url), 'utf8');

for (const id of ['cycleCalendarGrid', 'addCyclePeriodButton', 'cyclePeriodDialog', 'cyclePeriodForm', 'cyclePeriodStart', 'cyclePeriodEnd', 'cyclePredictionStatus', 'cycleStatistics', 'cycleHistoryList']) {
  assert.match(html, new RegExp(`id="${id}"`), `missing health UI control ${id}`);
}
assert.match(app, /WorkbenchHealthCore\.prediction\(state\.cyclePeriods\)/);
assert.match(app, /WorkbenchHealthCore\.overlaps\(state\.cyclePeriods/);
assert.match(app, /state\.cyclePeriodTrash\.unshift/);
assert.match(app, /30 \* 86400000/);
assert.match(css, /\.cycle-day\.recorded \{ background: #8b1e2d;/);
assert.match(css, /\.cycle-day\.predicted \{ background: #f4c7cf;/);
assert.match(html, /预测仅用于个人记录与计划提示/);

console.log('PASS: health cycle calendar, local records, prediction boundary, edit/delete recovery and privacy copy are wired');
