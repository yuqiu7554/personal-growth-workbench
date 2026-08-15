(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkbenchReviewCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const QUESTIONS = ['completed', 'learned', 'achievement', 'difficulty', 'obstacle', 'improvement', 'tomorrow', 'free'];
  const REQUIRED = ['completed', 'obstacle', 'tomorrow'];
  const RATINGS = ['energy', 'stress', 'satisfaction', 'focus', 'physical'];
  const DEFAULT_HEADLINE = '回看今天，为明天留下清晰的一步';
  const pad = value => String(value).padStart(2, '0');
  const localDateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const emptyAnswers = () => Object.fromEntries(QUESTIONS.map(key => [key, '']));
  const emptyDraft = () => ({ answers: emptyAnswers(), ratings: {}, updatedAt: null });
  function normalizeRecord(record, date) {
    const safe = record && typeof record === 'object' ? record : {};
    return { date, headline: String(safe.headline || DEFAULT_HEADLINE), draft: { ...emptyDraft(), ...(safe.draft || {}), answers: { ...emptyAnswers(), ...(safe.draft?.answers || {}) }, ratings: { ...(safe.draft?.ratings || {}) } }, versions: Array.isArray(safe.versions) ? safe.versions : [], currentVersionId: safe.currentVersionId || null, aiByVersion: safe.aiByVersion && typeof safe.aiByVersion === 'object' ? safe.aiByVersion : {}, actionWrites: safe.actionWrites && typeof safe.actionWrites === 'object' ? safe.actionWrites : {} };
  }
  function normalize(reviews, legacyReview, today = localDateKey()) {
    const safe = reviews && typeof reviews === 'object' ? reviews : {}; const byDate = {};
    Object.entries(safe.byDate || {}).forEach(([date, record]) => { byDate[date] = normalizeRecord(record, date); });
    if (!byDate[today] && legacyReview && Object.values(legacyReview).some(Boolean)) {
      const record = normalizeRecord(null, today);
      ['completed', 'obstacle', 'tomorrow', 'free'].forEach(key => { record.draft.answers[key] = legacyReview[key] || ''; });
      record.draft.ratings = { ...(legacyReview.ratings || {}) }; record.draft.updatedAt = legacyReview.submittedAt || null; byDate[today] = record;
    }
    return { byDate, trash: Array.isArray(safe.trash) ? safe.trash : [], skippedDates: safe.skippedDates && typeof safe.skippedDates === 'object' ? safe.skippedDates : {} };
  }
  function ensureRecord(reviews, date) { if (!reviews.byDate[date]) reviews.byDate[date] = normalizeRecord(null, date); return reviews.byDate[date]; }
  function validate(record, today = localDateKey()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date) || record.date > today) return { ok: false, reason: 'future_date' };
    const missing = REQUIRED.filter(key => !String(record.draft.answers[key] || '').trim());
    const missingRatings = RATINGS.filter(key => ![1, 2, 3, 4, 5].includes(Number(record.draft.ratings[key])));
    return { ok: !missing.length && !missingRatings.length, missing, missingRatings, reason: missing.length || missingRatings.length ? 'incomplete' : null };
  }
  function submit(record, now = new Date(), today = localDateKey(now)) {
    const validation = validate(record, today); if (!validation.ok) return { ok: false, validation };
    const version = { id: uid('review'), number: record.versions.length + 1, submittedAt: now.toISOString(), late: record.date < today, headline: record.headline, answers: { ...record.draft.answers }, ratings: { ...record.draft.ratings } };
    record.versions.push(version); record.currentVersionId = version.id; return { ok: true, version };
  }
  function restore(record, versionId) { const version = record.versions.find(item => item.id === versionId); if (!version) return false; record.headline = version.headline || DEFAULT_HEADLINE; record.draft = { answers: { ...emptyAnswers(), ...version.answers }, ratings: { ...version.ratings }, updatedAt: new Date().toISOString() }; return true; }
  function isMonthEnd(dateKey) { const date = new Date(`${dateKey}T12:00:00`); const next = new Date(date); next.setDate(next.getDate() + 1); return next.getMonth() !== date.getMonth(); }
  const actionId = (versionId, kind, index) => `review:${versionId}:${kind}:${index}`;
  return { QUESTIONS, REQUIRED, RATINGS, DEFAULT_HEADLINE, localDateKey, normalize, normalizeRecord, ensureRecord, validate, submit, restore, isMonthEnd, actionId };
});
