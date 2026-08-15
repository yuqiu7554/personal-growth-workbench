(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkbenchHealthCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DAY = 86400000;
  const parse = value => {
    const [year, month, day] = String(value || '').split('-').map(Number);
    return year && month && day ? new Date(Date.UTC(year, month - 1, day)) : null;
  };
  const key = date => date.toISOString().slice(0, 10);
  const addDays = (value, amount) => { const date = typeof value === 'string' ? parse(value) : new Date(value); date.setUTCDate(date.getUTCDate() + amount); return key(date); };
  const daysBetween = (left, right) => Math.round((parse(right) - parse(left)) / DAY);
  const median = values => {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  const range = (start, end) => {
    if (!parse(start) || !parse(end) || end < start) return [];
    const result = [];
    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) result.push(cursor);
    return result;
  };
  const overlaps = (periods, start, end, ignoredId) => periods.some(period => period.id !== ignoredId && period.status !== 'trash' && period.start <= end && (period.end || period.start) >= start);

  function prediction(periods) {
    const complete = periods.filter(period => period.status !== 'trash' && period.end && !period.excludeFromPrediction).sort((a, b) => a.start.localeCompare(b.start)).slice(-7);
    if (complete.length < 3) return { ready: false, completeCount: complete.length };
    const latest = complete.slice(-6);
    const cycleLengths = latest.slice(1).map((period, index) => daysBetween(latest[index].start, period.start)).filter(value => value >= 15 && value <= 60);
    const durations = latest.map(period => daysBetween(period.start, period.end) + 1).filter(value => value >= 1 && value <= 15);
    if (cycleLengths.length < 2 || !durations.length) return { ready: false, completeCount: complete.length };
    const cycleLength = Math.round(median(cycleLengths));
    const duration = Math.round(median(durations));
    const deviations = cycleLengths.map(value => Math.abs(value - cycleLength));
    const spread = Math.max(1, Math.ceil(median(deviations) || 0));
    const last = latest[latest.length - 1];
    const likelyStart = addDays(last.start, cycleLength);
    const earliestStart = addDays(likelyStart, -spread);
    const latestStart = addDays(likelyStart, spread);
    return {
      ready: true, completeCount: complete.length, cycleLength, duration, spread,
      likelyStart, earliestStart, latestStart,
      likelyEnd: addDays(likelyStart, duration - 1),
      earliestEnd: addDays(earliestStart, duration - 1),
      latestEnd: addDays(latestStart, duration - 1),
      confidence: spread <= 2 ? '较高' : spread <= 5 ? '一般' : '较低'
    };
  }

  function monthMatrix(year, month) {
    const first = new Date(Date.UTC(year, month, 1));
    const mondayOffset = (first.getUTCDay() + 6) % 7;
    const start = new Date(first); start.setUTCDate(first.getUTCDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setUTCDate(start.getUTCDate() + index); return { key: key(date), day: date.getUTCDate(), currentMonth: date.getUTCMonth() === month }; });
  }

  function statistics(periods) {
    const valid = periods.filter(period => period.status !== 'trash' && period.end && !period.excludeFromPrediction).sort((a, b) => a.start.localeCompare(b.start)).slice(-6);
    const cycleLengths = valid.slice(1).map((period, index) => daysBetween(valid[index].start, period.start));
    const durations = valid.map(period => daysBetween(period.start, period.end) + 1);
    const averageCycle = median(cycleLengths);
    const averageDuration = median(durations);
    const variation = cycleLengths.length ? Math.max(...cycleLengths) - Math.min(...cycleLengths) : null;
    return { count: valid.length, averageCycle: averageCycle == null ? null : Math.round(averageCycle), averageDuration: averageDuration == null ? null : Math.round(averageDuration), variation };
  }

  return { addDays, daysBetween, median, range, overlaps, prediction, monthMatrix, statistics };
});
