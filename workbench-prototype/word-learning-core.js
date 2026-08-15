(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkbenchWordLearningCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function splitMeanings(value) {
    if (Array.isArray(value)) return [...new Set(value.flatMap(item => splitMeanings(item)))];
    return [...new Set(String(value || '').split(/[；;]/).map(item => item.trim()).filter(Boolean))];
  }

  function parseEntry(value) {
    const entry = String(value || '').trim();
    const slash = entry.indexOf('/');
    const display = (slash >= 0 ? entry.slice(0, slash) : entry).trim();
    return { display, normalized: display.toLowerCase(), definitions: slash >= 0 ? splitMeanings(entry.slice(slash + 1)) : [] };
  }

  function normalizeMeaning(value) {
    return String(value || '').toLowerCase().replace(/[\s，,。.!！?？、；;：:“”"'（）()\[\]]/g, '').replace(/的$/g, '');
  }

  function evaluate(definitions, answer) {
    const references = splitMeanings(definitions);
    const raw = String(answer || '').trim();
    if (!raw) return { result: 'unknown', answer: '', matched: [], extra: [] };
    const chunks = raw.split(/[；;、，,]/).map(item => item.trim()).filter(Boolean);
    const matches = (a, b) => {
      const left = normalizeMeaning(a), right = normalizeMeaning(b);
      return left && right && (left === right || left.includes(right) || right.includes(left));
    };
    const matched = references.filter(reference => chunks.some(chunk => matches(chunk, reference)));
    const extra = chunks.filter(chunk => !references.some(reference => matches(chunk, reference)));
    if (!matched.length) return { result: 'wrong', answer: raw, matched, extra };
    return { result: matched.length === references.length && !extra.length ? 'correct' : 'partial', answer: raw, matched, extra };
  }

  return { splitMeanings, parseEntry, normalizeMeaning, evaluate };
}));
