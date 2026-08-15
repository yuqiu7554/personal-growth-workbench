import fs from 'node:fs';

const html = fs.readFileSync(new URL('../workbench-prototype/index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../workbench-prototype/app.js', import.meta.url), 'utf8');
const failures = [];

const requiredHtml = [
  'data-calendar-view="week"',
  'data-calendar-view="month"',
  'data-settings-tab="calendar"',
  'data-settings-panel="calendar"',
  'id="calendarItemDialog"',
  'id="calendarPeriodList"',
  'id="timetableEnabledSetting"',
  'id="editCalendarPeriodsButton"',
  'id="timetableSettingsSection"',
  'data-calendar-mode="work"',
  'data-calendar-mode="timetable"',
  'id="semesterNameSetting"',
  'id="semesterWeeksSetting"',
  'id="semesterStartSetting"',
  'id="coursePeriodList"'
];

for (const marker of requiredHtml) {
  if (!html.includes(marker)) failures.push(`missing HTML control: ${marker}`);
}

const requiredBindings = [
  "all('[data-calendar-view]').forEach",
  "el('#weekGrid').addEventListener('click'",
  "el('#calendarItemForm').addEventListener('submit'",
  "el('#addCalendarPeriodButton').addEventListener('click'",
  "el('#editCalendarPeriodsButton').addEventListener('click'",
  "el('#timetableEnabledSetting').addEventListener('change'",
  "all('[data-calendar-mode]').forEach",
  'updateTimetableVisibility()',
  'renderTimetableCalendar()'
];

for (const marker of requiredBindings) {
  if (!js.includes(marker)) failures.push(`missing JavaScript binding: ${marker}`);
}

if (failures.length) {
  console.error(`FAIL: Calendar UI is incomplete\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('PASS: calendar week/month switching, cell editing, and settings controls are present and bound.');
