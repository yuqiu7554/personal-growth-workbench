(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkbenchCet6TrainingCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const audioExtensions = new Set(['mp3', 'm4a', 'wav', 'aac']);

  function materialMetadata(file) {
    const name = String(file.name || file.path || '');
    const yearMatch = name.match(/(20\d{2})/);
    const monthMatch = name.match(/(?:20\d{2})\s*(?:年|[.\-_])\s*(0?[1-9]|1[0-2])(?:月|[.\-_]?)/);
    const setMatch = name.match(/第\s*([一二三四五六七八九十\d]+)\s*套/);
    const chinese = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    const setText = setMatch?.[1] || '';
    const extension = name.split('.').pop().toLowerCase();
    const type = audioExtensions.has(extension) || /听力音频|音频/.test(name) ? 'audio' : /答案|解析/.test(name) ? 'answer' : 'paper';
    return { ...file, name: file.name || String(file.path || '').split('/').pop(), year: yearMatch ? Number(yearMatch[1]) : null, month: monthMatch ? Number(monthMatch[1]) : null, set: /^\d+$/.test(setText) ? Number(setText) : (chinese[setText] || null), type };
  }

  function proposeMaterialGroups(files) {
    const groups = new Map();
    files.map(materialMetadata).filter(file => file.year && file.month && file.set).forEach(file => {
      const key = `${file.year}-${String(file.month).padStart(2, '0')}-${file.set}`;
      if (!groups.has(key)) groups.set(key, { id: key, year: file.year, month: file.month, set: file.set, paper: [], answer: [], audio: [] });
      groups.get(key)[file.type].push(file);
    });
    return [...groups.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  function createSession(config, now = Date.now()) {
    return { id: `cet6-session-${now}`, ...config, modules: [...(config.modules || [])], moduleSeconds: { ...(config.moduleSeconds || {}) }, moduleIndex: 0, extensions: {}, overallExtension: 0, completedSeconds: 0, status: 'ready', createdAt: now, runningSince: null, elapsedSeconds: 0 };
  }

  function start(session, now = Date.now()) {
    if (session.status === 'running') return { ...session };
    return { ...session, status: 'running', startedAt: session.startedAt || now, runningSince: now };
  }

  function elapsedSeconds(session, now = Date.now()) {
    return session.elapsedSeconds + (session.status === 'running' && session.runningSince !== null ? Math.max(0, Math.floor((now - session.runningSince) / 1000)) : 0);
  }

  function pause(session, now = Date.now()) {
    if (session.status !== 'running') return { ...session };
    return { ...session, status: 'paused', elapsedSeconds: elapsedSeconds(session, now), runningSince: null, pauseCount: (session.pauseCount || 0) + 1 };
  }

  function resume(session, now = Date.now()) { return start(session, now); }

  function remainingSeconds(session, now = Date.now()) { return Math.max(0, currentLimit(session) - elapsedSeconds(session, now)); }

  function totalElapsedSeconds(session, now = Date.now()) { return Number(session.completedSeconds || 0) + elapsedSeconds(session, now); }

  function currentModule(session) { return session.modules[session.moduleIndex] || null; }

  function currentLimit(session) {
    if (session.timerMode !== 'modules') return Number(session.totalSeconds || 0) + Number(session.overallExtension || 0);
    const module = currentModule(session);
    return Number(session.moduleSeconds[module] || 0) + Number(session.extensions[module] || 0);
  }

  function nextModule(session, now = Date.now()) {
    return { ...session, completedSeconds: Number(session.completedSeconds || 0) + elapsedSeconds(session, now), moduleIndex: Math.min(session.moduleIndex + 1, session.modules.length), status: 'ready', runningSince: null, elapsedSeconds: 0 };
  }

  function extendCurrent(session, seconds) {
    if (session.timerMode !== 'modules') return { ...session, overallExtension: Number(session.overallExtension || 0) + Number(seconds || 0) };
    const module = currentModule(session);
    return { ...session, extensions: { ...session.extensions, [module]: Number(session.extensions[module] || 0) + Number(seconds || 0) } };
  }

  function displayTime(session, now = Date.now()) {
    const seconds = session.timerMode === 'clock' ? elapsedSeconds(session, now) : remainingSeconds(session, now);
    const totalMinutes = session.timerMode === 'clock' ? 15 * 60 + Math.floor(seconds / 60) : Math.ceil(seconds / 60);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  }

  return { materialMetadata, proposeMaterialGroups, createSession, start, pause, resume, elapsedSeconds, totalElapsedSeconds, remainingSeconds, currentModule, currentLimit, nextModule, extendCurrent, displayTime };
}));
