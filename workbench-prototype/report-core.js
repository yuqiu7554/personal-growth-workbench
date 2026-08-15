(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkbenchReportCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const pad = value => String(value).padStart(2, '0');
  const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const clone = value => JSON.parse(JSON.stringify(value));

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value);
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function weekPeriod(reference) {
    const date = parseDate(reference) || new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return { key: dateKey(start), start: dateKey(start), endExclusive: dateKey(end), end: dateKey(new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1)) };
  }

  function monthPeriod(reference) {
    const date = parseDate(reference) || new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const last = new Date(end); last.setDate(last.getDate() - 1);
    return { key: `${start.getFullYear()}-${pad(start.getMonth() + 1)}`, start: dateKey(start), endExclusive: dateKey(end), end: dateKey(last) };
  }

  function itemDate(item) {
    return parseDate(item.completedAt || item.date || item.createdAt);
  }

  function inPeriod(item, period) {
    const date = itemDate(item);
    if (!date) return false;
    const key = dateKey(date);
    return key >= period.start && key < period.endExclusive;
  }

  function summarize(items, period) {
    const dated = items.filter(item => inPeriod(item, period));
    const done = dated.filter(item => item.done).length;
    return { total: dated.length, done, rate: dated.length ? Math.round(done / dated.length * 100) : 0, undated: items.filter(item => !itemDate(item)).length };
  }

  function snapshot(value) { return clone(value); }

  function nextWeekTasks(snapshotValue, selectedIds, existingTasks, now) {
    const current = weekPeriod(snapshotValue.periodStart);
    const nextStart = parseDate(current.endExclusive);
    const next = weekPeriod(nextStart);
    const selected = new Set(selectedIds);
    const existingSources = new Set(existingTasks.map(task => task.reportSourceId).filter(Boolean));
    return snapshotValue.proposedTasks.filter(item => selected.has(item.id) && !existingSources.has(`${snapshotValue.id}:${item.id}`)).map((item, index) => {
      const date = new Date(nextStart); date.setDate(date.getDate() + Math.min(index, 6));
      return { ...clone(item), id: `weekly-task-${snapshotValue.id}-${item.id}`, date: dateKey(date), targetWeek: next.key, createdAt: parseDate(now || new Date()).toISOString(), done: false, reportSourceId: `${snapshotValue.id}:${item.id}` };
    });
  }

  function nextMonthGoals(snapshotValue, selectedIds, existingGoals, now) {
    const selected = new Set(selectedIds);
    const existingSources = new Set(existingGoals.map(goal => goal.reportSourceId).filter(Boolean));
    const month = monthPeriod(snapshotValue.periodStart);
    const nextMonth = monthPeriod(month.endExclusive);
    return snapshotValue.proposedOutcomes.filter(item => selected.has(item.id) && !existingSources.has(`${snapshotValue.id}:${item.id}`)).map(item => ({ ...clone(item), id: `monthly-goal-${snapshotValue.id}-${item.id}`, type: '月目标', progress: 0, state: '待开始', next: item.next || '由周计划拆分下一步', targetMonth: nextMonth.key, createdAt: parseDate(now || new Date()).toISOString(), reportSourceId: `${snapshotValue.id}:${item.id}` }));
  }

  return { dateKey, weekPeriod, monthPeriod, inPeriod, summarize, snapshot, nextWeekTasks, nextMonthGoals };
}));
