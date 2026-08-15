import fs from 'node:fs';

const html = fs.readFileSync(new URL('../workbench-prototype/index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../workbench-prototype/app.js', import.meta.url), 'utf8');
const failures = [];

for (const marker of ['id="addGoalButton"', 'id="goalDialog"', 'id="goalForm"', 'id="goalTitleInput"', 'id="goalTypeInput"', 'id="goalMilestoneInput"']) {
  if (!html.includes(marker)) failures.push(`missing goal control: ${marker}`);
}

for (const marker of ["el('#addGoalButton').addEventListener('click'", "el('#goalForm').addEventListener('submit'", 'state.goals.push(', 'saveState();', 'renderGoals();']) {
  if (!js.includes(marker)) failures.push(`missing goal behavior: ${marker}`);
}

if (failures.length) {
  console.error(`FAIL: Add-goal flow is incomplete\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('PASS: add-goal button opens a persisted goal creation flow.');
