(function () {
  'use strict';

  const initialTasks = [
    { id: 1, title: '梳理小论文研究问题与模型变量', category: '科研/小论文', goal: '假期完成小论文初稿', priority: '高', estimate: 120, key: true, done: false },
    { id: 2, title: '完成 CET-6 阅读真题一套', category: 'CET-6', goal: '2026年12月达到500分', priority: '高', estimate: 60, key: true, done: false },
    { id: 3, title: '复习今日到期词汇 28 个', category: 'CET-6', goal: '提升英语基础能力', priority: '中', estimate: 25, key: true, done: false },
    { id: 4, title: '整理组会需要汇报的三项进展', category: '科研/小论文', goal: '完成阶段里程碑', priority: '中', estimate: 35, key: false, done: false },
    { id: 5, title: '阅读无人机冷链接驳论文并做笔记', category: '毕业论文', goal: '确定毕业论文选题', priority: '中', estimate: 45, key: false, done: true }
  ];

  const initialGoals = [
    { title: 'CET-6 达到 500 分', type: '考试目标', progress: 31, next: '完成两次有效完整模考', state: '轻度迟缓' },
    { title: '完成小论文初稿', type: '科研目标', progress: 42, next: '完成理论框架与研究假设', state: '正常' },
    { title: '确定毕业论文选题', type: '阶段目标', progress: 18, next: '比较两个候选方向的证据', state: '证据不足' }
  ];

  const researchStages = ['选题与研究问题', '文献检索与综述', '理论框架与假设', '数据与研究方法', '分析与结果', '初稿撰写', '导师修改', '投稿或答辩准备'];
  const defaultRecommendationProfile = { topics: ['物流与供应链', '低空经济与无人机物流', '冷链物流', '高原山区与农产品物流', 'AI与运筹优化'], exclusions: ['MDPI', 'Sustainability', 'Energies', 'Applied Sciences'], aiEnabled: true };
  const defaultNewsProfile = { themes: ['物流工程', '管理工程', 'AI发展', '低空经济'], tiers: ['P0', 'P1', 'P2'], regions: ['国内', '国际'] };
  const newsSources = [
    { id: 'gov-cn', source: '中国政府网', url: 'https://www.gov.cn/pushinfo/v150203/pushinfo.json', format: 'gov-json', tier: 'P0', authority: 5, region: '国内', defaultTheme: '管理工程' },
    { id: 'world-bank', source: 'World Bank', url: 'https://search.worldbank.org/api/v2/news?format=json&rows=30&qterm=supply%20chain%20logistics%20transport%20management', format: 'worldbank-json', tier: 'P0', authority: 5, region: '国际', defaultTheme: '物流工程' },
    { id: 'easa', source: 'EASA', url: 'https://www.easa.europa.eu/en/newsroom-and-events/news/feed.xml', format: 'feed', tier: 'P0', authority: 5, region: '国际', defaultTheme: '低空经济' },
    { id: 'nist', source: 'NIST', url: 'https://www.nist.gov/news-events/news/rss.xml', format: 'feed', tier: 'P0', authority: 5, region: '国际', defaultTheme: 'AI发展' },
    { id: 'eu-digital', source: '欧盟数字战略', url: 'https://digital-strategy.ec.europa.eu/en/rss.xml', format: 'feed', tier: 'P0', authority: 5, region: '国际', defaultTheme: 'AI发展' },
    { id: 'mit-tech-review', source: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', format: 'feed', tier: 'P1', authority: 4, region: '国际', defaultTheme: 'AI发展' },
    { id: 'loadstar', source: 'The Loadstar', url: 'https://theloadstar.com/feed/', format: 'feed', tier: 'P2', authority: 2, region: '国际', defaultTheme: '物流工程' },
    { id: 'techcrunch-ai', source: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', format: 'feed', tier: 'P2', authority: 2, region: '国际', defaultTheme: 'AI发展' }
  ];
  const newsThemeKeywords = {
    物流工程: ['物流', '供应链', '运输', '货运', '仓储', '港口', '快递', '冷链', 'logistics', 'supply chain', 'transport', 'freight', 'shipping', 'warehouse', 'port'],
    管理工程: ['管理', '运营', '采购', '库存', '项目管理', '生产率', '数字化转型', 'management', 'operations', 'procurement', 'inventory', 'productivity', 'governance'],
    AI发展: ['人工智能', '大模型', '算法', '算力', '机器人', '数据治理', 'ai ', 'artificial intelligence', 'machine learning', 'model', 'robot'],
    低空经济: ['低空', '无人机', '通用航空', '空域', '适航', 'easa', 'drone', 'uas', 'u-space', 'advanced air mobility', 'aviation']
  };

  const referenceMeanings = {
    resilience: ['韧性', '恢复力'],
    'cold chain': ['冷链'],
    'last-mile delivery': ['末端配送', '最后一公里配送'],
    logistics: ['物流'],
    perishables: ['易腐品', '生鲜品'],
    consolidation: ['整合', '集拼']
  };

  const cet6Modules = ['写作', '听力', '选词填空', '长篇阅读', '仔细阅读', '翻译'];
  const cet6DefaultModuleMinutes = { 写作: 30, 听力: 30, 选词填空: 10, 长篇阅读: 15, 仔细阅读: 20, 翻译: 30 };
  const moduleDefinitions = [
    ['tasks', '今日待办', '任务、计时与完成记录'], ['calendar', '日历', '日程、时间段与课程表'],
    ['goals', '目标与规划', '目标、里程碑与智能计划'], ['reports', '周月总结', '周报、月报与下阶段计划'],
    ['english', '英语学习', '单词、词库与学习总览'], ['ielts', 'IELTS 训练', '笔试、口语与训练记录'],
    ['cet6', 'CET-6 训练', '真题资料、计时与训练记录'], ['research', '论文项目', '项目资料、里程碑与甘特图'],
    ['news', '今日热点', '可信资讯与每日更新'], ['papers', '每周论文', '论文推荐与历史回顾'],
    ['library', '资料库', '收藏、摘录与本地文件'], ['health', '运动健康', '饮水、运动与健康记录'],
    ['review', '今日复盘', '每日复盘与行动草案'], ['ai', '成长规划 AI', '跨模块对话与建议']
  ].map(([id, label, description]) => ({ id, label, description }));
  const recommendedModules = new Set(['tasks', 'calendar', 'goals', 'reports', 'english', 'research', 'news', 'papers', 'library', 'health', 'review', 'ai']);

  let databaseReady = false;
  let databaseSaveTimer = null;
  let pendingCet6Import = [];
  let cet6SetupOrder = [...cet6Modules];
  let cet6TimerHandle = null;
  let editingCet6RecordId = null;
  let cet6TimeoutShown = false;
  let activeLibraryFolder = 'all';
  let pendingLibraryFiles = [];
  const state = loadState();
  state.reviews = WorkbenchReviewCore.normalize(state.reviews, state.review);
  state.settings.menstrualTrackingEnabled = state.settings.menstrualTrackingEnabled !== false;
  state.settings.notificationSettings = state.settings.notificationSettings || { globalSound: 'Glass', categories: { review: { enabled: true, sound: 'global' }, tasks: { enabled: true, sound: 'global' }, words: { enabled: true, sound: 'global' }, exams: { enabled: true, sound: 'global' }, hydration: { enabled: true, sound: 'global' }, health: { enabled: true, sound: 'global' }, recommendations: { enabled: true, sound: 'global' } }, reviewByWeekday: Object.fromEntries([0,1,2,3,4,5,6].map(day => [day, '22:30'])) };
  applyAiSettingsModel();
  let activeReviewDate = WorkbenchReviewCore.localDateKey();
  let news = Array.isArray(state.newsRecommendations) ? state.newsRecommendations.filter(item => !item.sample) : [];
  state.newsRecommendations = news;
  let paperRecommendations = Array.isArray(state.paperRecommendations) ? state.paperRecommendations : [];
  if (!Array.isArray(state.paperHistory)) state.paperHistory = [];
  state.settings.recommendationProfile = { ...defaultRecommendationProfile, ...(state.settings.recommendationProfile || {}) };
  state.settings.newsProfile = { ...defaultNewsProfile, ...(state.settings.newsProfile || {}) };
  let activeNewsFilter = 'all';
  if (!Array.isArray(state.recycleBin)) state.recycleBin = [];
  if (!Array.isArray(state.cyclePeriods)) state.cyclePeriods = [];
  if (!Array.isArray(state.cyclePeriodTrash)) state.cyclePeriodTrash = [];
  if (!state.healthCalendarMonth) state.healthCalendarMonth = isoMonthKey(new Date());
  state.libraryFolders = WorkbenchLibraryCore.normalizeFolders(state.libraryFolders);
  if (!Array.isArray(state.aiChats)) state.aiChats = [];
  if (!Array.isArray(state.goals)) state.goals = initialGoals.map(goal => ({ ...goal }));
  if (!Array.isArray(state.calendarItems)) state.calendarItems = [];
  if (!Array.isArray(state.settings.calendarPeriods)) state.settings.calendarPeriods = [];
  if (typeof state.settings.timetableEnabled !== 'boolean') state.settings.timetableEnabled = false;
  if (!['week', 'month'].includes(state.settings.calendarView)) state.settings.calendarView = 'week';
  if (!['work', 'timetable'].includes(state.settings.calendarMode)) state.settings.calendarMode = 'work';
  if (!state.settings.timetable || typeof state.settings.timetable !== 'object') state.settings.timetable = {};
  if (!Array.isArray(state.settings.timetable.coursePeriods)) state.settings.timetable.coursePeriods = [];
  if (!Array.isArray(state.settings.timetable.courses)) state.settings.timetable.courses = [];
  if (!Array.isArray(state.cet6Materials)) state.cet6Materials = [];
  if (!Array.isArray(state.cet6Trash)) state.cet6Trash = [];
  if (!Array.isArray(state.cet6RecordTrash)) state.cet6RecordTrash = [];
  if (!state.cet6Training || typeof state.cet6Training !== 'object') state.cet6Training = { active: null, pendingRecord: null };
  if (typeof state.settings.cet6Sound !== 'boolean') state.settings.cet6Sound = true;
  if (!['pause', 'continue'].includes(state.settings.cet6Sleep)) state.settings.cet6Sleep = 'pause';
  if (!state.aiMode) state.aiMode = 'configured';
  ensureModulePreferences();
  if (state.settings.deepSeekOfficialSetupVersion !== 2) {
    Object.assign(state.settings, { aiProvider: 'DeepSeek官方API', aiProfile: 'deepseek-official', aiBaseUrl: 'https://api.deepseek.com', aiModel: 'deepseek-v4-flash', deepSeekOfficialSetupVersion: 2 });
    state.aiMode = 'deepseek-v4-flash';
    saveState();
  }
  const el = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem('growth-workbench-prototype'));
      return {
        tasks: saved?.tasks || initialTasks,
        water: saved?.water ?? 800,
        lastWater: saved?.lastWater ?? null,
        words: saved?.words || [],
        wordLearning: saved?.wordLearning || null,
        wordTrash: saved?.wordTrash || [],
        wordMeaningHistory: saved?.wordMeaningHistory || [],
        exercises: saved?.exercises || [{ id: 1, type: '步行', duration: 45, date: new Date().toISOString() }],
        cyclePeriods: saved?.cyclePeriods || [],
        cyclePeriodTrash: saved?.cyclePeriodTrash || [],
        healthCalendarMonth: saved?.healthCalendarMonth || '',
        library: saved?.library || [],
        libraryFolders: saved?.libraryFolders || [],
        recycleBin: saved?.recycleBin || [],
        newsFeedback: saved?.newsFeedback || {},
        newsRecommendations: saved?.newsRecommendations || [],
        paperRecommendations: saved?.paperRecommendations || [],
        recommendationSync: saved?.recommendationSync || {},
        paperStatus: saved?.paperStatus || {},
        paperHistory: saved?.paperHistory || [],
        ieltsRecords: saved?.ieltsRecords || [],
        cet6Records: saved?.cet6Records || [],
        cet6Materials: saved?.cet6Materials || [],
        cet6Trash: saved?.cet6Trash || [],
        cet6RecordTrash: saved?.cet6RecordTrash || [],
        cet6Training: saved?.cet6Training || { active: null, pendingRecord: null },
        aiChats: saved?.aiChats || [],
        reports: saved?.reports || { planLevel: '标准', weeklyGeneratedAt: null, weeklyConfirmedAt: null, monthlyGeneratedAt: null, monthlyConfirmedAt: null },
        settings: { appearance: 'system', aiProvider: 'OpenAI兼容API', aiProfile: 'codex', aiBaseUrl: 'https://www.mhcoding.xyz/', aiModel: 'claude-opus-4-6', aiBudget: 0, githubRepository: 'https://github.com/yuqiu7554/personal-growth-workbench', ...(saved?.settings || {}) },
        backupMeta: saved?.backupMeta || null,
        research: saved?.research || { active: 'paper', projects: { paper: { title: '小论文', stage: 2, progress: 42, milestone: '完成变量关系图与第一版研究假设' }, thesis: { title: '毕业论文', stage: 0, progress: 18, milestone: '比较两个候选方向并确定研究问题' } } },
        review: saved?.review || { completed: '', obstacle: '', tomorrow: '', free: '', ratings: {}, submittedAt: null },
        theme: saved?.theme || 'light', compact: saved?.compact || false, sidebar: saved?.sidebar || false
      };
    } catch (_) {
      return { tasks: initialTasks, water: 800, lastWater: null, words: [], wordLearning: null, wordTrash: [], wordMeaningHistory: [], exercises: [], library: [], libraryFolders: [], recycleBin: [], newsFeedback: {}, newsRecommendations: [], paperRecommendations: [], recommendationSync: {}, paperStatus: {}, paperHistory: [], ieltsRecords: [], cet6Records: [], reports: { planLevel: '标准', weeklyGeneratedAt: null, weeklyConfirmedAt: null, monthlyGeneratedAt: null, monthlyConfirmedAt: null }, settings: { appearance: 'system', aiProvider: 'OpenAI兼容API', aiProfile: 'codex', aiBaseUrl: 'https://www.mhcoding.xyz/', aiModel: 'claude-opus-4-6', aiBudget: 0, githubRepository: 'https://github.com/yuqiu7554/personal-growth-workbench' }, backupMeta: null, research: { active: 'paper', projects: { paper: { title: '小论文', stage: 2, progress: 42, milestone: '完成变量关系图与第一版研究假设' }, thesis: { title: '毕业论文', stage: 0, progress: 18, milestone: '比较两个候选方向并确定研究问题' } } }, review: { completed: '', obstacle: '', tomorrow: '', free: '', ratings: {}, submittedAt: null }, theme: 'light', compact: false, sidebar: false };
    }
  }

  function saveState() {
    if (!databaseReady) {
      localStorage.setItem('growth-workbench-prototype', JSON.stringify(state));
      return;
    }
    clearTimeout(databaseSaveTimer);
    databaseSaveTimer = setTimeout(async () => {
      try {
        await callNative('saveWorkbenchState', { state });
        localStorage.removeItem('growth-workbench-prototype');
        setDatabaseStatus('SQLite 已保存', 'success');
      } catch (error) {
        setDatabaseStatus(`SQLite 保存失败：${error.detail || error.message}`, 'error');
      }
    }, 180);
  }

  function applyAiSettingsModel() {
    const model = WorkbenchSettingsCore.normalize(state.settings);
    state.settings.aiProfiles = model.profiles; state.settings.aiAssistants = model.assistants; state.settings.aiGlobalBudget = model.globalBudget; state.settings.aiGlobalSpent = model.globalSpent; state.settings.aiBudgetMonth = model.monthKey;
  }

  function aiConfig(assistantId = 'growth') { return WorkbenchSettingsCore.resolve(state.settings, assistantId); }

  function assertAiAvailable(assistantId = 'growth') {
    const status = WorkbenchSettingsCore.budgetStatus(state.settings, assistantId);
    if (status.allowed) return aiConfig(assistantId);
    const messages = { assistant_disabled: '该模块 AI 助手已在设置中关闭', global_budget_reached: 'AI 全局月度预算已达到上限', assistant_budget_reached: '该模块 AI 助手月度预算已达到上限' };
    const error = new Error(status.reason); error.detail = messages[status.reason] || '当前 AI 助手不可用'; throw error;
  }

  function assistantIdForContext(context = {}) {
    const feature = String(context.feature || '');
    if (feature.includes('CET-6')) return 'cet6'; if (feature.includes('IELTS')) return 'ielts'; if (feature.includes('论文项目')) return 'research'; if (feature.includes('今日复盘')) return 'review'; if (feature.includes('今日热点')) return 'news'; if (feature.includes('每周论文')) return 'papers';
    return 'growth';
  }

  function recordAiUsage(payload, result) {
    if (!result?.usage) return; const id = assistantIdForContext(payload.context); const assistant = state.settings.aiAssistants?.[id]; const profile = state.settings.aiProfiles?.[assistant?.profileId]; if (!assistant || !profile) return;
    const input = Math.max(0, Number(result.usage.inputTokens || 0)); const output = Math.max(0, Number(result.usage.outputTokens || 0)); assistant.inputTokens = Number(assistant.inputTokens || 0) + input; assistant.outputTokens = Number(assistant.outputTokens || 0) + output;
    if (profile.inputPricePerMillion > 0 || profile.outputPricePerMillion > 0) { const cost = input / 1e6 * Number(profile.inputPricePerMillion || 0) + output / 1e6 * Number(profile.outputPricePerMillion || 0); assistant.spent = Number(assistant.spent || 0) + cost; state.settings.aiGlobalSpent = Number(state.settings.aiGlobalSpent || 0) + cost; }
    saveState();
  }

  function ensureModulePreferences() {
    const saved = state.settings.modulePreferences;
    state.settings.modulePreferences = Object.fromEntries(moduleDefinitions.map(module => [module.id, saved?.[module.id] !== false]));
    if (typeof state.settings.modulePreferencesConfigured !== 'boolean') state.settings.modulePreferencesConfigured = false;
  }

  function isModuleEnabled(view) {
    if (['overview', 'settings'].includes(view)) return true;
    if (view === 'paper-history') view = 'papers';
    return state.settings.modulePreferences?.[view] !== false;
  }

  function applyModulePreferences() {
    all('#mainNav [data-view]').forEach(button => { if (button.dataset.view !== 'overview') button.hidden = !isModuleEnabled(button.dataset.view); });
    all('#mainNav .nav-group').forEach(group => { group.hidden = !all('[data-view]', group).some(button => !button.hidden); });
    const summaryMap = { english: '.english-card', research: '.research-card', health: '.health-card', review: '.review-card', news: '.news-panel' };
    Object.entries(summaryMap).forEach(([module, selector]) => { const node = el(selector, el('#overviewView')); if (node) node.hidden = !isModuleEnabled(module); });
  }

  function moduleRows(target, setup = false) {
    setSafeMarkup(target, moduleDefinitions.map(module => `<label class="module-setting-row"><span><strong>${escapeHtml(module.label)}</strong><small>${escapeHtml(module.description)}</small></span><input type="checkbox" role="switch" data-module-toggle="${escapeHtml(module.id)}" ${state.settings.modulePreferences[module.id] ? 'checked' : ''}></label>`).join(''));
    if (!setup) all('[data-module-toggle]', target).forEach(input => input.addEventListener('change', changeModulePreference));
  }

  function renderModuleSettings() {
    const settingsList = el('#moduleSettingsList');
    if (settingsList) moduleRows(settingsList, false);
  }

  function changeModulePreference(event) {
    const input = event.currentTarget;
    const module = moduleDefinitions.find(item => item.id === input.dataset.moduleToggle);
    if (!input.checked && !window.confirm(`关闭“${module.label}”后将隐藏入口，并暂停该模块的提醒和自动任务；本地数据不会删除。是否继续？`)) { input.checked = true; return; }
    state.settings.modulePreferences[module.id] = input.checked;
    state.settings.modulePreferencesConfigured = true;
    saveState(); applyModulePreferences();
    el('#moduleSettingsStatus').textContent = input.checked ? `已开启“${module.label}”` : `已关闭“${module.label}”，数据仍保留在本地`;
  }

  function openModuleSetupIfNeeded() {
    if (state.settings.modulePreferencesConfigured || !el('#moduleSetupDialog')) return;
    moduleRows(el('#moduleSetupList'), true);
    el('#moduleSetupDialog').showModal();
  }

  function applyModulePreset(preset) {
    all('[data-module-toggle]', el('#moduleSetupList')).forEach(input => { input.checked = preset === 'all' || (preset === 'recommended' && recommendedModules.has(input.dataset.moduleToggle)); });
  }

  function saveInitialModuleSetup(event) {
    event.preventDefault();
    all('[data-module-toggle]', el('#moduleSetupList')).forEach(input => { state.settings.modulePreferences[input.dataset.moduleToggle] = input.checked; });
    state.settings.modulePreferencesConfigured = true;
    saveState(); applyModulePreferences(); renderModuleSettings(); el('#moduleSetupDialog').close('saved'); showToast('工作台模块已保存，可随时在设置中修改');
  }

  function setDates() {
    const today = new Date();
    const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(today);
    const full = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(today);
    el('#topbarDate').textContent = full;
    el('#todayLabel').textContent = `${today.getMonth() + 1}月${today.getDate()}日 · ${weekday}`;
    const exam = new Date('2026-12-12T09:00:00+08:00');
    el('#cetCountdown').textContent = Math.max(0, Math.ceil((exam - today) / 86400000));
  }

  function renderTasks() {
    const keyTasks = state.tasks.filter(task => task.key).slice(0, 3);
    setSafeMarkup(el('#keyTaskList'), keyTasks.map(taskRow).join(''));
    setSafeMarkup(el('#allTaskList'), state.tasks.map(taskRow).join(''));
    all('.task-check').forEach(input => input.addEventListener('change', toggleTask));
    const keyDone = keyTasks.filter(task => task.done).length;
    const allDone = state.tasks.filter(task => task.done).length;
    el('#keyTaskProgress').textContent = `${keyDone} / ${keyTasks.length} 已完成`;
    el('#keyTaskBar').style.width = `${keyTasks.length ? keyDone / keyTasks.length * 100 : 0}%`;
    el('#tasksDoneMetric').textContent = `${allDone} / ${state.tasks.length}`;
    el('#tasksKeyMetric').textContent = `${keyDone} / ${keyTasks.length}`;
    el('#taskNavCount').textContent = state.tasks.filter(task => !task.done).length;
  }

  function taskRow(task) {
    return `<label class="task-row ${task.done ? 'done' : ''}">
      <input class="task-check" type="checkbox" data-task-id="${task.id}" ${task.done ? 'checked' : ''} aria-label="完成 ${escapeHtml(task.title)}">
      <span class="task-copy"><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.category)} · ${task.estimate} 分钟 · ${escapeHtml(task.goal)}</span></span>
      <span class="priority ${task.priority === '高' ? 'high' : ''}">${escapeHtml(task.priority)}</span>
    </label>`;
  }

  function toggleTask(event) {
    const id = event.target.dataset.taskId;
    const task = state.tasks.find(item => String(item.id) === id);
    if (!task) return;
    task.done = event.target.checked;
    task.completedAt = task.done ? new Date().toISOString() : null;
    saveState();
    renderTasks();
    renderReview();
    showToast(task.done ? '任务已完成，可在待办页撤销' : '任务已恢复为待开始');
  }

  function renderGoals() {
    setSafeMarkup(el('#goalSummary'), state.goals.slice(0, 3).map(goal => `<article class="goal-mini"><strong>${escapeHtml(goal.title)}</strong><span>${escapeHtml(goal.next)}</span><b>${Math.max(0, Math.min(100, Number(goal.progress) || 0))}%</b></article>`).join(''));
    setSafeMarkup(el('#goalPageGrid'), state.goals.map(goal => { const progress = Math.max(0, Math.min(100, Number(goal.progress) || 0)); return `<article class="goal-card"><header><span class="status-tag">${escapeHtml(goal.type)}</span><span class="status-tag ${['轻度迟缓', '严重迟缓', '停滞'].includes(goal.state) ? 'warning' : ''}">${escapeHtml(goal.state)}</span></header><h2>${escapeHtml(goal.title)}</h2><p>下一里程碑：${escapeHtml(goal.next)}</p>${goal.deadline ? `<small>截止日期：${escapeHtml(goal.deadline)}</small>` : ''}<div class="progress-track"><span style="width:${progress}%"></span></div><footer><span>当前进度</span><b>${progress}%</b></footer></article>`; }).join(''));
  }

  function openGoalDialog() {
    el('#goalForm').reset();
    el('#goalProgressInput').value = '0';
    el('#goalStateInput').value = '正常';
    el('#goalFormError').textContent = '';
    el('#goalDialog').showModal();
    setTimeout(() => el('#goalTitleInput').focus(), 0);
  }

  function saveGoal() {
    const title = el('#goalTitleInput').value.trim();
    const next = el('#goalMilestoneInput').value.trim();
    if (!title || !next) { el('#goalFormError').textContent = '目标名称和下一里程碑为必填项。'; return; }
    state.goals.push({ id: `goal-${Date.now()}`, title, type: el('#goalTypeInput').value, deadline: el('#goalDeadlineInput').value, next, progress: Math.max(0, Math.min(100, Number(el('#goalProgressInput').value) || 0)), state: el('#goalStateInput').value });
    saveState();
    renderGoals();
    el('#goalDialog').close('saved');
    showToast('目标已加入规划中心');
  }

  function renderNews() {
    setSafeMarkup(el('#newsList'), news.map((item, index) => `<article class="news-row"><span class="news-source">${escapeHtml(item.source)}</span><strong>${escapeHtml(item.title)}</strong><button type="button" data-news-index="${index}" aria-label="收藏资讯">☆</button></article>`).join(''));
    all('[data-news-index]').forEach(button => button.addEventListener('click', () => {
      button.textContent = button.textContent === '☆' ? '★' : '☆';
      showToast(button.textContent === '★' ? '已收藏到物流资讯' : '已取消收藏');
    }));
  }

  function renderNewsFeed() {
    const feed = el('#newsFeed');
    if (!feed) return;
    const visibleNews = activeNewsFilter === 'all' ? news : news.filter(item => item.category === activeNewsFilter);
    setSafeMarkup(feed, visibleNews.length ? visibleNews.map((item, index) => {
      const feedback = state.newsFeedback[item.id || index] || '';
      const sourceLabel = item.sample ? '合成示例' : `${item.tier || '来源'} · ${item.region || '未知地区'}`;
      const link = item.url ? `<button class="button" type="button" data-external-url="${escapeHtml(item.url)}">打开原文</button>` : '';
      const policy = item.isPolicy ? `<div class="policy-meta"><span>发布机关：${escapeHtml(item.policyAuthority || item.source)}</span><span>政策状态：${escapeHtml(item.policyStatus || '待核验')}</span><span>文号：${escapeHtml(item.documentNumber || '未检出')}</span><span>${item.isOriginalPolicy ? '发布机关原文' : '需回溯发布机关原文'}</span></div>` : '';
      const cross = item.crossSources?.length ? `<p class="cross-sources">交叉来源：${escapeHtml(item.crossSources.map(source => source.source).join('、'))}</p>` : '';
      return `<article class="content-card ${feedback === 'irrelevant' ? 'dimmed' : ''}"><div class="content-card-main"><div class="content-meta"><span class="status-tag ${item.sample ? 'warning' : ''}">${sourceLabel}</span><span>${escapeHtml(item.source)}</span><span>${escapeHtml(item.publishedAt || '示例')}</span></div><h2>${item.major ? '<span class="status-tag warning">重大</span> ' : ''}${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary || (item.sample ? '当前为合成示例，点击“立即更新”获取真实来源数据。' : '摘要尚未生成，请通过原文核对事实。'))}</p>${policy}${cross}<div class="tag-row"><span>${escapeHtml(item.category || '物流工程')}</span><span>${escapeHtml(item.region || '相关地区')}</span></div></div><div class="card-actions">${link}<button type="button" data-news-action="favorite" data-index="${escapeHtml(item.id || index)}">${feedback === 'favorite' ? '已收藏' : '收藏'}</button><button type="button" data-news-action="irrelevant" data-index="${escapeHtml(item.id || index)}">${feedback === 'irrelevant' ? '撤销不相关' : '不相关'}</button></div></article>`;
    }).join('') : '<div class="empty-state"><strong>当前筛选暂无30天内可信内容</strong><span>工作台不会用合成新闻补足数量，可调整来源设置后重新同步。</span></div>');
    all('[data-news-action]').forEach(button => button.addEventListener('click', handleNewsFeedback));
  }

  function handleNewsFeedback(event) {
    const index = event.currentTarget.dataset.index;
    const action = event.currentTarget.dataset.newsAction;
    state.newsFeedback[index] = state.newsFeedback[index] === action ? '' : action;
    saveState();
    renderNewsFeed();
    showToast(action === 'favorite' ? '资讯收藏状态已更新' : '相关性反馈已更新');
  }

  function recommendationDateTime(value) {
    if (!value) return '尚未成功更新';
    return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
  }

  function updateRecommendationStatus() {
    const newsSync = state.recommendationSync?.news || {};
    const paperSync = state.recommendationSync?.papers || {};
    el('#newsSyncStatus').textContent = newsSync.running ? '正在检索并核验来源…' : newsSync.error ? `上次更新失败：${newsSync.error} · 保留最近成功数据` : `最近成功：${recommendationDateTime(newsSync.lastSuccessAt)}${newsSync.aiStatus ? ` · ${newsSync.aiStatus}` : ''}${newsSync.failedSources?.length ? ` · ${newsSync.failedSources.length} 个来源暂不可用` : ''}`;
    el('#paperSyncStatus').textContent = paperSync.running ? '正在执行系统黑名单、严格白名单与 DOI 核验…' : paperSync.error ? `上次更新失败：${paperSync.error} · 保留最近成功数据` : `最近成功：${recommendationDateTime(paperSync.lastSuccessAt)}${paperSync.whitelistMatchedCount != null ? ` · 白名单候选 ${paperSync.whitelistMatchedCount}/${paperSync.candidateCount}` : ''}${paperSync.doiVerifiedCount != null ? ` · DOI已核验 ${paperSync.doiVerifiedCount}/${paperSync.count}` : ''}${paperSync.aiStatus ? ` · ${paperSync.aiStatus}` : ''}`;
  }

  function newsSourceURLs() {
    const profile = state.settings.newsProfile || defaultNewsProfile;
    return newsSources.filter(source => profile.tiers.includes(source.tier) && profile.regions.includes(source.region));
  }

  function parseNewsFeed(xml, source) {
    const documentValue = new DOMParser().parseFromString(String(xml || ''), 'application/xml');
    if (documentValue.querySelector('parsererror')) throw new Error(`${source.source}订阅格式无效`);
    return all('item, entry', documentValue).slice(0, 40).map(entry => {
      const text = selector => entry.querySelector(selector)?.textContent?.trim() || '';
      const linkElement = entry.querySelector('link');
      return { title: text('title'), url: linkElement?.getAttribute('href') || text('link'), publishedAt: text('pubDate') || text('published') || text('updated'), summary: text('description') || text('summary') || text('content') };
    });
  }

  function unpackNewsResponse(response, source) {
    if (source.format === 'feed') return parseNewsFeed(response.text, source);
    if (source.format === 'gov-json') return Array.isArray(response.data) ? response.data.map(item => ({ title: item.title, url: item.link, publishedAt: item.pubDate, summary: item.description || '', policyAuthority: item.author || '中国政府网' })) : [];
    const documents = response.data?.documents && typeof response.data.documents === 'object' ? Object.values(response.data.documents) : [];
    return documents.map(item => ({ title: item.title?.['cdata!'] || item.title || '', url: item.url, publishedAt: item.date || item.dispdate || '', summary: item.descr?.['cdata!'] || item.descr || '' }));
  }

  function plainNewsText(value) {
    const parsed = new DOMParser().parseFromString(String(value || ''), 'text/html');
    return (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function classifyNews(item, fallback) {
    const haystack = `${item.title} ${item.summary}`.toLowerCase();
    const scores = Object.entries(newsThemeKeywords).map(([theme, words]) => [theme, words.filter(word => haystack.includes(word.toLowerCase())).length]);
    scores.sort((a, b) => b[1] - a[1]);
    return scores[0][1] ? scores[0][0] : fallback;
  }

  function newsPublishedTime(value) {
    const timestamp = Date.parse(value || '');
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function newsEventKey(title) {
    return String(title || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '').replace(/(发布|出台|最新|解读|official|announces|new)/g, '').slice(0, 80);
  }

  function newsTitleSimilarity(left, right) {
    const a = newsEventKey(left), b = newsEventKey(right);
    if (!a || !b) return 0;
    if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length);
    const pairs = value => new Set([...value].slice(0, -1).map((char, index) => char + [...value][index + 1]));
    const aPairs = pairs(a), bPairs = pairs(b);
    const overlap = [...aPairs].filter(pair => bPairs.has(pair)).length;
    return overlap / Math.max(1, aPairs.size + bPairs.size - overlap);
  }

  function policyDetails(item) {
    const text = `${item.title} ${item.summary}`;
    const isPolicy = /(政策|法规|条例|办法|规定|标准|征求意见|实施|法案|监管|regulation|policy|rule|act|consultation)/i.test(text);
    const number = text.match(/[\u4e00-\u9fffA-Za-z]{0,10}[〔\[]?\d{4}[〕\]]?\s*\d+\s*号/)?.[0] || '';
    const status = /征求意见|consultation|draft/i.test(text) ? '征求意见' : /实施|生效|effective|in force/i.test(text) ? '已实施' : isPolicy ? '正式发布' : '';
    return { isPolicy, documentNumber: number, policyStatus: status };
  }

  function aggregateNews(items) {
    const groups = [];
    items.forEach(item => {
      const groupIndex = groups.findIndex(existing => newsTitleSimilarity(existing.title, item.title) >= 0.52);
      const existing = groups[groupIndex];
      if (!existing) groups.push(item);
      else if (item.authority > existing.authority) groups[groupIndex] = { ...item, crossSources: [...(existing.crossSources || []), { source: existing.source, url: existing.url }] };
      else existing.crossSources = [...(existing.crossSources || []), { source: item.source, url: item.url }];
    });
    return groups;
  }

  function openAlexPapersURL() {
    const query = (state.settings.recommendationProfile?.topics || defaultRecommendationProfile.topics).join(' ');
    const from = new Date(); from.setFullYear(from.getFullYear() - 5);
    return `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=from_publication_date:${from.toISOString().slice(0, 10)},type:article&sort=relevance_score:desc&per-page=30`;
  }

  function abstractFromInvertedIndex(index) {
    if (!index || typeof index !== 'object') return '';
    const words = [];
    Object.entries(index).forEach(([word, positions]) => (positions || []).forEach(position => { words[position] = word; }));
    return words.filter(Boolean).join(' ');
  }

  function normalizedPaperTitle(value) {
    return plainNewsText(value).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ').trim();
  }

  async function verifyPaperDois(items) {
    const checks = await Promise.allSettled(items.map(item => callNative('fetchRecommendationSource', { source: 'papers', url: `https://api.crossref.org/works/${encodeURIComponent(item.doi)}` })));
    return items.map((item, index) => {
      const message = checks[index].status === 'fulfilled' ? checks[index].value.data?.message : null;
      const crossrefTitle = Array.isArray(message?.title) ? message.title[0] : '';
      const verified = String(message?.DOI || '').toLowerCase() === String(item.doi).toLowerCase() && normalizedPaperTitle(crossrefTitle) === normalizedPaperTitle(item.title);
      return { ...item, doiVerified: verified, crossrefTitle: verified ? crossrefTitle : '' };
    });
  }

  function parseAiJson(content) {
    const text = String(content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const start = text.indexOf('['), end = text.lastIndexOf(']');
    if (start < 0 || end <= start) throw new Error('AI返回格式无法解析');
    const value = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(value)) throw new Error('AI返回格式无法解析');
    return value;
  }

  async function enrichRecommendationsWithAi(kind, items) {
    try {
      if (state.settings.recommendationProfile?.aiEnabled === false) return { items, aiStatus: '已在推荐设置中关闭DeepSeek加工' };
      const featureConfig = assertAiAvailable(kind === 'news' ? 'news' : 'papers');
      const keyStatus = await callNative('getAiKeyStatus', { account: featureConfig.account });
      if (!keyStatus.configured) return { items, aiStatus: '未配置密钥，保留来源数据' };
      const connection = await callNative('testAiConnection', { account: featureConfig.account, provider: featureConfig.provider, baseUrl: featureConfig.baseUrl, model: featureConfig.model });
      const availableModels = Array.isArray(connection.models) ? connection.models : [];
      const model = connection.modelVerified ? featureConfig.model : (availableModels.find(value => value === 'deepseek-chat') || availableModels[0]);
      if (!model) return { items, aiStatus: '服务可达但未返回可用模型，保留来源数据' };
      const sourcePayload = kind === 'news' ? items.map(item => ({ id: item.id, title: item.title, source: item.source, sourceTier: item.tier, publishedAt: item.publishedAt, category: item.category, policyStatus: item.policyStatus || '', documentNumber: item.documentNumber || '', sourceSummary: item.summary || '' })) : items.map(item => ({ id: item.id, title: item.title, journal: item.journal, year: item.year, doi: item.doi, topic: item.topic, abstractOriginal: String(item.abstractOriginal || '').slice(0, 1600) }));
      const instruction = kind === 'news'
        ? '你是研究资讯整理器。仅依据输入事实，为每项输出JSON数组，字段严格为id、summary、relation。summary用中文写2至3句；relation说明与物流工程、管理工程、AI发展或低空经济的关系。不得增加、修改或推断新闻、来源、链接、日期、文号、政策状态及其他事实。只输出JSON数组。'
        : '你是物流研究论文整理器。仅依据输入元数据和摘要原文，为每项输出JSON数组，字段严格为id、abstractZh、relation、priority。abstractZh忠实翻译摘要，缺少原文时为空；relation说明与无人机物流、冷链接驳、高原农产品物流或运筹优化的关系；priority只能是高或中。不得猜测DOI、期刊分区或研究结论。只输出JSON数组。';
      const result = await callNative('sendAiChat', { account: featureConfig.account, provider: featureConfig.provider, baseUrl: featureConfig.baseUrl, model, prompt: `${instruction}\n\n输入：${JSON.stringify(sourcePayload)}`, context: { feature: kind === 'news' ? '今日热点同步' : '每周论文同步', allowedFields: Object.keys(sourcePayload[0] || {}) }, attachments: [], history: [] });
      const enriched = new Map(parseAiJson(result.content).map(item => [String(item.id), item]));
      return { items: items.map(item => { const extra = enriched.get(String(item.id)) || {}; return kind === 'news' ? { ...item, summary: String(extra.summary || item.summary || ''), relation: String(extra.relation || '') } : { ...item, abstractZh: String(extra.abstractZh || ''), topic: String(extra.relation || item.topic), priority: ['高', '中'].includes(extra.priority) ? extra.priority : item.priority }; }), aiStatus: `DeepSeek加工完成 · ${model}` };
    } catch (error) {
      return { items, aiStatus: `DeepSeek加工失败：${error.detail || error.message}` };
    }
  }

  async function refreshNews(manual = false) {
    const button = el('#refreshNewsButton');
    if (state.recommendationSync?.news?.running) return;
    state.recommendationSync.news = { ...(state.recommendationSync.news || {}), running: true, error: '' }; updateRecommendationStatus();
    if (button) button.disabled = true;
    try {
      const sources = newsSourceURLs();
      const results = await Promise.allSettled(sources.map(source => callNative('fetchRecommendationSource', { source: 'news', url: source.url })));
      const failedSources = [];
      const cutoff = Date.now() - 31 * 24 * 60 * 60 * 1000;
      const rawItems = [];
      results.forEach((result, sourceIndex) => {
        const source = sources[sourceIndex];
        if (result.status === 'rejected') { failedSources.push(source.source); return; }
        try {
          unpackNewsResponse(result.value, source).forEach(item => {
            const publishedTime = newsPublishedTime(item.publishedAt);
            const summary = plainNewsText(item.summary).slice(0, 1200);
            const title = plainNewsText(item.title);
            if (!title || !item.url || !publishedTime || publishedTime < cutoff || publishedTime > Date.now() + 86400000) return;
            const category = classifyNews({ title, summary }, source.defaultTheme);
            if (!(state.settings.newsProfile?.themes || defaultNewsProfile.themes).includes(category)) return;
            const policy = policyDetails({ title, summary });
            rawItems.push({ ...item, ...policy, title, summary, category, source: source.source, sourceId: source.id, tier: source.tier, authority: source.authority, region: source.region, policyAuthority: policy.isPolicy ? (item.policyAuthority || source.source) : '', isOriginalPolicy: policy.isPolicy && source.tier === 'P0', major: policy.isPolicy && source.tier === 'P0' && /(实施|正式|生效|regulation|act|rule)/i.test(`${title} ${summary}`), publishedTime });
          });
        } catch (_) { failedSources.push(source.source); }
      });
      const aggregated = aggregateNews(rawItems).sort((a, b) => Number(b.major) - Number(a.major) || b.authority - a.authority || b.publishedTime - a.publishedTime);
      const items = [];
      (state.settings.newsProfile?.themes || defaultNewsProfile.themes).forEach(theme => {
        aggregated.filter(item => item.category === theme).slice(0, 5).forEach(item => items.push(item));
      });
      items.forEach((item, index) => { item.id = `news-${newsEventKey(item.title)}-${index}`; delete item.publishedTime; });
      if (!items.length) throw new Error('可信来源暂无匹配结果');
      const enriched = await enrichRecommendationsWithAi('news', items);
      news = enriched.items; state.newsRecommendations = enriched.items; state.recommendationSync.news = { lastSuccessAt: new Date().toISOString(), lastAttemptAt: new Date().toISOString(), count: items.length, source: sources.filter((_, index) => results[index].status === 'fulfilled').map(source => source.source).join('、'), failedSources, aiStatus: enriched.aiStatus, scheduledKey: scheduledRecommendationKey('news'), running: false, error: '' };
      saveState(); renderNews(); renderNewsFeed(); updateRecommendationStatus(); if (manual) showToast(`今日热点已更新 ${items.length} 条`);
    } catch (error) {
      state.recommendationSync.news = { ...(state.recommendationSync.news || {}), lastAttemptAt: new Date().toISOString(), running: false, error: error.detail || error.message }; saveState(); updateRecommendationStatus(); if (manual) showToast('热点更新失败，已保留最近成功数据');
    } finally { if (button) button.disabled = false; }
  }

  function qualifyPaperSource(source) {
    if (!window.WorkbenchJournalWhitelist) return { ok: false, reason: '严格白名单模块未加载' };
    return WorkbenchJournalWhitelist.qualify(source, state.settings.recommendationProfile?.exclusions || defaultRecommendationProfile.exclusions);
  }

  function sourceForSavedPaper(paper) {
    return { display_name: paper.journal || '', issn_l: paper.sourceIssnL || paper.matchedIssn || '', issn: paper.sourceIssns || [] };
  }

  function requalifySavedPaper(paper) {
    const result = qualifyPaperSource(sourceForSavedPaper(paper));
    return result.ok ? { ...paper, qualityStatus: result.status, partition: result.status, whitelistMatchedBy: result.matchedBy, matchedIssn: result.matchedIssn || result.entry.issn, whitelistEvidence: result.entry.evidence, whitelistTitle: result.entry.title } : null;
  }

  function applyCurrentPaperWhitelist() {
    paperRecommendations = paperRecommendations.map(requalifySavedPaper).filter(Boolean);
    state.paperRecommendations = paperRecommendations;
    state.paperHistory = (state.paperHistory || []).map(requalifySavedPaper).filter(Boolean);
  }

  async function refreshPapers(manual = false) {
    const button = el('#refreshPapersButton');
    if (state.recommendationSync?.papers?.running) return;
    state.recommendationSync.papers = { ...(state.recommendationSync.papers || {}), running: true, error: '' }; updateRecommendationStatus();
    if (button) button.disabled = true;
    try {
      const response = await callNative('fetchRecommendationSource', { source: 'papers', url: openAlexPapersURL() });
      const seen = new Set();
      const filterReasons = {};
      const candidates = (response.data?.results || []).filter(work => work?.title && work?.doi).map(work => ({ work, qualification: qualifyPaperSource(work.primary_location?.source) })).filter(({ qualification }) => {
        if (qualification.ok) return true;
        filterReasons[qualification.reason] = (filterReasons[qualification.reason] || 0) + 1;
        return false;
      }).filter(({ work }) => { const doi = String(work.doi).toLowerCase(); if (seen.has(doi)) return false; seen.add(doi); return true; });
      let items = candidates.slice(0, 8).map(({ work, qualification }, index) => { const source = work.primary_location.source; return { id: `paper-${String(work.id || index).split('/').pop()}`, title: work.title, journal: source.display_name, year: work.publication_year, topic: work.primary_topic?.display_name || '物流与供应链', priority: index < 3 ? '高' : '中', doi: String(work.doi).replace(/^https?:\/\/doi.org\//, ''), url: work.primary_location?.landing_page_url || work.doi, partition: qualification.status, qualityStatus: qualification.status, whitelistMatchedBy: qualification.matchedBy, matchedIssn: qualification.matchedIssn || qualification.entry.issn, whitelistTitle: qualification.entry.title, whitelistEvidence: qualification.entry.evidence, sourceIssnL: source.issn_l || '', sourceIssns: source.issn || [], abstractOriginal: abstractFromInvertedIndex(work.abstract_inverted_index), abstractZh: '', citedByCount: work.cited_by_count || 0, openAccess: Boolean(work.open_access?.is_oa) }; });
      if (!items.length) throw new Error('本次候选均未通过严格期刊白名单');
      items = await verifyPaperDois(items);
      const currentWeek = startOfWeek(new Date()).toISOString().slice(0, 10);
      const enriched = await enrichRecommendationsWithAi('papers', items);
      paperRecommendations = enriched.items; state.paperRecommendations = enriched.items; state.settings.paperRecommendationWeek = currentWeek; state.recommendationSync.papers = { lastSuccessAt: new Date().toISOString(), lastAttemptAt: new Date().toISOString(), count: items.length, candidateCount: response.data?.results?.length || 0, whitelistMatchedCount: candidates.length, filterReasons, whitelistVersion: WorkbenchJournalWhitelist.version, doiVerifiedCount: items.filter(item => item.doiVerified).length, source: 'OpenAlex + Crossref', aiStatus: enriched.aiStatus, running: false, error: '', qualityWarning: '严格白名单匹配', scheduledKey: scheduledRecommendationKey('papers') };
      saveState(); renderPapers(); renderPaperHistory(); updateRecommendationStatus(); if (manual) showToast(`论文候选已更新 ${items.length} 篇`);
    } catch (error) {
      state.recommendationSync.papers = { ...(state.recommendationSync.papers || {}), lastAttemptAt: new Date().toISOString(), running: false, error: error.detail || error.message }; saveState(); updateRecommendationStatus(); if (manual) showToast('论文更新失败，已保留最近成功数据');
    } finally { if (button) button.disabled = false; }
  }

  function scheduledRecommendationKey(kind, date = new Date()) {
    const shifted = new Date(date.getTime());
    if (shifted.getHours() < 8) shifted.setDate(shifted.getDate() - 1);
    if (kind === 'papers') { const day = shifted.getDay() || 7; shifted.setDate(shifted.getDate() - day + 1); }
    return shifted.toISOString().slice(0, 10);
  }

  function runRecommendationCatchUp() {
    const newsKey = scheduledRecommendationKey('news');
    const paperKey = scheduledRecommendationKey('papers');
    if (isModuleEnabled('news') && String(state.recommendationSync?.news?.scheduledKey || '') !== newsKey) refreshNews(false);
    if (isModuleEnabled('papers') && String(state.recommendationSync?.papers?.scheduledKey || '') !== paperKey) refreshPapers(false);
  }

  function synchronizePaperArchive() {
    applyCurrentPaperWhitelist();
    const currentWeek = startOfWeek(new Date()).toISOString().slice(0, 10);
    const previousWeek = state.settings.paperRecommendationWeek;
    if (previousWeek && previousWeek !== currentWeek) {
      const archived = paperRecommendations.map(paper => ({ ...paper, recommendedWeek: previousWeek }));
      state.paperHistory = [...archived, ...state.paperHistory].filter(paper => {
        const week = String(paper.recommendedWeek || '');
        return week >= new Date(startOfWeek(new Date()).getTime() - 28 * 86400000).toISOString().slice(0, 10);
      });
    }
    if (previousWeek !== currentWeek) {
      state.settings.paperRecommendationWeek = currentWeek;
      saveState();
    }
  }

  function renderPapers() {
    const feed = el('#paperFeed');
    if (!feed) return;
    setSafeMarkup(feed, paperRecommendations.map(paper => {
      const status = state.paperStatus[paper.id] || '未读';
      return paperCard(paper, status, false);
    }).join(''));
    all('[data-paper-status]').forEach(select => select.addEventListener('change', event => { state.paperStatus[event.target.dataset.paperStatus] = event.target.value; saveState(); renderPapers(); showToast('阅读状态已保存'); }));
    all('[data-paper-task]').forEach(button => button.addEventListener('click', () => addPaperTask(button.dataset.paperTask)));
    all('[data-paper-library]').forEach(button => button.addEventListener('click', () => openPaperLibrary(paperRecommendations.find(item => String(item.id) === button.dataset.paperLibrary))));
  }

  function paperCard(paper, status, historical) {
    const qualityStatus = paper.qualityStatus || '严格白名单匹配';
    const week = historical ? `<span>推荐周：${escapeHtml(paper.recommendedWeek || '未知')}</span>` : '';
    const originalAbstract = paper.abstractOriginal || (paper.sample ? '当前为合成示例，点击“立即更新”获取可核验论文。' : 'OpenAlex未提供摘要原文，工作台不会虚构。');
    const translatedAbstract = paper.abstractZh || (paper.abstractOriginal ? '中文翻译尚未生成；摘要原文仍可核对。' : '摘要原文缺失，暂不生成翻译。');
    const sourceLink = paper.url ? `<button class="button" type="button" data-external-url="${escapeHtml(paper.url)}">打开来源</button>` : '';
    return `<article class="content-card"><div class="content-card-main"><div class="content-meta"><span class="status-tag ${paper.priority === '高' ? '' : 'warning'}">${paper.priority}优先级</span><span>${paper.year}</span><span>${escapeHtml(paper.journal)}</span><span>${escapeHtml(qualityStatus)}</span><span>${paper.doiVerified ? 'DOI已核验' : 'DOI待核验'}</span>${week}</div><h2>${escapeHtml(paper.title)}</h2><p><b>白名单依据：</b>${escapeHtml(paper.whitelistMatchedBy || '标准化刊名')} · ${escapeHtml(paper.matchedIssn || 'ISSN未返回')} · ${escapeHtml(paper.whitelistEvidence || '严格筛选保留')}</p><p><b>引用数：</b>${Number(paper.citedByCount || 0)}</p><p><b>研究关联：</b>${escapeHtml(paper.topic)}。</p><div class="paper-abstract"><b>摘要原文</b><p>${escapeHtml(originalAbstract)}</p><b>中文翻译</b><p>${escapeHtml(translatedAbstract)}</p></div><div class="tag-row"><span>${escapeHtml(paper.doi)}</span><span>${status}</span></div></div><div class="card-actions">${sourceLink}<select data-paper-status="${paper.id}" aria-label="阅读状态"><option ${status === '未读' ? 'selected' : ''}>未读</option><option ${status === '略读' ? 'selected' : ''}>略读</option><option ${status === '精读中' ? 'selected' : ''}>精读中</option><option ${status === '已精读' ? 'selected' : ''}>已精读</option><option ${status === '暂不相关' ? 'selected' : ''}>暂不相关</option></select><button type="button" data-paper-library="${paper.id}" data-paper-history="${historical ? 'true' : 'false'}">加入资料库</button>${historical ? '' : `<button type="button" data-paper-task="${paper.id}">加入精读任务</button>`}</div></article>`;
  }

  function renderPaperHistory() {
    const feed = el('#paperHistoryFeed');
    if (!feed) return;
    const current = startOfWeek(new Date()).toISOString().slice(0, 10);
    const oldest = new Date(startOfWeek(new Date()).getTime() - 28 * 86400000).toISOString().slice(0, 10);
    const seen = new Set();
    const papers = state.paperHistory.map(requalifySavedPaper).filter(Boolean).filter(paper => paper.recommendedWeek && paper.recommendedWeek < current && paper.recommendedWeek >= oldest).filter(paper => {
      const doi = String(paper.doi || '').trim().toLowerCase();
      const key = doi && !doi.includes('未配置') ? `doi:${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}` : `title:${String(paper.title || '').trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    setSafeMarkup(feed, papers.length ? papers.map(paper => paperCard(paper, state.paperStatus[paper.id] || '未读', true)).join('') : '<div class="empty-state"><strong>过去四周暂无推荐记录</strong><span>正式推荐开始归档后，这里会按自然周显示往期论文；本周推荐不会重复出现。</span></div>');
    all('[data-paper-library]', feed).forEach(button => button.addEventListener('click', () => openPaperLibrary(papers.find(item => String(item.id) === button.dataset.paperLibrary))));
    all('[data-paper-status]', feed).forEach(select => select.addEventListener('change', event => { state.paperStatus[event.target.dataset.paperStatus] = event.target.value; saveState(); renderPaperHistory(); }));
  }

  let pendingPaperLibrary = null;
  let pendingPaperPdf = null;

  function openPaperLibrary(paper) {
    if (!paper) return;
    pendingPaperLibrary = paper; pendingPaperPdf = null;
    setSafeMarkup(el('#paperLibraryMetadata'), `<strong>${escapeHtml(paper.title)}</strong><span>${paper.year} · ${escapeHtml(paper.journal)}</span><span>严格白名单匹配 · ${escapeHtml(paper.matchedIssn || '标准化刊名匹配')} · ${escapeHtml(paper.doi)}</span>`);
    el('#paperPdfStatus').textContent = '未选择，可稍后补充';
    el('#paperReadingLevel').value = '精读';
    el('#paperLibraryDialog').showModal();
  }

  async function choosePaperPdf() {
    try { pendingPaperPdf = await callNative('choosePaperPdf'); el('#paperPdfStatus').textContent = pendingPaperPdf.fileName; }
    catch (error) { if (!['cancelled', 'operation_cancelled'].includes(error.message)) showToast('无法选择 PDF'); }
  }

  async function confirmPaperLibrary() {
    if (!pendingPaperLibrary) return;
    const button = el('#confirmPaperLibraryButton'); button.disabled = true;
    try {
      let imported = null;
      if (pendingPaperPdf?.path) imported = await callNative('importLibraryAsset', { path: pendingPaperPdf.path, copy: true });
      const paper = pendingPaperLibrary;
      state.library.unshift({ id: Date.now(), type: '论文', category: paper.topic || '每周论文', sourceModule: 'papers', folderId: 'system-papers', title: paper.title, link: paper.doi && !paper.doi.includes('未配置') ? `https://doi.org/${paper.doi}` : '', doi: paper.doi, journal: paper.journal, partition: '严格白名单匹配', matchedIssn: paper.matchedIssn || '', whitelistEvidence: paper.whitelistEvidence || '', year: paper.year, readingLevel: el('#paperReadingLevel').value, localPdfPath: imported?.path || '', localPdfName: imported?.name || '', fingerprint: imported?.fingerprint || '', managedLocalFile: Boolean(imported?.path), recommendedWeek: paper.recommendedWeek || startOfWeek(new Date()).toISOString().slice(0, 10), createdAt: new Date().toISOString() });
      saveState(); renderLibrary(); el('#paperLibraryDialog').close('saved'); showToast(imported ? '论文与 PDF 已加入本地资料库' : '论文元数据已加入本地资料库');
    } catch (error) { showToast(error.detail || 'PDF 导入失败，未保存资料'); }
    finally { button.disabled = false; pendingPaperLibrary = null; pendingPaperPdf = null; }
  }

  function addPaperTask(id) {
    const paper = paperRecommendations.find(item => String(item.id) === String(id));
    if (!paper || state.tasks.some(task => task.sourcePaper === id)) { showToast('该论文已有关联的精读任务'); return; }
    state.tasks.push({ id: Date.now(), title: `精读：${paper.title}`, category: '毕业论文', goal: '确定毕业论文选题', priority: paper.priority, estimate: 60, key: false, done: false, sourcePaper: id, date: isoToday(), createdAt: new Date().toISOString() });
    saveState(); renderTasks(); renderReview(); showToast('精读任务已加入今日待办');
  }

  function moduleLibraryItems() {
    const items = [];
    const addFiles = (files, sourceModule, category, parentId, title) => (files || []).forEach((file, index) => items.push({ id: `module-${sourceModule}-${parentId}-${index}-${file.path}`, title: file.fileName || file.name || title, type: WorkbenchLibraryCore.fileType(file.fileName || file.name || file.path), category, sourceModule, folderId: WorkbenchLibraryCore.folderForSource(sourceModule), localPdfPath: file.path, localPdfName: file.fileName || file.name, fingerprint: file.fingerprint || '', managedLocalFile: Boolean(file.managed), createdAt: file.createdAt || new Date().toISOString(), derived: true }));
    (state.cet6Materials || []).forEach(material => ['paper', 'answer', 'audio'].forEach(type => addFiles(material[type], 'cet6', type === 'paper' ? '试卷' : type === 'answer' ? '答案' : '听力音频', material.id, `${material.year}年CET-6`)));
    (state.ielts?.materials || []).forEach(material => ['paper', 'answer', 'audio', 'transcript'].forEach(type => addFiles(material[type], 'ielts', type === 'paper' ? '试卷' : type === 'answer' ? '答案' : type === 'audio' ? '听力音频' : '听力原文', material.id, material.title)));
    Object.values(state.research?.projects || {}).forEach(project => (project.assets || []).filter(asset => asset.path).forEach(asset => addFiles([{ ...asset, fileName: asset.name || asset.title }], 'research', asset.category || '项目资料', project.id, asset.title)));
    return items;
  }

  function allLibraryItems() {
    const manualPaths = new Set(state.library.map(item => item.localPdfPath).filter(Boolean));
    return [...state.library, ...moduleLibraryItems().filter(item => !manualPaths.has(item.localPdfPath))];
  }

  function folderOptions(selected, excludeId = '') {
    const folders = state.libraryFolders.filter(folder => folder.id !== excludeId && WorkbenchLibraryCore.canNest(state.libraryFolders, excludeId, folder.id));
    const depth = folder => { let value = 0, current = folder; while (current?.parentId) { value += 1; current = state.libraryFolders.find(item => item.id === current.parentId); } return value; };
    return folders.map(folder => `<option value="${escapeHtml(folder.id)}" ${folder.id === selected ? 'selected' : ''}>${'　'.repeat(depth(folder))}${escapeHtml(folder.name)}</option>`).join('');
  }

  function renderLibraryFolders(items) {
    const counts = folder => WorkbenchLibraryCore.folderContents(items, state.libraryFolders, folder.id).length;
    const branch = parentId => state.libraryFolders.filter(folder => folder.parentId === parentId).sort((a, b) => a.order - b.order).map(folder => `<div><div class="library-folder-row ${activeLibraryFolder === folder.id ? 'active' : ''}" data-library-folder="${folder.id}"><span>${escapeHtml(folder.name)}</span><b>${counts(folder)}</b>${folder.system ? '' : `<span class="library-folder-actions"><button type="button" data-library-folder-edit="${folder.id}" title="编辑文件夹">✎</button><button type="button" data-library-folder-delete="${folder.id}" title="删除文件夹">×</button></span>`}</div><div class="library-folder-children">${branch(folder.id)}</div></div>`).join('');
    setSafeMarkup(el('#libraryFolderTree'), branch(null));
    el('#libraryAllCount').textContent = items.length;
    el('[data-library-folder="all"]').classList.toggle('active', activeLibraryFolder === 'all');
    all('[data-library-folder]').forEach(row => row.addEventListener('click', event => { if (event.target.closest('.library-folder-actions')) return; activeLibraryFolder = row.dataset.libraryFolder; renderLibrary(); }));
    all('[data-library-folder-edit]').forEach(button => button.addEventListener('click', () => openLibraryFolderDialog(button.dataset.libraryFolderEdit)));
    all('[data-library-folder-delete]').forEach(button => button.addEventListener('click', () => deleteLibraryFolder(button.dataset.libraryFolderDelete)));
  }

  function renderLibrary() {
    const list = el('#libraryList'); if (!list) return;
    const allItems = allLibraryItems(); renderLibraryFolders(allItems);
    const query = (el('#libraryFilter')?.value || '').trim().toLowerCase();
    const folderIds = activeLibraryFolder === 'all' ? null : new Set([activeLibraryFolder, ...WorkbenchLibraryCore.descendants(state.libraryFolders, activeLibraryFolder)]);
    const items = allItems.filter(item => !folderIds || folderIds.has(item.folderId || 'system-other')).filter(item => `${item.title} ${item.type} ${item.category} ${item.sourceModule || ''} ${item.doi || ''} ${item.journal || ''}`.toLowerCase().includes(query));
    const active = state.libraryFolders.find(folder => folder.id === activeLibraryFolder);
    el('#libraryBreadcrumb').textContent = active ? active.name : '全部资料';
    setSafeMarkup(list, items.length ? items.map(item => `<article class="library-row"><div class="library-icon">${item.type === '论文' || item.type === 'PDF' ? 'P' : item.type === '听力音频' ? 'A' : 'R'}</div><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.sourceModule || '手动添加')} · ${escapeHtml(item.type || '资料')} · ${escapeHtml(item.category || '未分类')}</span><small>${item.localPdfName ? `本地文件：${escapeHtml(item.localPdfName)}` : escapeHtml(item.link || '仅保存元数据')}</small></div><div class="inline-actions">${item.localPdfPath ? `<button type="button" data-library-open="${escapeHtml(item.localPdfPath)}">打开</button>` : item.link ? `<button type="button" data-external-url="${escapeHtml(item.link)}">打开</button>` : ''}${item.derived ? `<button type="button" data-go-view="${escapeHtml(item.sourceModule)}">来源模块</button>` : `<select data-library-move="${escapeHtml(item.id)}" aria-label="移动到文件夹">${folderOptions(item.folderId || 'system-other')}</select><button type="button" data-library-delete="${escapeHtml(item.id)}" aria-label="移入回收站">删除</button>`}</div></article>`).join('') : '<div class="empty-state"><strong>当前文件夹为空</strong><span>上传本地文件、扫描文件夹，或从其他模块导入资料后会自动建立索引。</span></div>');
    el('#libraryNavCount').textContent = allItems.length;
    all('[data-library-open]').forEach(button => button.addEventListener('click', () => callNative('openLibraryFile', { path: button.dataset.libraryOpen }).catch(() => showToast('文件失效，请重新定位'))));
    all('[data-library-delete]').forEach(button => button.addEventListener('click', () => moveLibraryItemToRecycleBin(Number(button.dataset.libraryDelete))));
    all('[data-library-move]').forEach(select => select.addEventListener('change', () => { const item = state.library.find(entry => entry.id === Number(select.dataset.libraryMove)); if (item) { item.folderId = select.value; saveState(); renderLibrary(); showToast('已更新逻辑文件夹，磁盘文件未移动'); } }));
    all('[data-go-view]', list).forEach(button => button.addEventListener('click', () => switchView(button.dataset.goView)));
  }

  function moveLibraryItemToRecycleBin(id) {
    const index = state.library.findIndex(item => item.id === id);
    if (index < 0) return;
    const [item] = state.library.splice(index, 1);
    state.recycleBin.unshift({ ...item, deletedAt: new Date().toISOString() });
    saveState(); renderLibrary(); renderRecycleBin(); showToast('已移入本地回收站，30天后自动删除');
  }

  function recycleDaysRemaining(item) {
    const expires = new Date(item.deletedAt).getTime() + 30 * 86400000;
    return Math.max(0, Math.ceil((expires - Date.now()) / 86400000));
  }

  function renderRecycleBin() {
    const list = el('#recycleBinList');
    if (!list) return;
    el('#recycleBinStatus').textContent = state.recycleBin.length ? `${state.recycleBin.length} 项，本地保留30天` : '本地保留30天，到期自动删除';
    el('#emptyRecycleBinButton').disabled = !state.recycleBin.length;
    setSafeMarkup(list, state.recycleBin.length ? state.recycleBin.map(item => `<article class="recycle-row"><div><strong>${escapeHtml(item.title)}</strong><span>剩余 ${recycleDaysRemaining(item)} 天${item.localPdfName ? ` · 含本地 PDF ${escapeHtml(item.localPdfName)}` : ''}</span></div><div><button class="button" type="button" data-recycle-restore="${escapeHtml(item.id)}">恢复</button><button class="button" type="button" data-recycle-delete="${escapeHtml(item.id)}">永久删除</button></div></article>`).join('') : '<div class="empty-state"><strong>回收站为空</strong><span>从资料库删除的资源会在本机保留30天。</span></div>');
    all('[data-recycle-restore]', list).forEach(button => button.addEventListener('click', () => restoreRecycledItem(Number(button.dataset.recycleRestore))));
    all('[data-recycle-delete]', list).forEach(button => button.addEventListener('click', () => permanentlyDeleteRecycledItem(Number(button.dataset.recycleDelete), true)));
  }

  function restoreRecycledItem(id) {
    const index = state.recycleBin.findIndex(item => item.id === id);
    if (index < 0) return;
    const [item] = state.recycleBin.splice(index, 1); delete item.deletedAt;
    state.library.unshift(item); saveState(); renderLibrary(); renderRecycleBin(); showToast('资料已恢复');
  }

  async function permanentlyDeleteRecycledItem(id, notify = false) {
    const item = state.recycleBin.find(entry => entry.id === id);
    if (!item) return true;
    try {
      if (item.managedLocalFile && item.localPdfPath) await callNative('deleteManagedResearchFile', { path: item.localPdfPath });
      state.recycleBin = state.recycleBin.filter(entry => entry.id !== id);
      saveState(); renderRecycleBin();
      if (notify) showToast('资源已从本机永久删除');
      return true;
    } catch (error) {
      if (notify) showToast('本地文件删除失败，资源仍保留在回收站');
      return false;
    }
  }

  async function purgeExpiredRecycleBin() {
    const expired = state.recycleBin.filter(item => recycleDaysRemaining(item) === 0);
    for (const item of expired) await permanentlyDeleteRecycledItem(item.id, false);
  }

  async function purgeExpiredCet6Trash() {
    const cutoff = Date.now() - 30 * 86400000;
    const expiredMaterials = state.cet6Trash.filter(item => new Date(item.deletedAt).getTime() <= cutoff);
    for (const item of expiredMaterials) {
      let removable = true;
      for (const file of ['paper', 'answer', 'audio'].flatMap(type => item.material[type] || []).filter(file => file.managed)) {
        try { await callNative('deleteManagedCet6File', { path: file.path }); } catch (_) { removable = false; break; }
      }
      if (removable) state.cet6Trash = state.cet6Trash.filter(entry => entry !== item);
    }
    state.cet6RecordTrash = state.cet6RecordTrash.filter(item => new Date(item.deletedAt).getTime() > cutoff);
    saveState(); renderCet6Materials(); renderExamRecords('cet6');
  }

  async function emptyRecycleBin() {
    if (!state.recycleBin.length || !window.confirm('永久删除回收站中的全部资源？此操作无法撤销。')) return;
    const ids = state.recycleBin.map(item => item.id);
    for (const id of ids) await permanentlyDeleteRecycledItem(id, false);
    showToast(state.recycleBin.length ? '部分本地文件无法删除，已保留记录' : '回收站已清空');
  }

  function openLibraryFolderDialog(id = '') {
    const folder = state.libraryFolders.find(item => item.id === id);
    el('#libraryFolderDialogTitle').textContent = folder ? '编辑文件夹' : '新建文件夹';
    el('#libraryFolderEditingId').value = folder?.id || '';
    el('#libraryFolderName').value = folder?.name || '';
    setSafeMarkup(el('#libraryFolderParent'), `<option value="">顶层</option>${folderOptions(folder?.parentId || '', folder?.id || '')}`);
    el('#libraryFolderDialog').showModal();
  }

  function saveLibraryFolder(event) {
    event.preventDefault();
    const id = el('#libraryFolderEditingId').value, name = el('#libraryFolderName').value.trim(), parentId = el('#libraryFolderParent').value || null;
    if (!name) return;
    const duplicate = state.libraryFolders.some(folder => folder.id !== id && folder.parentId === parentId && folder.name.toLowerCase() === name.toLowerCase());
    if (duplicate) { showToast('同一位置已存在同名文件夹'); return; }
    if (id) { const folder = state.libraryFolders.find(item => item.id === id); if (!folder || !WorkbenchLibraryCore.canNest(state.libraryFolders, id, parentId)) return; folder.name = name; folder.parentId = parentId; }
    else state.libraryFolders.push({ id: `folder-${Date.now()}`, name, parentId, system: false, order: state.libraryFolders.length });
    saveState(); renderLibrary(); el('#libraryFolderDialog').close('saved'); showToast('文件夹已保存');
  }

  function deleteLibraryFolder(id) {
    const folder = state.libraryFolders.find(item => item.id === id); if (!folder || folder.system) return;
    const ids = new Set([id, ...WorkbenchLibraryCore.descendants(state.libraryFolders, id)]);
    const contents = state.library.filter(item => ids.has(item.folderId));
    if (contents.length) {
      const choice = window.prompt(`“${folder.name}”中有 ${contents.length} 项资料。输入 1 移到“其他资料”，输入 2 将资料移入30天回收站，其他输入取消。`, '1');
      if (choice === '1') contents.forEach(item => { item.folderId = 'system-other'; });
      else if (choice === '2') contents.slice().forEach(item => moveLibraryItemToRecycleBin(item.id));
      else return;
    }
    state.libraryFolders = state.libraryFolders.filter(item => !ids.has(item.id));
    if (activeLibraryFolder === id || ids.has(activeLibraryFolder)) activeLibraryFolder = 'all';
    saveState(); renderLibrary(); showToast('文件夹已删除，磁盘文件未直接删除');
  }

  async function chooseLibraryFiles(action) {
    try {
      const result = await callNative(action); pendingLibraryFiles = result.files || [];
      setSafeMarkup(el('#libraryPendingFiles'), pendingLibraryFiles.length ? pendingLibraryFiles.map(file => `<div class="research-record-row"><div><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(WorkbenchLibraryCore.fileType(file.name))} · ${formatBytes(Number(file.size || 0))}</span></div><span class="status-tag">待导入</span></div>`).join('') : '<div class="empty-state compact-empty"><strong>未发现支持的文件</strong></div>');
      setSafeMarkup(el('#libraryImportFolder'), folderOptions(activeLibraryFolder === 'all' ? 'system-other' : activeLibraryFolder));
      el('#libraryImportStatus').textContent = `已选择 ${pendingLibraryFiles.length} 个文件`;
      el('#libraryImportDialog').showModal();
    } catch (error) { if (error.message !== 'cancelled') showToast('无法读取所选文件'); }
  }

  async function importLibraryFiles(event) {
    event.preventDefault(); if (!pendingLibraryFiles.length) return;
    const folderId = el('#libraryImportFolder').value, copy = el('#libraryImportMode').value === 'copy';
    let imported = 0;
    for (const [index, file] of pendingLibraryFiles.entries()) {
      el('#libraryImportStatus').textContent = `正在处理 ${index + 1}/${pendingLibraryFiles.length}：${file.name}`;
      const duplicate = WorkbenchLibraryCore.duplicateByFingerprint(allLibraryItems(), file.fingerprint);
      if (duplicate) {
        const choice = window.prompt(`“${file.name}”与已有资料重复。输入 1 使用已有文件，输入 2 保留副本，输入 3 取消本文件。`, '1');
        if (choice !== '2') continue;
      }
      try {
        const result = await callNative('importLibraryAsset', { path: file.path, copy });
        state.library.unshift({ id: Date.now() + index, title: result.name, type: WorkbenchLibraryCore.fileType(result.name), category: WorkbenchLibraryCore.fileType(result.name), sourceModule: '手动上传', folderId, localPdfPath: result.path, localPdfName: result.name, fingerprint: result.fingerprint, size: result.size, managedLocalFile: result.managed, createdAt: new Date().toISOString() }); imported += 1;
      } catch (_) { el('#libraryImportStatus').textContent = `“${file.name}”导入失败，其余已成功文件保持不变`; }
    }
    pendingLibraryFiles = []; saveState(); renderLibrary(); el('#libraryImportDialog').close('saved'); showToast(`已导入 ${imported} 项资料`);
  }

  function addLibraryItem() {
    const title = el('#libraryTitleInput').value.trim();
    if (!title) return false;
    state.library.unshift({ id: Date.now(), title, link: el('#libraryLinkInput').value.trim(), type: el('#libraryTypeInput').value, category: el('#libraryCategoryInput').value, sourceModule: '手动添加', folderId: el('#libraryFolderInput').value || 'system-other', createdAt: new Date().toISOString() });
    saveState(); renderLibrary(); el('#libraryAddForm').reset(); showToast('资料元数据已保存'); return true;
  }

  function renderResearch() {
    if (window.WorkbenchResearchModule) window.WorkbenchResearchModule.render();
  }

  function materialTitle(material) { return `${material.year}年${String(material.month).padStart(2, '0')}月 第${material.set}套`; }

  function renderCet6Materials() {
    const root = el('#cet6MaterialList');
    if (!root) return;
    const fileRows = material => ['paper', 'answer', 'audio'].flatMap(type => (material[type] || []).map(file => `<div class="cet6-material-file"><span><b>${type === 'paper' ? '试卷' : type === 'answer' ? '答案' : '音频'}</b> · ${escapeHtml(file.fileName || file.name)}</span><button type="button" data-cet6-open-file="${escapeHtml(file.path)}">${type === 'audio' ? '加载播放' : '应用内查看'}</button></div>`)).join('');
    setSafeMarkup(root, state.cet6Materials.length ? state.cet6Materials.map(material => `<article class="cet6-material-card"><header><div><strong>${escapeHtml(materialTitle(material))}</strong><span class="status-tag">${material.managed ? '本地资料库' : '引用原文件'}</span></div><button type="button" data-cet6-delete-material="${escapeHtml(material.id)}">删除</button></header><div class="cet6-material-files">${fileRows(material) || '<span class="muted-note">尚未关联文件</span>'}</div></article>`).join('') : '<div class="empty-state"><strong>尚未导入 CET-6 资料</strong><span>可以选择文件夹自动建议配对，也可以只使用纸质版计时。</span></div>');
    if (state.cet6Trash.length) root.insertAdjacentHTML('beforeend', `<details class="checkpoint-trash"><summary>资料回收站（${state.cet6Trash.length}）</summary>${state.cet6Trash.map(item => `<div class="cet6-material-file"><span>${escapeHtml(materialTitle(item.material))} · ${Math.max(0, 30 - Math.floor((Date.now() - new Date(item.deletedAt)) / 86400000))}天后删除</span><button type="button" data-cet6-restore-material="${escapeHtml(item.material.id)}">恢复</button></div>`).join('')}</details>`);
    all('[data-cet6-open-file]', root).forEach(button => button.addEventListener('click', openCet6File));
    all('[data-cet6-delete-material]', root).forEach(button => button.addEventListener('click', deleteCet6Material));
    all('[data-cet6-restore-material]', root).forEach(button => button.addEventListener('click', restoreCet6Material));
    renderCet6MaterialOptions();
  }

  async function openCet6File(event) {
    const path = event.currentTarget.dataset.cet6OpenFile;
    if (/\.(mp3|m4a|wav|aac)$/i.test(path)) {
      try { await callNative('loadTrainingAudio', { path }); showToast('听力音频已加载，可在训练中播放'); }
      catch (error) { showToast(error.message === 'desktop_bridge_unavailable' ? '请在桌面版中播放本地音频' : '音频文件失效，请重新定位'); }
      return;
    }
    try { await callNative('openLocalTrainingFile', { path }); }
    catch (_) { showToast('文件失效或当前环境不支持应用内预览'); }
  }

  async function chooseCet6Materials(action) {
    try {
      const result = await callNative(action);
      pendingCet6Import = WorkbenchCet6TrainingCore.proposeMaterialGroups(result.files || []);
      renderCet6Import(result.files || []);
      el('#cet6ImportDialog').showModal();
    } catch (error) {
      if (!['cancelled', 'desktop_bridge_unavailable'].includes(error.message)) showToast('读取资料列表失败');
      else if (error.message === 'desktop_bridge_unavailable') showToast('本地资料导入仅在桌面版可用');
    }
  }

  function renderCet6Import(files) {
    setSafeMarkup(el('#cet6ImportSummary'), `<strong>发现 ${files.length} 个支持的文件</strong><span>${pendingCet6Import.length} 组可按文件名识别；未读取试卷正文。</span>`);
    setSafeMarkup(el('#cet6ImportGroups'), pendingCet6Import.length ? pendingCet6Import.map((group, index) => `<article class="cet6-import-group" data-import-group="${index}"><header><label class="inline-checkbox"><input type="checkbox" checked data-import-enabled>导入这一套</label><span>${group.paper.length}份试卷 · ${group.answer.length}份答案 · ${group.audio.length}段音频</span></header><div class="form-grid"><label>年份 *<input type="number" min="2000" max="2100" value="${Number(group.year)}" data-import-year></label><label>月份 *<input type="number" min="1" max="12" value="${Number(group.month)}" data-import-month></label><label>套次 *<input type="number" min="1" max="20" value="${Number(group.set)}" data-import-set></label><label>识别结果<input value="${escapeHtml(materialTitle(group))}" readonly></label></div><div class="cet6-material-files">${['paper', 'answer', 'audio'].flatMap(type => group[type].map(file => `<span>${type === 'paper' ? '试卷' : type === 'answer' ? '答案' : '音频'} · ${escapeHtml(file.name)}</span>`)).join('')}</div></article>`).join('') : '<div class="empty-state"><strong>没有识别出完整的年月与套次</strong><span>请调整文件名后重新选择；第一版不会读取正文推测资料。</span></div>');
    el('#cet6ImportError').textContent = pendingCet6Import.length ? '' : '至少需要一组能识别年份、月份和套次的资料。';
  }

  async function confirmCet6Import(event) {
    event.preventDefault();
    const selected = all('[data-import-group]', el('#cet6ImportGroups')).filter(row => el('[data-import-enabled]', row).checked);
    if (!selected.length) { el('#cet6ImportError').textContent = '请至少选择一套资料。'; return; }
    const button = el('#confirmCet6ImportButton'); button.disabled = true; button.textContent = '正在逐个导入…';
    const copy = el('input[name="cet6StorageMode"]:checked', el('#cet6ImportForm')).value === 'copy';
    try {
      for (const row of selected) {
        const group = pendingCet6Import[Number(row.dataset.importGroup)];
        const year = Number(el('[data-import-year]', row).value), month = Number(el('[data-import-month]', row).value), set = Number(el('[data-import-set]', row).value);
        if (!year || month < 1 || month > 12 || set < 1) throw new Error('invalid_metadata');
        const imported = { id: `${year}-${String(month).padStart(2, '0')}-${set}`, year, month, set, paper: [], answer: [], audio: [], managed: copy, createdAt: new Date().toISOString() };
        for (const type of ['paper', 'answer', 'audio']) for (const file of group[type]) {
          const result = await callNative('importCet6Asset', { path: file.path, copy });
          imported[type].push({ path: result.path, fileName: result.fileName, managed: result.managed, size: file.size || 0 });
        }
        const existing = state.cet6Materials.find(item => item.id === imported.id);
        if (existing) for (const type of ['paper', 'answer', 'audio']) imported[type].forEach(file => { if (!existing[type].some(item => item.path === file.path || item.fileName === file.fileName)) existing[type].push(file); });
        else state.cet6Materials.push(imported);
      }
      saveState(); renderCet6Materials(); renderLibrary(); el('#cet6ImportDialog').close('saved'); showToast(`已导入 ${selected.length} 套 CET-6 资料`);
    } catch (error) {
      el('#cet6ImportError').textContent = error.message === 'invalid_metadata' ? '请检查年份、月份和套次。' : '导入中断，已完成的文件不会重复导入；请检查本地存储权限。';
    } finally { button.disabled = false; button.textContent = '确认导入'; }
  }

  function deleteCet6Material(event) {
    const index = state.cet6Materials.findIndex(item => item.id === event.currentTarget.dataset.cet6DeleteMaterial);
    if (index < 0) return;
    state.cet6Trash.unshift({ material: state.cet6Materials.splice(index, 1)[0], deletedAt: new Date().toISOString() });
    saveState(); renderCet6Materials(); showToast('资料已移入本地回收站，训练记录仍保留');
  }

  function restoreCet6Material(event) {
    const index = state.cet6Trash.findIndex(item => item.material.id === event.currentTarget.dataset.cet6RestoreMaterial);
    if (index < 0) return;
    state.cet6Materials.push(state.cet6Trash.splice(index, 1)[0].material);
    saveState(); renderCet6Materials(); showToast('资料已恢复');
  }

  function renderCet6MaterialOptions() {
    const select = el('#cet6TrainingMaterial');
    if (!select) return;
    const selected = select.value;
    setSafeMarkup(select, '<option value="">不关联资料 / 纸质版 / 其他平台</option>' + state.cet6Materials.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(materialTitle(item))}</option>`).join(''));
    if ([...select.options].some(option => option.value === selected)) select.value = selected;
  }

  async function refreshCet6StorageInfo() {
    try { const result = await callNative('getCet6StorageInfo'); el('#cet6StoragePathLabel').textContent = result.path; el('#cet6StorageStatus').textContent = '本地目录 · 可复制或引用'; }
    catch (_) { el('#cet6StoragePathLabel').textContent = '仅桌面版支持配置'; }
  }

  async function changeCet6Storage() {
    const managedFiles = state.cet6Materials.flatMap(material => ['paper', 'answer', 'audio'].flatMap(type => (material[type] || []).filter(file => file.managed).map(file => ({ material, type, file }))));
    const migrate = managedFiles.length ? window.confirm('是否将现有受管 CET-6 资料复制到新位置？\n“取消”只修改以后导入的存储位置。') : false;
    try {
      const result = await callNative('chooseCet6StorageDirectory'); el('#cet6StoragePathLabel').textContent = result.path;
      if (migrate) for (const entry of managedFiles) { const imported = await callNative('importCet6Asset', { path: entry.file.path, copy: true }); entry.file.path = imported.path; entry.file.fileName = imported.fileName; }
      saveState(); renderCet6Materials(); showToast(migrate ? '现有资料已逐个复制到新位置，旧文件保留作为安全副本' : '存储位置已更新，仅影响以后导入');
    }
    catch (error) { if (error.message !== 'cancelled') showToast('无法修改 CET-6 存储位置'); }
  }

  function openCet6Setup(kind) {
    el('#cet6SetupForm').reset();
    el('#cet6TrainingKind').value = kind;
    el('#cet6TrainingDate').value = isoToday();
    el('#cet6Hours').value = 2; el('#cet6Minutes').value = 25;
    el('#cet6SessionSound').checked = state.settings.cet6Sound;
    cet6SetupOrder = [...cet6Modules];
    el('#cet6SetupTitle').textContent = kind === 'paper' ? '套卷训练' : kind === 'timer' ? '纸质版做题，直接开始计时' : '模块组合训练';
    setSafeMarkup(el('#cet6TimerMode'), kind === 'modules' ? '<option value="countdown">总倒计时</option><option value="modules">分模块计时</option>' : '<option value="countdown">总倒计时（默认2小时25分）</option><option value="clock">模拟正计时 15:00–17:25</option><option value="modules">分模块计时</option>');
    renderCet6MaterialOptions();
    if (kind === 'timer') el('#cet6TrainingMaterial').value = '';
    renderCet6SetupModules(kind !== 'modules');
    updateCet6SetupFields();
    el('#cet6SetupError').textContent = '';
    el('#cet6SetupDialog').showModal();
  }

  function renderCet6SetupModules(selectAll) {
    const selected = new Set(all('[data-cet6-module-check]:checked').map(input => input.value));
    setSafeMarkup(el('#cet6ModuleOrder'), cet6SetupOrder.map((module, index) => `<div class="cet6-module-row"><input type="checkbox" data-cet6-module-check value="${escapeHtml(module)}" ${(selectAll || selected.has(module)) ? 'checked' : ''}><span>${escapeHtml(module)}</span><button type="button" data-module-move="up" data-module-index="${index}" aria-label="上移${escapeHtml(module)}">↑</button><button type="button" data-module-move="down" data-module-index="${index}" aria-label="下移${escapeHtml(module)}">↓</button></div>`).join(''));
    all('[data-cet6-module-check]').forEach(input => input.addEventListener('change', updateCet6ModuleTimes));
    all('[data-module-move]').forEach(button => button.addEventListener('click', moveCet6Module));
    updateCet6ModuleTimes();
  }

  function moveCet6Module(event) {
    const index = Number(event.currentTarget.dataset.moduleIndex);
    const target = event.currentTarget.dataset.moduleMove === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= cet6SetupOrder.length) return;
    [cet6SetupOrder[index], cet6SetupOrder[target]] = [cet6SetupOrder[target], cet6SetupOrder[index]];
    renderCet6SetupModules(false);
  }

  function selectedCet6Modules() { return cet6SetupOrder.filter(module => el(`[data-cet6-module-check][value="${module}"]`)?.checked); }

  function updateCet6ModuleTimes() {
    const selected = selectedCet6Modules();
    setSafeMarkup(el('#cet6ModuleTimes'), selected.map(module => `<label class="cet6-module-time-row">${escapeHtml(module)}<input type="number" min="1" max="180" value="${Number(cet6DefaultModuleMinutes[module])}" data-module-minutes="${escapeHtml(module)}"><span>分钟</span></label>`).join(''));
  }

  function updateCet6SetupFields() {
    const modular = el('#cet6TimerMode').value === 'modules';
    all('.cet6-total-time').forEach(field => { field.hidden = modular; });
    el('#cet6ModuleTimes').hidden = !modular;
    const workspaceAudio = el('#cet6AudioMode').value === 'workspace';
    const material = state.cet6Materials.find(item => item.id === el('#cet6TrainingMaterial').value);
    const audio = material?.audio || [];
    setSafeMarkup(el('#cet6AudioAsset'), (audio.length > 1 ? '<option value="__all__">按资料顺序连续播放全部音频</option>' : '') + audio.map((file, index) => `<option value="${escapeHtml(file.path)}">${index + 1}. ${escapeHtml(file.fileName)}</option>`).join(''));
    el('#cet6AudioAssetField').hidden = !workspaceAudio;
    if (workspaceAudio && !audio.length) el('#cet6SetupError').textContent = '所选资料没有听力音频；可改用其他设备或不播放。'; else el('#cet6SetupError').textContent = '';
  }

  async function createCet6Session(event) {
    event.preventDefault();
    const modules = selectedCet6Modules();
    if (!modules.length) { el('#cet6SetupError').textContent = '请至少选择一个训练模块。'; return; }
    const timerMode = el('#cet6TimerMode').value;
    const totalSeconds = (Number(el('#cet6Hours').value) * 60 + Number(el('#cet6Minutes').value)) * 60;
    if (timerMode !== 'modules' && totalSeconds < 60) { el('#cet6SetupError').textContent = '训练时间至少为1分钟。'; return; }
    const moduleSeconds = {};
    if (timerMode === 'modules') for (const module of modules) moduleSeconds[module] = Number(el(`[data-module-minutes="${module}"]`).value) * 60;
    const materialId = el('#cet6TrainingMaterial').value;
    const material = state.cet6Materials.find(item => item.id === materialId);
    const audioMode = el('#cet6AudioMode').value;
    const selectedAudio = audioMode === 'workspace' ? el('#cet6AudioAsset').value : '';
    const audioPaths = audioMode === 'workspace' ? (selectedAudio === '__all__' ? (material?.audio || []).map(file => file.path) : [selectedAudio].filter(Boolean)) : [];
    const audioPath = audioPaths[0] || '';
    if (audioMode === 'workspace' && !audioPath) { el('#cet6SetupError').textContent = '请选择有效的听力音频。'; return; }
    state.cet6Training.active = WorkbenchCet6TrainingCore.createSession({ kind: el('#cet6TrainingKind').value, trainingDate: el('#cet6TrainingDate').value, timerMode, totalSeconds: timerMode === 'clock' ? 8700 : totalSeconds, modules, moduleSeconds, materialId, materialTitle: material ? materialTitle(material) : '', audioMode, audioPath, audioPaths, audioIndex: 0, sound: el('#cet6SessionSound').checked, answerViewedAt: null }, Date.now());
    saveState(); el('#cet6SetupDialog').close('created'); renderCet6CurrentSession(); await openCet6Training();
  }

  function renderCet6CurrentSession() {
    const session = state.cet6Training.active;
    const title = el('#cet6CurrentSessionTitle'), summary = el('#cet6CurrentSessionSummary'), resume = el('#resumeCet6SessionButton');
    if (!session && state.cet6Training.pendingRecord) { title.textContent = '上次训练待填写记录'; setSafeMarkup(summary, '<strong>计时已经结束</strong><span>完成日期和训练模块为必填，其他内容可以稍后补充。</span>'); resume.hidden = false; resume.textContent = '填写记录'; return; }
    if (!session) { title.textContent = '尚未开始'; setSafeMarkup(summary, '<strong>选择一种训练方式</strong><span>准备完成后仍需点击“开始”，不会自动计时或播放音频。</span>'); resume.hidden = true; return; }
    title.textContent = session.materialTitle || (session.kind === 'timer' ? '纸质版 / 其他平台训练' : '未关联资料训练');
    setSafeMarkup(summary, `<strong>${escapeHtml(session.modules.join('、'))}</strong><span>${session.timerMode === 'clock' ? '模拟15:00–17:25' : session.timerMode === 'modules' ? '分模块计时' : `总倒计时 ${formatClock(session.totalSeconds)}`} · ${session.status === 'running' ? '进行中' : session.status === 'paused' ? '已暂停' : '准备开始'}</span>`);
    resume.hidden = false; resume.textContent = '继续训练';
  }

  async function openCet6Training() {
    const session = state.cet6Training.active;
    if (!session) return;
    const material = state.cet6Materials.find(item => item.id === session.materialId);
    el('#cet6TrainingTitle').textContent = session.materialTitle || 'CET-6 训练';
    el('#cet6TrainingModeLabel').textContent = session.timerMode === 'clock' ? '模拟正计时' : session.timerMode === 'modules' ? '分模块计时' : '总倒计时';
    el('#cet6TrainingMaterialLabel').textContent = session.materialTitle || '未关联资料';
    const files = material ? [...(material.paper || []), ...(session.answerViewedAt ? material.answer || [] : [])] : [];
    setSafeMarkup(el('#cet6TrainingFiles'), files.length ? files.map(file => `<button type="button" data-training-file="${escapeHtml(file.path)}"><span>${escapeHtml(file.fileName)}</span><b>预览</b></button>`).join('') + (!session.answerViewedAt && material?.answer?.length ? '<button type="button" id="unlockCet6AnswerButton"><span>答案已锁定</span><b>确认查看</b></button>' : '') : '<div class="empty-state compact-empty"><strong>未关联电子资料</strong><span>可以使用纸质试卷或其他平台继续计时。</span></div>');
    all('[data-training-file]').forEach(button => button.addEventListener('click', async () => { try { await callNative('openLocalTrainingFile', { path: button.dataset.trainingFile }); } catch (_) { showToast('文件失效，请重新定位'); } }));
    el('#unlockCet6AnswerButton')?.addEventListener('click', unlockCet6Answer);
    el('#cet6AudioControls').hidden = session.audioMode !== 'workspace';
    if (session.audioMode === 'workspace' && session.audioPath) {
      try { await callNative('loadTrainingAudio', { path: session.audioPath }); if (session.audioPosition) await callNative('controlTrainingAudio', { command: 'seek', seconds: session.audioPosition }); }
      catch (_) { showToast('音频加载失败，可改用其他设备后继续计时'); }
    }
    el('#cet6TrainingDialog').showModal();
    startCet6Ticker(); renderCet6Timer();
  }

  function unlockCet6Answer() {
    if (!window.confirm('训练尚未结束。确定提前查看答案吗？该行为会记录在本次训练中。')) return;
    state.cet6Training.active.answerViewedAt = new Date().toISOString(); saveState(); el('#cet6TrainingDialog').close('refresh'); openCet6Training();
  }

  function formatClock(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds || 0)));
    return `${String(Math.floor(value / 3600)).padStart(2, '0')}:${String(Math.floor(value % 3600 / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  }

  function renderCet6Timer() {
    const session = state.cet6Training.active;
    if (!session) return;
    const now = Date.now();
    el('#cet6TimerDisplay').textContent = session.timerMode === 'clock' ? `${WorkbenchCet6TrainingCore.displayTime(session, now)}:00` : formatClock(WorkbenchCet6TrainingCore.remainingSeconds(session, now));
    el('#cet6CurrentModuleLabel').textContent = session.timerMode === 'modules' ? (WorkbenchCet6TrainingCore.currentModule(session) || '全部模块完成') : session.modules.join('、');
    el('#cet6TrainingStatus').textContent = session.status === 'running' ? '计时中' : session.status === 'paused' ? '已暂停' : '准备开始';
    el('#cet6StartPauseButton').textContent = session.status === 'running' ? '暂停' : session.status === 'paused' ? '继续' : '开始';
    setSafeMarkup(el('#cet6ModuleProgress'), session.modules.map((module, index) => `<span class="${index === session.moduleIndex ? 'active' : ''}" title="${escapeHtml(module)}"></span>`).join(''));
    el('#cet6NextModuleButton').hidden = session.timerMode !== 'modules' || session.moduleIndex >= session.modules.length - 1;
    const remaining = WorkbenchCet6TrainingCore.remainingSeconds(session, now);
    if (session.status === 'running' && remaining <= 300 && remaining > 0 && !session.fiveMinuteNotified) { session.fiveMinuteNotified = true; saveState(); playCet6Alert(660); showToast('本次训练还剩5分钟'); }
    if (session.status === 'running' && remaining <= 0 && !cet6TimeoutShown) showCet6Timeout();
    refreshCet6AudioStatus();
  }

  function startCet6Ticker() { clearInterval(cet6TimerHandle); cet6TimerHandle = setInterval(renderCet6Timer, 1000); }

  async function toggleCet6Timer() {
    let session = state.cet6Training.active; if (!session) return;
    if (session.status === 'running') { session = WorkbenchCet6TrainingCore.pause(session, Date.now()); await controlCet6Audio('pause'); }
    else { session = session.status === 'paused' ? WorkbenchCet6TrainingCore.resume(session, Date.now()) : WorkbenchCet6TrainingCore.start(session, Date.now()); await controlCet6Audio('play'); }
    state.cet6Training.active = session; saveState(); renderCet6CurrentSession(); renderCet6Timer();
  }

  async function controlCet6Audio(command, seconds) {
    const session = state.cet6Training.active;
    if (!session || session.audioMode !== 'workspace') return;
    try { return await callNative('controlTrainingAudio', { command, seconds }); } catch (_) { return null; }
  }

  async function refreshCet6AudioStatus() {
    const session = state.cet6Training.active;
    if (!session || session.audioMode !== 'workspace' || el('#cet6AudioControls').hidden) return;
    try {
      const status = await callNative('getTrainingAudioStatus');
      if (session.status === 'running' && !status.playing && status.duration > 0 && status.currentTime >= status.duration - 0.25 && session.audioIndex < (session.audioPaths || []).length - 1) {
        session.audioIndex += 1; session.audioPath = session.audioPaths[session.audioIndex]; session.audioPosition = 0; await callNative('loadTrainingAudio', { path: session.audioPath }); await callNative('controlTrainingAudio', { command: 'play' }); saveState(); return;
      }
      el('#cet6AudioPlayButton').textContent = status.playing ? '暂停音频' : '播放音频'; el('#cet6AudioTime').textContent = `${formatClock(status.currentTime).slice(3)} / ${formatClock(status.duration).slice(3)}${(session.audioPaths || []).length > 1 ? ` · ${session.audioIndex + 1}/${session.audioPaths.length}` : ''}`; session.audioPosition = status.currentTime;
    }
    catch (_) { el('#cet6AudioTime').textContent = '音频状态不可用'; }
  }

  async function handleCet6Audio(event) {
    const action = event.currentTarget.dataset.cet6Audio;
    if (action === 'toggle') { const status = await callNative('getTrainingAudioStatus').catch(() => null); await controlCet6Audio(status?.playing ? 'pause' : 'play'); }
    if (action === 'skip-back') await controlCet6Audio('skip', -5);
    if (action === 'skip-forward') await controlCet6Audio('skip', 5);
    refreshCet6AudioStatus();
  }

  function showCet6Timeout() {
    const session = state.cet6Training.active; if (!session) return;
    cet6TimeoutShown = true; playCet6Alert(880);
    state.cet6Training.active = WorkbenchCet6TrainingCore.pause(session, Date.now()); saveState(); controlCet6Audio('pause');
    el('#cet6TimeoutTitle').textContent = session.timerMode === 'modules' ? `${WorkbenchCet6TrainingCore.currentModule(session)}到时` : '本次训练到时';
    el('#timeoutNextCet6Button').textContent = session.timerMode === 'modules' && session.moduleIndex < session.modules.length - 1 ? '进入下一模块' : '结束并填写记录';
    el('#cet6TimeoutDialog').showModal();
  }

  function extendCet6(seconds) {
    state.cet6Training.active = WorkbenchCet6TrainingCore.extendCurrent(state.cet6Training.active, seconds);
    cet6TimeoutShown = false; el('#cet6TimeoutDialog').close('extended'); saveState(); renderCet6Timer(); showToast(`已延长 ${Math.round(seconds / 60)} 分钟`);
  }

  function nextCet6Module() {
    const session = state.cet6Training.active;
    if (!session) return;
    if (session.timerMode !== 'modules' || session.moduleIndex >= session.modules.length - 1) { finishCet6Session(); return; }
    state.cet6Training.active = WorkbenchCet6TrainingCore.nextModule(session); cet6TimeoutShown = false; controlCet6Audio('pause'); playCet6Alert(740); saveState();
    el('#cet6TimeoutDialog').close('next'); renderCet6Timer(); showToast(`已进入${WorkbenchCet6TrainingCore.currentModule(state.cet6Training.active)}`);
  }

  function requestCet6End() { if (state.cet6Training.active?.status === 'running') toggleCet6Timer(); el('#cet6EndDialog').showModal(); }

  async function discardCet6Session() {
    if (!window.confirm('确定彻底放弃本次训练吗？计时记录不会保存。')) return;
    await controlCet6Audio('stop'); state.cet6Training.active = null; saveState(); clearInterval(cet6TimerHandle);
    el('#cet6EndDialog').close('discard'); el('#cet6TrainingDialog').close('discard'); renderCet6CurrentSession(); showToast('本次训练已放弃且未保存');
  }

  async function finishCet6Session() {
    const session = state.cet6Training.active; if (!session) return;
    const stopped = session.status === 'running' ? WorkbenchCet6TrainingCore.pause(session, Date.now()) : session;
    await controlCet6Audio('stop');
    state.cet6Training.pendingRecord = { session: stopped, completedAt: new Date().toISOString() };
    state.cet6Training.active = null; saveState(); clearInterval(cet6TimerHandle);
    el('#cet6EndDialog').open && el('#cet6EndDialog').close('finish'); el('#cet6TimeoutDialog').open && el('#cet6TimeoutDialog').close('finish'); el('#cet6TrainingDialog').close('finish');
    renderCet6CurrentSession(); openCet6RecordDialog();
  }

  function openCet6RecordDialog(record = null) {
    const pending = state.cet6Training.pendingRecord;
    const session = pending?.session;
    editingCet6RecordId = record?.id || null;
    el('#cet6TrainingRecordForm').reset();
    el('#cet6RecordDate').value = record?.date || pending?.completedAt?.slice(0, 10) || isoToday();
    el('#cet6RecordModules').value = record?.module || session?.modules?.join('、') || '';
    el('#cet6RecordMaterial').value = record?.material || session?.materialTitle || '';
    el('#cet6RecordDuration').value = record?.duration ?? Math.round(WorkbenchCet6TrainingCore.totalElapsedSeconds(session || { elapsedSeconds: 0, completedSeconds: 0, status: 'paused' }) / 60);
    el('#cet6RecordCorrect').value = record?.correct ?? ''; el('#cet6RecordTotal').value = record?.total ?? '';
    el('#cet6RecordReviewDate').value = record?.reviews?.find(item => !item.done)?.date || '';
    el('#cet6RecordNotes').value = record?.notes || '';
    all('[name="cet6ErrorTag"]').forEach(input => { input.checked = record?.errorTags?.includes(input.value) || false; });
    el('#cet6RecordError').textContent = '';
    el('#cet6RecordDialog').showModal();
  }

  function saveCet6TrainingRecord(event, draft = false) {
    event?.preventDefault();
    const date = el('#cet6RecordDate').value, module = el('#cet6RecordModules').value.trim();
    if (!draft && (!date || !module)) { el('#cet6RecordError').textContent = '完成日期和训练模块为必填项。'; return; }
    const existing = state.cet6Records.find(item => String(item.id) === String(editingCet6RecordId));
    const reviewDate = el('#cet6RecordReviewDate').value;
    const correctValue = el('#cet6RecordCorrect').value, totalValue = el('#cet6RecordTotal').value;
    const record = existing || { id: `cet6-record-${Date.now()}`, createdAt: new Date().toISOString(), reviews: [] };
    Object.assign(record, { module, material: el('#cet6RecordMaterial').value.trim() || '未填写材料', date: date || isoToday(), duration: Number(el('#cet6RecordDuration').value || 0), correct: correctValue === '' ? null : Number(correctValue), total: totalValue === '' ? null : Number(totalValue), writingScore: null, notes: el('#cet6RecordNotes').value.trim(), errorTags: all('[name="cet6ErrorTag"]:checked').map(input => input.value), attachmentName: el('#cet6RecordAttachment').files[0]?.name || existing?.attachmentName || '', status: draft ? '待补记录' : '已完成', updatedAt: new Date().toISOString() });
    if (reviewDate && !record.reviews.some(item => item.date === reviewDate)) record.reviews.push({ date: reviewDate, done: false });
    if (!existing) state.cet6Records.unshift(record);
    state.cet6Training.pendingRecord = null; saveState(); renderExamRecords('cet6'); renderCet6Reviews(); el('#cet6RecordDialog').close(draft ? 'draft' : 'saved'); showToast(draft ? '已保存为待补记录' : 'CET-6 训练记录已保存');
  }

  function handleCet6SystemSleep() {
    const session = state.cet6Training.active;
    if (!session?.status || session.status !== 'running') return;
    if (session.audioMode === 'workspace' || state.settings.cet6Sleep === 'pause') {
      state.cet6Training.active = WorkbenchCet6TrainingCore.pause(session, Date.now()); controlCet6Audio('pause'); saveState(); renderCet6Timer(); showToast('电脑休眠，CET-6训练已暂停');
    }
  }

  function playCet6Alert(frequency = 740, force = false) {
    if (!force && !(state.cet6Training.active?.sound ?? state.settings.cet6Sound)) return;
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)(); const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0.08, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
      oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.36); oscillator.addEventListener('ended', () => context.close());
    } catch (_) { showToast('提示音不可用'); }
  }

  function examRecords(exam) { return exam === 'ielts' ? state.ieltsRecords : state.cet6Records; }

  function toggleExamScoreFields(form) {
    const writing = form.elements.module.value === '写作';
    all('.objective-field', form).forEach(field => { field.hidden = writing; });
    all('.writing-field', form).forEach(field => { field.hidden = !writing; });
  }

  function saveExamRecord(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const exam = form.dataset.exam;
    const module = form.elements.module.value;
    const correct = Number(form.elements.correct.value);
    const total = Number(form.elements.total.value);
    const writingScore = Number(form.elements.writingScore.value);
    if (module !== '写作' && (total < 1 || correct < 0 || correct > total)) { showToast('请检查正确题数和总题数'); return; }
    const attachment = form.elements.attachment.files[0];
    const reviewDate = form.elements.reviewDate.value;
    examRecords(exam).unshift({
      id: Date.now(), module, material: form.elements.material.value.trim(), date: form.elements.date.value,
      duration: Number(form.elements.duration.value), correct: module === '写作' ? null : correct,
      total: module === '写作' ? null : total, writingScore: module === '写作' && writingScore ? writingScore : null,
      attachmentName: attachment?.name || '', reviews: reviewDate ? [{ date: reviewDate, done: false }] : [], createdAt: new Date().toISOString()
    });
    saveState(); renderExamRecords(exam); form.reset(); form.elements.date.value = isoToday(); form.elements.duration.value = exam === 'ielts' ? 45 : 60; form.elements.total.value = exam === 'ielts' ? 40 : 25; toggleExamScoreFields(form);
    showToast(`${exam === 'ielts' ? 'IELTS' : 'CET-6'} 记录已独立保存`);
  }

  function examScoreLabel(record, exam) {
    if (record.module === '写作') return record.writingScore ? `${record.writingScore} · 非官方量表` : '待人工或AI评价';
    if (record.correct === null || record.correct === undefined || !record.total) return record.status === '待补记录' ? '待补记录' : '未填写得分';
    if (exam === 'ielts') return `${record.correct}/${record.total} · Band待来源化换算`;
    return record.estimatedScore !== undefined && record.scoreRuleSource ? `${record.correct}/${record.total} · 约${record.estimatedScore}分（${record.scoreRuleSource}）` : `${record.correct}/${record.total} · 估分规则待配置`;
  }

  function renderExamRecords(exam) {
    const records = examRecords(exam);
    const list = el(`#${exam}RecordList`);
    if (!list) return;
    const pending = records.reduce((sum, record) => sum + (record.reviews || []).filter(review => !review.done).length, 0);
    el(`#${exam}RecordMetric`).textContent = records.length;
    el(`#${exam}ReviewMetric`).textContent = pending;
    el(`#${exam}NavCount`).textContent = pending;
    if (exam === 'cet6') {
      const mockCount = records.filter(record => record.module !== '写作' && /完整|模考/.test(record.material)).length;
      el('#cet6PredictionMetric').textContent = mockCount >= 2 ? '可生成非官方区间' : `${mockCount}/2 次完整模考`;
    }
    setSafeMarkup(list, records.length ? records.map(record => `<article class="exam-record-row"><div class="record-score"><b>${escapeHtml(record.module)}</b><span>${escapeHtml(examScoreLabel(record, exam))}</span></div><div class="record-main"><strong>${escapeHtml(record.material)}</strong><span>${escapeHtml(record.date)} · ${Number(record.duration || 0)}分钟${record.status ? ` · ${escapeHtml(record.status)}` : ''}${record.attachmentName ? ` · 附件：${escapeHtml(record.attachmentName)}` : ''}</span>${record.notes ? `<small>${escapeHtml(record.notes)}</small>` : ''}<div class="review-chips">${(record.reviews || []).length ? record.reviews.map((review, index) => `<button type="button" class="${review.done ? 'done' : ''}" data-review-toggle="${escapeHtml(exam)}:${escapeHtml(record.id)}:${index}">${escapeHtml(review.date)} · ${review.done ? '已复盘' : '待复盘'}</button>`).join('') : '<span>尚未安排复盘</span>'}</div></div><div class="record-actions"><input type="date" data-review-date="${escapeHtml(exam)}:${escapeHtml(record.id)}" aria-label="新增复盘日期"><button type="button" data-review-add="${escapeHtml(exam)}:${escapeHtml(record.id)}">添加复盘</button>${exam === 'cet6' ? `<button type="button" data-cet6-edit-record="${escapeHtml(record.id)}">编辑</button>` : ''}<button type="button" data-record-delete="${escapeHtml(exam)}:${escapeHtml(record.id)}">删除</button></div></article>`).join('') : `<div class="empty-state"><strong>暂无${exam === 'ielts' ? 'IELTS' : 'CET-6'}做题记录</strong><span>两类考试的数据、附件引用、评分与复盘严格分开保存。</span></div>`);
    if (exam === 'cet6' && state.cet6RecordTrash.length) list.insertAdjacentHTML('beforeend', `<details class="checkpoint-trash"><summary>训练记录回收站（${state.cet6RecordTrash.length}）</summary>${state.cet6RecordTrash.map(item => `<div class="cet6-material-file"><span>${escapeHtml(item.record.module)} · ${escapeHtml(item.record.date)}</span><button type="button" data-cet6-restore-record="${escapeHtml(String(item.record.id))}">恢复</button></div>`).join('')}</details>`);
    if (exam === 'ielts' && state.ielts?.recordTrash?.length) list.insertAdjacentHTML('beforeend', `<details class="checkpoint-trash"><summary>训练记录回收站（${state.ielts.recordTrash.length}）</summary>${state.ielts.recordTrash.map(item => `<div class="cet6-material-file"><span>${escapeHtml(item.record.module)} · ${escapeHtml(item.record.date)}</span><button type="button" data-ielts-restore-record="${escapeHtml(String(item.record.id))}">恢复</button></div>`).join('')}</details>`);
    all('[data-review-add]', list).forEach(button => button.addEventListener('click', addReviewDate));
    all('[data-review-toggle]', list).forEach(button => button.addEventListener('click', toggleReview));
    all('[data-record-delete]', list).forEach(button => button.addEventListener('click', deleteExamRecord));
    all('[data-cet6-edit-record]', list).forEach(button => button.addEventListener('click', event => openCet6RecordDialog(state.cet6Records.find(item => String(item.id) === event.currentTarget.dataset.cet6EditRecord))));
    all('[data-cet6-restore-record]', list).forEach(button => button.addEventListener('click', restoreCet6Record));
    all('[data-ielts-restore-record]', list).forEach(button => button.addEventListener('click', restoreIeltsRecord));
    if (exam === 'cet6') renderCet6Reviews();
  }

  function addReviewDate(event) {
    const [exam, idText] = event.currentTarget.dataset.reviewAdd.split(':');
    const record = examRecords(exam).find(item => String(item.id) === idText);
    const input = el(`[data-review-date="${exam}:${idText}"]`);
    if (!record || !input.value) { showToast('请先选择复盘日期'); return; }
    if (record.reviews.some(review => review.date === input.value)) { showToast('该复盘日期已存在'); return; }
    record.reviews.push({ date: input.value, done: false }); saveState(); renderExamRecords(exam); showToast('复盘日期已加入对应考试记录');
  }

  function toggleReview(event) {
    const [exam, idText, indexText] = event.currentTarget.dataset.reviewToggle.split(':');
    const record = examRecords(exam).find(item => String(item.id) === idText);
    if (!record?.reviews[Number(indexText)]) return;
    record.reviews[Number(indexText)].done = !record.reviews[Number(indexText)].done; saveState(); renderExamRecords(exam); showToast('复盘状态已更新');
  }

  function deleteExamRecord(event) {
    const [exam, idText] = event.currentTarget.dataset.recordDelete.split(':');
    if (exam === 'ielts') {
      const index = state.ieltsRecords.findIndex(item => String(item.id) === idText);
      if (index >= 0) { state.ielts ||= {}; state.ielts.recordTrash ||= []; state.ielts.recordTrash.unshift({ record: state.ieltsRecords.splice(index, 1)[0], deletedAt: new Date().toISOString() }); }
    }
    else {
      const index = state.cet6Records.findIndex(item => String(item.id) === idText);
      if (index >= 0) state.cet6RecordTrash.unshift({ record: state.cet6Records.splice(index, 1)[0], deletedAt: new Date().toISOString() });
    }
    saveState(); renderExamRecords(exam); showToast('训练记录已移入30天回收站');
  }

  function restoreIeltsRecord(event) {
    const trash = state.ielts?.recordTrash || [];
    const index = trash.findIndex(item => String(item.record.id) === event.currentTarget.dataset.ieltsRestoreRecord);
    if (index < 0) return;
    state.ieltsRecords.unshift(trash.splice(index, 1)[0].record); saveState(); renderExamRecords('ielts'); showToast('IELTS训练记录已恢复');
  }

  function restoreCet6Record(event) {
    const index = state.cet6RecordTrash.findIndex(item => String(item.record.id) === event.currentTarget.dataset.cet6RestoreRecord);
    if (index < 0) return;
    state.cet6Records.unshift(state.cet6RecordTrash.splice(index, 1)[0].record); saveState(); renderExamRecords('cet6'); showToast('训练记录已恢复');
  }

  function renderCet6Reviews() {
    const root = el('#cet6ReviewList'); if (!root) return;
    const rows = state.cet6Records.flatMap(record => (record.reviews || []).filter(review => !review.done).map((review, index) => ({ record, review, index })));
    setSafeMarkup(root, rows.length ? rows.map(({ record, review, index }) => `<article class="exam-record-row"><div class="record-score"><b>${escapeHtml(record.module)}</b><span>待复盘</span></div><div class="record-main"><strong>${escapeHtml(record.material)}</strong><span>计划日期：${escapeHtml(review.date)}</span></div><div class="record-actions"><button type="button" data-review-toggle="cet6:${escapeHtml(record.id)}:${index}">标记完成</button></div></article>`).join('') : '<div class="empty-state"><strong>暂无待复盘训练</strong><span>训练记录中添加复盘日期后会显示在这里。</span></div>');
    all('[data-review-toggle]', root).forEach(button => button.addEventListener('click', toggleReview));
  }

  function isoToday() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  function isoMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function normalizeReports() {
    if (!state.reports || typeof state.reports !== 'object') state.reports = {};
    if (!['最低', '标准', '冲刺'].includes(state.reports.planLevel)) state.reports.planLevel = '标准';
    if (!Array.isArray(state.reports.history)) state.reports.history = [];
    // Legacy timestamp-only reports are retained for audit, but cannot be reconfirmed
    // because they did not preserve the facts or selected draft at generation time.
    if (!state.reports.weekly && state.reports.weeklyGeneratedAt) {
      state.reports.history.push({ kind: 'weekly-legacy', generatedAt: state.reports.weeklyGeneratedAt, confirmedAt: state.reports.weeklyConfirmedAt || null, migrationNote: '旧版未保存报告快照' });
      state.reports.weeklyGeneratedAt = null; state.reports.weeklyConfirmedAt = null;
    }
    if (!state.reports.monthly && state.reports.monthlyGeneratedAt) {
      state.reports.history.push({ kind: 'monthly-legacy', generatedAt: state.reports.monthlyGeneratedAt, confirmedAt: state.reports.monthlyConfirmedAt || null, migrationNote: '旧版未保存报告快照' });
      state.reports.monthlyGeneratedAt = null; state.reports.monthlyConfirmedAt = null;
    }
    return state.reports;
  }

  function archiveConfirmedReport(report) {
    if (!report?.snapshot || !report.confirmedAt) return;
    const reports = normalizeReports();
    if (!reports.history.some(item => item.snapshot?.id === report.snapshot.id)) reports.history.push(WorkbenchReportCore.snapshot(report));
  }

  function renderReports() {
    const reports = normalizeReports();
    const weekly = reports.weekly;
    const monthly = reports.monthly;
    const currentPeriod = WorkbenchReportCore.weekPeriod(new Date());
    const currentMetrics = WorkbenchReportCore.summarize(state.tasks, currentPeriod);
    const metrics = weekly?.snapshot?.metrics || currentMetrics;
    const done = metrics.done;
    const rate = metrics.rate;
    const evidence = weekly?.snapshot?.evidenceCount || 0;
    el('#weeklyTaskRate').textContent = `${rate}%`;
    el('#weeklyTaskDetail').textContent = `${done} / ${metrics.total}`;
    el('#weeklyEvidenceCount').textContent = evidence;
    el('#weeklyStatus').textContent = weekly?.snapshot?.status || (metrics.total ? (rate >= 80 ? '正常' : rate >= 50 ? '轻度迟缓' : '严重迟缓') : '证据不足');
    all('[data-plan-level]').forEach(button => button.classList.toggle('active', button.dataset.planLevel === state.reports.planLevel));
    if (weekly?.snapshot) {
      setSafeMarkup(el('#weeklyNarrative'), weekly.snapshot.narrative);
      setSafeMarkup(el('#weeklyPlanDraft'), weekly.snapshot.proposedTasks.map((item, index) => `<label><input type="checkbox" checked data-week-plan-item value="${escapeHtml(item.id)}" ${weekly.confirmedAt ? 'disabled' : ''}><span><b>${index + 1}</b>${escapeHtml(item.title)}</span></label>`).join(''));
      el('#confirmWeeklyPlan').disabled = Boolean(weekly.confirmedAt);
      el('#confirmWeeklyPlan').textContent = weekly.confirmedAt ? '已确认写入下周计划' : '确认写入下周计划';
      el('#weeklyConfirmationStatus').textContent = weekly.confirmedAt ? '已确认' : '需确认';
    } else {
      el('#confirmWeeklyPlan').disabled = true;
      el('#weeklyConfirmationStatus').textContent = '需生成';
    }
    if (monthly?.snapshot) {
      setSafeMarkup(el('#monthlyNarrative'), monthly.snapshot.narrative);
      setSafeMarkup(el('#monthlyOutcomes'), monthly.snapshot.proposedOutcomes.map(item => `<label><input type="checkbox" checked data-month-outcome value="${escapeHtml(item.id)}" ${monthly.confirmedAt ? 'disabled' : ''}><span>${escapeHtml(item.title)}</span></label>`).join(''));
      el('#confirmMonthlyButton').disabled = Boolean(monthly.confirmedAt);
      el('#confirmMonthlyButton').textContent = monthly.confirmedAt ? '已确认下月重点' : '确认下月重点';
      el('#monthlyConfirmationStatus').textContent = monthly.confirmedAt ? '已确认' : '需确认';
    } else {
      setSafeMarkup(el('#monthlyOutcomes'), '<p class="muted-note">生成月报草案后显示3至5项下月成果。</p>');
      el('#confirmMonthlyButton').disabled = true;
      el('#monthlyConfirmationStatus').textContent = '需生成';
    }
  }

  function generateWeekly() {
    const reports = normalizeReports();
    archiveConfirmedReport(reports.weekly);
    const now = new Date();
    const period = WorkbenchReportCore.weekPeriod(now);
    const metrics = WorkbenchReportCore.summarize(state.tasks, period);
    const evidenceCount = [...state.library, ...state.ieltsRecords, ...state.cet6Records].filter(item => WorkbenchReportCore.inPeriod(item, period)).length;
    const status = evidenceCount || metrics.total ? (metrics.total ? (metrics.rate >= 80 ? '正常' : metrics.rate >= 50 ? '轻度迟缓' : '严重迟缓') : '证据不足') : '证据不足';
    const plans = state.reports.planLevel === '最低' ? ['完成小论文一个可验证小成果', '完成到期词汇复习', '完成一次CET-6专项'] : state.reports.planLevel === '冲刺' ? ['完成论文变量关系图并形成说明', '完成两次CET-6训练', '推进毕业论文候选方向证据比较'] : ['完成小论文下一里程碑', '完成两次CET-6训练与一次IELTS保温', '整理毕业论文选题证据'];
    const generatedAt = now.toISOString();
    const snapshot = WorkbenchReportCore.snapshot({ id: `week-${period.key}-${Date.now()}`, periodStart: period.start, periodEnd: period.end, metrics, evidenceCount, status, planLevel: state.reports.planLevel, proposedTasks: plans.map((title, index) => ({ id: `plan-${index + 1}`, title, category: /CET|IELTS|词汇/.test(title) ? 'CET-6' : title.includes('毕业') ? '毕业论文' : '科研/小论文', goal: '下周计划', priority: index === 0 ? '高' : '中', estimate: 60, key: index < 3 })), narrative: `<p><strong>统计周期：</strong>${period.start} 至 ${period.end}。</p><p><strong>目标完成：</strong>本周有日期依据的任务完成 ${metrics.done}/${metrics.total} 项，完成率 ${metrics.rate}%。</p><p><strong>证据状态：</strong>本周期检测到 ${evidenceCount} 条资料或考试记录；另有 ${metrics.undated} 项旧任务缺少日期，未计入本周完成率。</p><p><strong>调整建议：</strong>${metrics.total && metrics.rate < 50 ? '先拆小关键任务并减少低价值工作，保留英语和健康最低计划。' : '保持可持续负荷，优先推进下一里程碑。'}</p>` });
    reports.weekly = { periodKey: period.key, generatedAt, confirmedAt: null, snapshot, selectedTaskIds: [], confirmedTaskIds: [] };
    state.reports.weeklyGeneratedAt = generatedAt; state.reports.weeklyConfirmedAt = null;
    saveState(); renderReports(); showToast('已按本周日期范围生成本地事实草案');
  }

  function confirmWeekly() {
    const report = normalizeReports().weekly;
    if (!report?.snapshot || report.confirmedAt) { showToast(report?.confirmedAt ? '该周计划已经确认，不会重复写入' : '请先生成周总结草案'); return; }
    const selected = all('[data-week-plan-item]:checked').map(input => input.value);
    const created = WorkbenchReportCore.nextWeekTasks(report.snapshot, selected, state.tasks, new Date());
    state.tasks.push(...created);
    report.selectedTaskIds = selected; report.confirmedTaskIds = created.map(item => item.id); report.confirmedAt = new Date().toISOString();
    state.reports.weeklyConfirmedAt = report.confirmedAt; saveState(); renderTasks(); renderReview(); renderReports(); showToast(`已确认并写入 ${created.length} 项下周任务`);
  }

  function generateMonthly() {
    const reports = normalizeReports();
    archiveConfirmedReport(reports.monthly);
    const now = new Date(); const period = WorkbenchReportCore.monthPeriod(now); const metrics = WorkbenchReportCore.summarize(state.tasks, period);
    const evidenceCount = [...state.library, ...state.ieltsRecords, ...state.cet6Records].filter(item => WorkbenchReportCore.inPeriod(item, period)).length;
    const outcomes = ['完成小论文当前阶段成果', '建立CET-6完整模考样本', '确定毕业论文候选方向比较表', '维持IELTS每周基础训练'];
    const generatedAt = now.toISOString();
    const snapshot = WorkbenchReportCore.snapshot({ id: `month-${period.key}-${Date.now()}`, periodStart: period.start, periodEnd: period.end, metrics, evidenceCount, proposedOutcomes: outcomes.map((title, index) => ({ id: `outcome-${index + 1}`, title, next: '由周计划拆分下一步' })), narrative: `<p><strong>统计周期：</strong>${period.start} 至 ${period.end}，按实际日期独立分析，不拼接周报。</p><p><strong>整月趋势：</strong>有日期依据的任务 ${metrics.total} 项，完成 ${metrics.done} 项；成果或考试记录 ${evidenceCount} 条。</p><p><strong>证据边界：</strong>${metrics.undated} 项旧任务缺少日期，未归入本月。近三月样本不足时不作虚假趋势判断。</p><p><strong>可持续性：</strong>下月重点由用户选择确认，再进入规划中心；不会自动改动长期目标。</p>` });
    reports.monthly = { periodKey: period.key, generatedAt, confirmedAt: null, snapshot, selectedOutcomeIds: [], confirmedGoalIds: [] };
    state.reports.monthlyGeneratedAt = generatedAt; state.reports.monthlyConfirmedAt = null;
    saveState(); renderReports(); showToast('已按自然月生成本地事实草案');
  }
  function confirmMonthly() {
    const report = normalizeReports().monthly;
    if (!report?.snapshot || report.confirmedAt) { showToast(report?.confirmedAt ? '该月重点已经确认，不会重复写入' : '请先生成月报草案'); return; }
    const selected = all('[data-month-outcome]:checked').map(input => input.value);
    if (selected.length < 3 || selected.length > 5) { showToast('请选择 3 至 5 项下月成果'); return; }
    const created = WorkbenchReportCore.nextMonthGoals(report.snapshot, selected, state.goals, new Date());
    state.goals.push(...created);
    report.selectedOutcomeIds = selected; report.confirmedGoalIds = created.map(item => item.id); report.confirmedAt = new Date().toISOString();
    state.reports.monthlyConfirmedAt = report.confirmedAt; saveState(); renderGoals(); renderReports(); showToast(`已将 ${created.length} 项下月成果写入规划中心`);
  }

  function renderSettings() {
    ensureReviewSettingsUI();
    ensureAiAssistantSettingsUI();
    ensureCompleteSettingsUI();
    all('[data-settings-panel="data"] .setting-row').forEach(row => {
      const label = row.querySelector('strong')?.textContent?.trim();
      if (label === '回收站') row.hidden = true;
    });
    const aiHeading = el('[data-settings-panel="ai"] .ai-setting-header > div');
    if (aiHeading) {
      aiHeading.querySelector('h2').textContent = 'AI 服务配置';
      aiHeading.querySelector('p').textContent = '统一保存服务地址和钥匙串密钥；下方每个模块助手独立选择服务、模型、权限和预算。';
    }
    const recommendationPanel = el('[data-settings-panel="recommendations"]');
    if (recommendationPanel && !document.getElementById('paperSystemRulesNotice')) {
      const notice = document.createElement('div');
      notice.id = 'paperSystemRulesNotice';
      notice.className = 'quality-notice';
      setSafeMarkup(notice, '<strong>论文系统硬规则</strong><span>IEEE、Q2、二区与 MDPI 永久排除；只有 72 种严格白名单期刊可进入正式推荐。规则先于 DeepSeek 执行且不可关闭。</span>');
      recommendationPanel.querySelector('.ai-form-stack')?.before(notice);
    }
    if (!el('#appearanceSetting')) return;
    const assistantTitle = el('.ai-setting-header h2');
    const assistantDescription = el('.ai-setting-header p');
    if (assistantTitle) assistantTitle.textContent = 'AI 服务配置';
    if (assistantDescription) assistantDescription.textContent = '统一保存服务地址和钥匙串密钥；下方每个模块助手独立选择服务、模型、权限和预算。';
    el('#appearanceSetting').value = state.settings.appearance;
    el('#compactSetting').checked = state.compact;
    el('#recommendationTopicsSetting').value = (state.settings.recommendationProfile?.topics || defaultRecommendationProfile.topics).join('\n');
    el('#recommendationExclusionsSetting').value = (state.settings.recommendationProfile?.exclusions || defaultRecommendationProfile.exclusions).join('\n');
    el('#recommendationAiSetting').checked = state.settings.recommendationProfile?.aiEnabled !== false;
    all('[data-news-theme-setting]').forEach(input => { input.checked = (state.settings.newsProfile?.themes || defaultNewsProfile.themes).includes(input.dataset.newsThemeSetting); });
    all('[data-news-tier-setting]').forEach(input => { input.checked = (state.settings.newsProfile?.tiers || defaultNewsProfile.tiers).includes(input.dataset.newsTierSetting); });
    all('[data-news-region-setting]').forEach(input => { input.checked = (state.settings.newsProfile?.regions || defaultNewsProfile.regions).includes(input.dataset.newsRegionSetting); });
    el('#aiProviderSetting').value = state.settings.aiProvider;
    if (!el('#aiProviderSetting').value) {
      state.settings.aiProvider = 'OpenAI兼容API';
      el('#aiProviderSetting').value = state.settings.aiProvider;
      saveState();
    }
    el('#aiProfileSetting').value = state.settings.aiProfile;
    if (!state.settings.aiBaseUrl) state.settings.aiBaseUrl = 'https://www.mhcoding.xyz/';
    if (!state.settings.aiModel) state.settings.aiModel = 'claude-opus-4-6';
    el('#aiBaseUrlSetting').value = state.settings.aiBaseUrl;
    el('#aiModelSetting').value = state.settings.aiModel;
    el('#aiBudgetSetting').value = state.settings.aiBudget;
    const bytes = new TextEncoder().encode(JSON.stringify(state)).length;
    el('#prototypeDataSize').textContent = `当前状态约 ${formatBytes(bytes)}`;
    el('#lastBackupLabel').textContent = state.backupMeta ? new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(state.backupMeta.createdAt)) : '尚未创建';
    el('#backupSizeLabel').textContent = state.backupMeta ? formatBytes(state.backupMeta.bytes) : '0 B';
    el('#cet6SoundSetting').checked = state.settings.cet6Sound;
    el('#cet6SleepSetting').value = state.settings.cet6Sleep;
    renderModuleSettings();
    renderCalendarSettings();
  }

  function ensureCompleteSettingsUI() {
    const dataPanel = el('[data-settings-panel="data"]:not(.recycle-settings-panel)');
    if (dataPanel && !el('#exportPortableDataButton')) { dataPanel.insertAdjacentHTML('beforeend', '<div class="setting-heading subsection-heading"><h3>可移植导出</h3><p>导出可读 JSON，不包含钥匙串密钥、外部文件正文或受版权保护的资料。</p></div><div class="setting-row"><div><strong>工作台结构化数据</strong><span>用于迁移、审计或自行处理</span></div><button class="button" id="exportPortableDataButton" type="button">导出 JSON</button></div>'); el('#exportPortableDataButton').addEventListener('click', exportPortableData); }
    const nav = el('.settings-nav'); const aboutTab = el('[data-settings-tab="about"]');
    if (nav && aboutTab && !el('[data-settings-tab="help"]')) aboutTab.insertAdjacentHTML('beforebegin', '<button type="button" data-settings-tab="help">帮助</button>');
    const content = el('.settings-content');
    if (content && !el('[data-settings-panel="help"]')) {
      const sections = moduleDefinitions.map(module => `<details data-help-entry><summary>${escapeHtml(module.label)}</summary><p>${escapeHtml(module.description)}。本模块数据默认保存在本地 SQLite；文件按“引用原文件或复制到资料库”的选择处理。关闭一级模块不会删除数据。</p></details>`).join('');
      content.insertAdjacentHTML('beforeend', `<section class="settings-panel help-settings-panel" data-settings-panel="help"><div class="setting-heading"><h2>帮助中心</h2><p>离线说明按工作台一级模块整理，不需要联网。</p></div><label class="help-search">搜索帮助<input id="helpSearchInput" type="search" placeholder="输入模块或功能名称"></label><div id="helpEntries" class="help-entries">${sections}<details data-help-entry><summary>数据、密钥与权限</summary><p>数据库和受管文件位置可在“数据与文件”查看。API 密钥只保存在 macOS 钥匙串。通知、麦克风和文件权限仅在使用相关功能时申请。</p></details><details data-help-entry><summary>备份与恢复</summary><p>加密备份包含 SQLite、设置和复制入资料库的文件。恢复前会显示清单并创建当前数据库快照；密码遗失后无法解密。</p></details><details data-help-entry><summary>故障诊断</summary><p>先查看对应设置中的连接状态、文件路径和权限。AI、资讯或论文失败不会删除最近成功数据。反馈问题时请勿上传 API 密钥、健康原始数据或版权文件。</p></details></div><div class="settings-save-row"><span>仍未解决问题</span><button class="button" id="openGithubIssuesButton" type="button">打开 GitHub 反馈</button></div></section>`);
      el('#helpSearchInput').addEventListener('input', event => { const query = event.target.value.trim().toLowerCase(); all('[data-help-entry]', el('#helpEntries')).forEach(entry => { entry.hidden = query && !entry.textContent.toLowerCase().includes(query); }); });
      el('#openGithubIssuesButton').addEventListener('click', () => openConfiguredGithub('issues'));
    }
    const backup = el('[data-settings-panel="backup"]');
    if (backup && !el('#backupStoragePath')) {
      setSafeMarkup(backup, '<div class="setting-heading"><h2>备份与恢复</h2><p>手动创建完整加密包；应用保持打开且本次会话已有密码时可按计划补做。</p></div><div class="setting-row database-location-row"><div><strong>备份位置</strong><span>用户选择的本地文件夹或 iCloud Drive 目录</span></div><code id="backupStoragePath">尚未选择</code></div><div class="database-actions"><button class="button" id="chooseBackupDirectoryButton" type="button">选择备份目录</button><button class="button" id="openBackupFolderButton" type="button">打开目录</button></div><div class="setting-row"><div><strong>备份计划</strong><span>当前版本生成完整加密包；不会保存密码或退化为明文</span></div><select id="backupScheduleSetting"><option value="daily-weekly">每日完整加密包</option><option value="weekly">每周完整加密包</option><option value="manual">仅手动</option></select></div><div class="backup-password-grid"><label>备份密码<input id="backupPasswordInput" type="password" autocomplete="new-password" placeholder="至少8位；不会写入数据库或备份"></label><label>再次输入<input id="backupPasswordConfirm" type="password" autocomplete="new-password"></label></div><div class="backup-status"><div><span>最近备份</span><strong id="lastBackupLabel">尚未创建</strong></div><div><span>加密包大小</span><strong id="backupSizeLabel">0 B</strong></div></div><p id="backupOperationStatus" class="ai-connection-notice neutral">创建备份后，密码仅保留在本次应用会话中用于补做；关闭应用即清除。</p><div class="ai-settings-footer"><button class="button" id="restoreBackupButton" type="button">检查并恢复备份</button><button class="button primary" id="createSnapshotButton" type="button">创建完整加密备份</button></div>');
      el('#chooseBackupDirectoryButton').addEventListener('click', chooseBackupDirectory); el('#openBackupFolderButton').addEventListener('click', openBackupFolder); el('#createSnapshotButton').addEventListener('click', createEncryptedBackup); el('#restoreBackupButton').addEventListener('click', inspectAndRestoreBackup); el('#backupScheduleSetting').addEventListener('change', event => { state.settings.backupSchedule = event.target.value; saveState(); maybeRunBackupCatchUp(); });
    }
    if (backup && el('#backupScheduleSetting')) el('#backupScheduleSetting').value = state.settings.backupSchedule || 'daily-weekly';
    const about = el('[data-settings-panel="about"]');
    if (about && !el('#githubRepoSetting')) { setSafeMarkup(about, '<div class="setting-heading"><h2>关于个人成长工作台</h2><p>本地优先的学习、科研、规划与健康管理桌面应用。</p></div><div class="setting-row"><div><strong>项目与作者</strong><span>个人成长工作台</span></div><b>邱昱</b></div><div class="setting-row"><div><strong>当前版本</strong><span>macOS 桌面预发布版本</span></div><b>0.6.0 (13)</b></div><div class="setting-row"><div><strong>开源许可</strong><span>修改版分发时须按许可证提供对应源码</span></div><b>GPL-3.0-only</b></div><div class="setting-row"><div><strong>技术架构</strong><span>AppKit + WebKit + SQLite + macOS 钥匙串</span></div><b>本地优先</b></div><label class="help-search">GitHub 仓库地址<input id="githubRepoSetting" type="url" placeholder="https://github.com/yuqiu7554/personal-growth-workbench"></label><p id="updateCheckStatus" class="ai-connection-notice neutral">尚未配置更新源</p><div class="ai-settings-footer"><button class="button" id="openLicensesButton" type="button">开源许可与第三方声明</button><button class="button" id="checkUpdatesButton" type="button">检查更新</button><button class="button primary" id="saveAboutSettingsButton" type="button">保存关于设置</button></div>');
      el('#saveAboutSettingsButton').addEventListener('click', saveAboutSettings); el('#checkUpdatesButton').addEventListener('click', checkForUpdates); el('#openLicensesButton').addEventListener('click', () => window.alert('第三方资源、来源、许可和替换边界记录在应用源码的 OPEN_SOURCE_RESOURCES.md。正式发布包将附带 THIRD_PARTY_NOTICES.md。'));
    }
    if (el('#githubRepoSetting')) el('#githubRepoSetting').value = state.settings.githubRepository || '';
    if (el('#updateCheckStatus')) el('#updateCheckStatus').textContent = state.settings.githubRepository ? '更新源已配置，可手动检查' : '尚未配置更新源';
  }
  async function exportPortableData() { try { const result = await callNative('exportWorkbenchData', { state }); showToast(`数据已导出：${result.path}`); } catch (error) { if (error.message !== 'cancelled') showToast('导出失败，原数据未改变'); } }

  async function chooseBackupDirectory() { try { const result = await callNative('chooseBackupDirectory'); el('#backupStoragePath').textContent = result.path; showToast('备份目录已保存'); } catch (error) { if (error.message !== 'cancelled') showToast('无法选择备份目录'); } }
  async function refreshBackupInfo() { try { const result = await callNative('getBackupInfo'); if (el('#backupStoragePath')) el('#backupStoragePath').textContent = result.path || '尚未选择'; } catch (_) {} }
  async function openBackupFolder() { const path = el('#backupStoragePath').textContent; if (!path || path === '尚未选择') { showToast('请先选择备份目录'); return; } try { await callNative('openLocalFolder', { path }); } catch (_) { showToast('无法打开备份目录'); } }
  async function createEncryptedBackup() { const password = el('#backupPasswordInput').value; const confirmPassword = el('#backupPasswordConfirm').value; const status = el('#backupOperationStatus'); if (password.length < 8 || password !== confirmPassword) { status.textContent = '密码至少8位，且两次输入必须一致'; return; } const button = el('#createSnapshotButton'); button.disabled = true; status.textContent = '正在创建 SQLite 快照、整理受管文件并加密…'; try { const result = await callNative('createEncryptedBackup', { password }); sessionBackupPassword = password; state.backupMeta = { createdAt: result.createdAt, bytes: result.bytes, kind: 'encrypted-full', path: result.path }; saveState(); el('#lastBackupLabel').textContent = new Date(result.createdAt).toLocaleString('zh-CN'); el('#backupSizeLabel').textContent = formatBytes(result.bytes); status.textContent = `备份已完成：${result.path}`; el('#backupPasswordInput').value = ''; el('#backupPasswordConfirm').value = ''; showToast('完整加密备份已创建'); } catch (error) { status.textContent = `备份失败：${error.detail || error.message}`; } finally { button.disabled = false; } }
  let backupCatchUpRunning = false;
  async function maybeRunBackupCatchUp() { const schedule = state.settings.backupSchedule || 'daily-weekly'; if (schedule === 'manual' || backupCatchUpRunning || !sessionBackupPassword || !state.backupMeta?.createdAt) return; const interval = schedule === 'weekly' ? 7 * 86400000 : 86400000; if (Date.now() - new Date(state.backupMeta.createdAt).getTime() < interval) return; backupCatchUpRunning = true; try { const result = await callNative('createEncryptedBackup', { password: sessionBackupPassword }); state.backupMeta = { createdAt: result.createdAt, bytes: result.bytes, kind: 'encrypted-full-auto', path: result.path }; saveState(); if (el('#lastBackupLabel')) el('#lastBackupLabel').textContent = new Date(result.createdAt).toLocaleString('zh-CN'); if (el('#backupSizeLabel')) el('#backupSizeLabel').textContent = formatBytes(result.bytes); if (el('#backupOperationStatus')) el('#backupOperationStatus').textContent = '已按计划补做完整加密备份'; } catch (error) { if (el('#backupOperationStatus')) el('#backupOperationStatus').textContent = `自动补做失败：${error.detail || error.message}`; } finally { backupCatchUpRunning = false; } }
  async function inspectAndRestoreBackup() { const password = el('#backupPasswordInput').value; const status = el('#backupOperationStatus'); if (password.length < 8) { status.textContent = '请在备份密码框输入该备份的密码'; return; } try { status.textContent = '正在解密并校验备份清单…'; const result = await callNative('inspectEncryptedBackup', { password }); const manifest = result.manifest; const managedCount = Array.isArray(manifest.managedFiles) ? manifest.managedFiles.length : 0; if (!window.confirm(`备份时间：${manifest.createdAt}\n应用版本：${manifest.appVersion}\n受管文件目录：${managedCount}\n\n恢复将覆盖当前 SQLite 数据，并把受管资料安全合并到当前目录；同名现有文件不会被覆盖。系统会先创建当前数据库快照，是否继续？`)) { status.textContent = '已取消恢复，当前数据未改变'; return; } const restored = await callNative('applyInspectedBackup'); normalizeHydratedState(restored.state); saveState(); renderAllViews(); status.textContent = '恢复完成；SQLite 已恢复，受管资料已安全合并'; showToast('数据库与受管资料恢复完成'); } catch (error) { if (error.message !== 'cancelled') status.textContent = `恢复失败：${error.detail || error.message}`; } }
  function saveAboutSettings() { const value = el('#githubRepoSetting').value.trim(); if (value && !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(value)) { el('#updateCheckStatus').textContent = '请输入标准 GitHub 仓库地址'; return; } state.settings.githubRepository = value.replace(/\/$/, ''); saveState(); el('#updateCheckStatus').textContent = value ? '更新源已保存' : '尚未配置更新源'; showToast('关于与更新设置已保存'); }
  async function checkForUpdates() { const repo = state.settings.githubRepository; if (!repo) { el('#updateCheckStatus').textContent = '尚未配置更新源，不会执行无效检查'; return; } const slug = repo.replace('https://github.com/', ''); el('#updateCheckStatus').textContent = '正在检查 GitHub Releases…'; try { const result = await callNative('checkGithubRelease', { repository: slug }); el('#updateCheckStatus').textContent = result.tag ? `最新版本：${result.tag}${result.url ? '，可在浏览器查看' : ''}` : '仓库尚无正式 Release'; if (result.url) el('#updateCheckStatus').dataset.releaseUrl = result.url; } catch (error) { el('#updateCheckStatus').textContent = `检查失败：${error.detail || error.message}`; } }
  function openConfiguredGithub(kind) { const repo = state.settings.githubRepository; if (!repo) { showToast('请先在“关于”中配置 GitHub 仓库地址'); return; } callNative('openExternalURL', { url: `${repo}/${kind}` }).catch(() => showToast('无法打开 GitHub')); }

  function ensureAiAssistantSettingsUI() {
    const panel = el('[data-settings-panel="ai"]'); if (!panel) return;
    const heading = panel.querySelector('.ai-setting-header h2'); const description = panel.querySelector('.ai-setting-header p');
    if (heading) heading.textContent = 'AI 服务配置'; if (description) description.textContent = '统一保存服务地址和钥匙串密钥；各模块助手只引用服务，不重复保存密钥。';
    if (!el('#aiServiceSectionLabel')) {
      panel.querySelector('.ai-setting-header')?.insertAdjacentHTML('beforebegin', '<div id="aiServiceSectionLabel" class="settings-section-divider"><span>01</span><div><strong>服务配置</strong><small>密钥只在此处保存一次</small></div></div>');
      panel.querySelector('.ai-setting-header')?.insertAdjacentHTML('beforebegin', '<div class="setting-row"><div><strong>选择服务配置</strong><span>切换后可编辑地址、模型或钥匙串密钥</span></div><div class="setting-inline-actions"><select id="aiServiceProfileChooser"></select><button class="button" id="newAiServiceProfile" type="button">新增服务</button></div></div>');
      panel.querySelector('.ai-setting-header')?.insertAdjacentHTML('afterend', '<div class="ai-compact-row ai-price-settings"><label>输入单价（元/百万 Token）<input id="aiInputPriceSetting" type="number" min="0" step="0.0001" value="0"></label><label>输出单价（元/百万 Token）<input id="aiOutputPriceSetting" type="number" min="0" step="0.0001" value="0"></label></div><p class="muted-note">单价由用户按供应商账单填写；未配置时只记录 Token，不计算或猜测费用。</p>');
      panel.insertAdjacentHTML('beforeend', '<div class="settings-section-divider"><span>02</span><div><strong>模块助手</strong><small>每个助手独立选择服务、模型、预算和权限</small></div></div><div class="setting-row"><div><strong>AI 全局月度预算（元）</strong><span>所有助手合计达到上限后暂停；0 表示不设置</span></div><input id="aiGlobalBudgetSetting" type="number" min="0" step="1"></div><div id="aiAssistantSettings" class="ai-assistant-settings"></div><div class="settings-save-row"><span id="aiAssistantsStatus" class="muted-note">各助手设置互相独立</span><button class="button primary" id="saveAiAssistantsButton" type="button">保存全部助手设置</button></div>');
      el('#saveAiAssistantsButton').addEventListener('click', saveAiAssistantsSettings);
      el('#aiServiceProfileChooser').addEventListener('change', event => loadAiServiceProfile(event.target.value));
      el('#newAiServiceProfile').addEventListener('click', () => { el('#aiProfileSetting').value = ''; el('#aiProviderSetting').value = 'OpenAI兼容API'; el('#aiBaseUrlSetting').value = ''; el('#aiModelSetting').value = ''; el('#aiInputPriceSetting').value = 0; el('#aiOutputPriceSetting').value = 0; el('#aiKeySetting').value = ''; setAiConnectionStatus('填写新服务配置后保存；配置名称只能使用字母、数字、点、下划线或连字符'); el('#aiProfileSetting').focus(); });
      el('#aiAssistantSettings').addEventListener('click', event => { const button = event.target.closest('[data-test-assistant]'); if (button) testAiAssistant(button.dataset.testAssistant, button); });
      el('#aiAssistantSettings').addEventListener('change', event => { const select = event.target.closest('[data-assistant-profile]'); if (!select) return; const profile = state.settings.aiProfiles[select.value]; const section = select.closest('.ai-assistant-setting'); const readOnly = all('input[readonly]', section); if (readOnly[0]) readOnly[0].value = profile?.provider || ''; if (readOnly[1]) readOnly[1].value = profile?.baseUrl || ''; if (readOnly[2]) readOnly[2].value = `引用“${profile?.name || profile?.id || ''}”的 macOS 钥匙串密钥`; });
    }
    el('#aiGlobalBudgetSetting').value = state.settings.aiGlobalBudget || 0;
    setSafeMarkup(el('#aiServiceProfileChooser'), Object.values(state.settings.aiProfiles).map(profile => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.name || profile.id)}</option>`).join('')); el('#aiServiceProfileChooser').value = state.settings.aiProfile;
    const activeServiceProfile = state.settings.aiProfiles[state.settings.aiProfile]; el('#aiInputPriceSetting').value = activeServiceProfile?.inputPricePerMillion || 0; el('#aiOutputPriceSetting').value = activeServiceProfile?.outputPricePerMillion || 0;
    const profileOptions = Object.values(state.settings.aiProfiles).map(profile => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.name || profile.id)} · ${escapeHtml(profile.provider)}</option>`).join('');
    setSafeMarkup(el('#aiAssistantSettings'), WorkbenchSettingsCore.ASSISTANTS.map(def => { const config = state.settings.aiAssistants[def.id]; const profile = state.settings.aiProfiles[config.profileId] || Object.values(state.settings.aiProfiles)[0]; const usage = `${Math.round(Number(config.inputTokens || 0) + Number(config.outputTokens || 0)).toLocaleString('zh-CN')} Token · ${profile?.inputPricePerMillion > 0 || profile?.outputPricePerMillion > 0 ? `约 ${Number(config.spent || 0).toFixed(4)} 元` : '费用未知'}`; return `<section class="ai-assistant-setting" data-assistant-section="${def.id}"><header><div><h3>${escapeHtml(def.name)}</h3><p>${escapeHtml(def.scope)}</p></div><input type="checkbox" role="switch" data-assistant-enabled="${def.id}" ${config.enabled ? 'checked' : ''}></header><div class="assistant-config-grid"><label>服务配置<select data-assistant-profile="${def.id}">${profileOptions}</select></label><label>API 服务<input value="${escapeHtml(profile?.provider || '')}" readonly></label><label class="wide">Base URL<input value="${escapeHtml(profile?.baseUrl || '')}" readonly></label><label class="wide">API Key<input value="引用“${escapeHtml(profile?.name || profile?.id || '')}”的 macOS 钥匙串密钥" readonly></label><label>Model ID<input data-assistant-model="${def.id}" value="${escapeHtml(config.model || profile?.defaultModel || '')}"></label><label>本月预算（元）<input data-assistant-budget="${def.id}" type="number" min="0" step="1" value="${Number(config.budget || 0)}"></label></div><div class="assistant-setting-footer"><label><input type="checkbox" data-assistant-preview="${def.id}" ${config.preview ? 'checked' : ''}> 调用前预览</label><span>${usage}</span><span data-assistant-key-status="${def.id}">钥匙串状态待测试</span><button class="button" data-test-assistant="${def.id}" type="button">测试连接</button></div></section>`; }).join(''));
    WorkbenchSettingsCore.ASSISTANTS.forEach(def => { const select = el(`[data-assistant-profile="${def.id}"]`); if (select) select.value = state.settings.aiAssistants[def.id].profileId; });
  }

  function loadAiServiceProfile(id) { const profile = state.settings.aiProfiles[id]; if (!profile) return; state.settings.aiProfile = id; state.settings.aiProvider = profile.provider; state.settings.aiBaseUrl = profile.baseUrl; state.settings.aiModel = profile.defaultModel; el('#aiProfileSetting').value = id; el('#aiProviderSetting').value = profile.provider; el('#aiBaseUrlSetting').value = profile.baseUrl; el('#aiModelSetting').value = profile.defaultModel; el('#aiInputPriceSetting').value = profile.inputPricePerMillion || 0; el('#aiOutputPriceSetting').value = profile.outputPricePerMillion || 0; el('#aiKeySetting').value = ''; aiSettingsDirty = false; refreshAiKeyStatus(); setAiConnectionStatus('已加载服务配置，可修改后保存', 'neutral'); }

  function saveAiAssistantsSettings() {
    state.settings.aiGlobalBudget = Math.max(0, Number(el('#aiGlobalBudgetSetting').value || 0));
    WorkbenchSettingsCore.ASSISTANTS.forEach(def => { const config = state.settings.aiAssistants[def.id]; config.profileId = el(`[data-assistant-profile="${def.id}"]`).value; config.model = el(`[data-assistant-model="${def.id}"]`).value.trim(); config.budget = Math.max(0, Number(el(`[data-assistant-budget="${def.id}"]`).value || 0)); config.enabled = el(`[data-assistant-enabled="${def.id}"]`).checked; config.preview = el(`[data-assistant-preview="${def.id}"]`).checked; });
    saveState(); renderAiModelControls(); el('#aiAssistantsStatus').textContent = '全部助手设置已保存'; showToast('AI 服务引用和模块助手设置已保存');
  }

  async function testAiAssistant(id, button) {
    saveAiAssistantsSettings(); const config = aiConfig(id); const status = el(`[data-assistant-key-status="${id}"]`); button.disabled = true; status.textContent = '正在检查钥匙串和模型…';
    try { const key = await callNative('getAiKeyStatus', { account: config.account }); if (!key.configured) throw new Error('key_not_found'); const result = await callNative('testAiConnection', { account: config.account, provider: config.provider, baseUrl: config.baseUrl, model: config.model }); status.textContent = result.modelVerified ? '密钥与模型均可用' : '服务可连接，但模型未核验'; }
    catch (error) { status.textContent = error.message === 'key_not_found' ? '引用的钥匙串密钥不存在' : `测试失败：${error.message}`; } finally { button.disabled = false; }
  }

  function ensureReviewSettingsUI() {
    const general = el('[data-settings-panel="general"]');
    if (general && !el('#menstrualTrackingSetting')) {
      general.insertAdjacentHTML('beforeend', '<div class="setting-heading subsection-heading"><h3>运动健康</h3><p>按需显示敏感健康记录功能。</p></div><div class="setting-row"><div><strong>月经记录</strong><span>关闭后隐藏周期入口、日历、预测和提醒，已有本地数据保留</span></div><input id="menstrualTrackingSetting" type="checkbox" role="switch"></div>');
      el('#menstrualTrackingSetting').addEventListener('change', event => { state.settings.menstrualTrackingEnabled = event.target.checked; saveState(); renderHealth(); showToast(event.target.checked ? '月经记录功能已开启' : '月经记录功能已隐藏，数据仍保留'); });
    }
    if (el('#menstrualTrackingSetting')) el('#menstrualTrackingSetting').checked = state.settings.menstrualTrackingEnabled;
    const panel = el('[data-settings-panel="notifications"]'); const tab = el('[data-settings-tab="notifications"]'); if (tab) tab.textContent = '声音和通知';
    if (panel && !el('#notificationSettingsRoot')) {
      setSafeMarkup(panel, `<div id="notificationSettingsRoot"><div class="setting-heading"><h2>声音和通知</h2><p>首次开启提醒时再请求 macOS 权限；锁屏仅显示中性文案。</p></div><div class="setting-row"><div><strong>系统通知权限</strong><span id="notificationPermissionStatus">尚未检查</span></div><div class="setting-inline-actions"><button class="button" id="openNotificationSettings" type="button">打开系统设置</button><button class="button primary" id="requestNotificationPermission" type="button">开启通知</button></div></div><div class="setting-row"><div><strong>默认提醒音</strong><span>各类提醒可跟随、单独选择或静音</span></div><div class="setting-inline-actions"><select id="globalNotificationSound"><option>Glass</option><option>Ping</option><option>Pop</option><option>Submarine</option><option>Tink</option><option value="silent">关闭声音</option></select><button class="button" id="previewNotificationSound" type="button">试听</button></div></div><div id="notificationCategorySettings"></div><div class="setting-heading subsection-heading"><h3>每日复盘提醒</h3><p>默认22:30，可分别设置星期；通知支持打开复盘、15分钟后提醒和今日跳过。</p></div><div id="reviewWeekdaySettings" class="notification-weekdays"></div><div class="settings-save-row"><span id="notificationSaveStatus" class="muted-note">更改后点击保存</span><button class="button primary" id="saveNotificationSettings" type="button">保存声音和通知</button></div></div>`);
      const categories = [['review','每日复盘'],['tasks','任务截止'],['words','单词复习'],['exams','考试训练'],['hydration','饮水'],['health','健康记录'],['recommendations','资讯与论文更新']];
      setSafeMarkup(el('#notificationCategorySettings'), categories.map(([key,label]) => `<div class="setting-row"><div><strong>${escapeHtml(label)}</strong><span>可单独静音或选择声音</span></div><div class="setting-inline-actions"><input type="checkbox" role="switch" data-notification-enabled="${escapeHtml(key)}"><select data-notification-sound="${escapeHtml(key)}"><option value="global">跟随默认</option><option>Glass</option><option>Ping</option><option>Pop</option><option>Submarine</option><option>Tink</option><option value="silent">静音</option></select></div></div>`).join(''));
      el('#notificationCategorySettings').insertAdjacentHTML('afterend', '<div class="setting-heading subsection-heading"><h3>CET-6 训练</h3><p>训练计时提示与电脑休眠行为。</p></div><div class="setting-row"><div><strong>训练提示音</strong><span>计时结束、模块切换和提前5分钟提醒</span></div><div class="setting-inline-actions"><button class="button" id="testCet6SoundButton" type="button">测试提示音</button><input id="cet6SoundSetting" type="checkbox" checked role="switch"></div></div><div class="setting-row"><div><strong>电脑休眠</strong><span>使用工作台音频时始终暂停</span></div><select id="cet6SleepSetting"><option value="pause">暂停计时</option><option value="continue">外部音频或无音频时继续计时</option></select></div>');
      setSafeMarkup(el('#reviewWeekdaySettings'), ['周日','周一','周二','周三','周四','周五','周六'].map((label,day) => `<label>${label}<input type="time" data-review-reminder-day="${day}" value="22:30"></label>`).join(''));
      el('#requestNotificationPermission').addEventListener('click', requestNotificationPermission); el('#openNotificationSettings').addEventListener('click', () => callNative('openNotificationSystemSettings').catch(() => showToast('请在系统设置中打开通知权限')));
      el('#previewNotificationSound').addEventListener('click', () => callNative('previewNotificationSound', { sound: el('#globalNotificationSound').value }).catch(() => showToast('当前环境无法试听系统声音')));
      el('#saveNotificationSettings').addEventListener('click', saveNotificationSettings);
    }
    const config = state.settings.notificationSettings; if (!config || !el('#globalNotificationSound')) return;
    el('#globalNotificationSound').value = config.globalSound;
    all('[data-notification-enabled]').forEach(input => { input.checked = config.categories[input.dataset.notificationEnabled]?.enabled !== false; });
    all('[data-notification-sound]').forEach(select => { select.value = config.categories[select.dataset.notificationSound]?.sound || 'global'; });
    all('[data-review-reminder-day]').forEach(input => { input.value = config.reviewByWeekday[input.dataset.reviewReminderDay] || '22:30'; });
    callNative('getNotificationStatus').then(result => { if (el('#notificationPermissionStatus')) el('#notificationPermissionStatus').textContent = result.statusLabel || result.status; }).catch(() => {});
  }

  async function requestNotificationPermission() { if (!window.confirm('工作台只会按你启用的类别发送提醒。是否现在请求 macOS 通知权限？')) return; try { const result = await callNative('requestNotificationPermission'); el('#notificationPermissionStatus').textContent = result.granted ? '已允许' : '未允许，可前往系统设置修改'; } catch (_) { showToast('通知权限请求失败'); } }
  async function saveNotificationSettings() { const config = state.settings.notificationSettings; config.globalSound = el('#globalNotificationSound').value; all('[data-notification-enabled]').forEach(input => { config.categories[input.dataset.notificationEnabled].enabled = input.checked; }); all('[data-notification-sound]').forEach(select => { config.categories[select.dataset.notificationSound].sound = select.value; }); all('[data-review-reminder-day]').forEach(input => { config.reviewByWeekday[input.dataset.reviewReminderDay] = input.value; }); saveState(); try { await callNative('scheduleReviewReminders', { settings: config }); el('#notificationSaveStatus').textContent = '已保存并更新系统提醒'; } catch (_) { el('#notificationSaveStatus').textContent = '已保存；桌面通知将在原生应用中生效'; } showToast('声音和通知设置已保存'); }

  function saveRecommendationSettings() {
    const topics = el('#recommendationTopicsSetting').value.split(/\n|；|;/).map(value => value.trim()).filter(Boolean);
    const exclusions = el('#recommendationExclusionsSetting').value.split(/\n|；|;/).map(value => value.trim()).filter(Boolean);
    if (!topics.length) { el('#recommendationSettingsStatus').textContent = '至少保留一个关注主题'; return; }
    const themes = all('[data-news-theme-setting]:checked').map(input => input.dataset.newsThemeSetting);
    const tiers = all('[data-news-tier-setting]:checked').map(input => input.dataset.newsTierSetting);
    const regions = all('[data-news-region-setting]:checked').map(input => input.dataset.newsRegionSetting);
    if (!themes.length || !tiers.length || !regions.length) { el('#recommendationSettingsStatus').textContent = '热点主题、来源层级和地域各至少保留一项'; return; }
    state.settings.recommendationProfile = { topics, exclusions, aiEnabled: el('#recommendationAiSetting').checked };
    state.settings.newsProfile = { themes, tiers, regions };
    saveState(); el('#recommendationSettingsStatus').textContent = '已保存，下次同步生效'; showToast('推荐偏好已保存');
  }

  function setDatabaseStatus(message, tone = '') {
    const status = el('#databaseStorageStatus');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('success-text', tone === 'success');
    status.classList.toggle('error-text', tone === 'error');
  }

  async function refreshDatabaseInfo() {
    try {
      const info = await callNative('getDatabaseInfo');
      el('#databasePathLabel').textContent = info.path;
      setDatabaseStatus(`${info.engine} · Schema ${info.schemaVersion}${info.exists ? ' · 已创建' : ' · 等待首次写入'}`, 'success');
      return info;
    } catch (error) {
      el('#databasePathLabel').textContent = '当前运行环境不支持原生数据库';
      setDatabaseStatus(error.message === 'desktop_bridge_unavailable' ? '网页预览继续使用临时本地存储' : '数据库状态读取失败', 'error');
      return null;
    }
  }

  function normalizeHydratedState(stored) {
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return;
    const settingsDefaults = { ...state.settings };
    Object.assign(state, stored);
    state.settings = { ...settingsDefaults, ...(stored.settings || {}) };
    state.reviews = WorkbenchReviewCore.normalize(stored.reviews, stored.review);
    state.settings.menstrualTrackingEnabled = state.settings.menstrualTrackingEnabled !== false;
    state.settings.notificationSettings = state.settings.notificationSettings || settingsDefaults.notificationSettings;
    applyAiSettingsModel();
    if (!Array.isArray(state.aiChats)) state.aiChats = [];
    if (!Array.isArray(state.goals)) state.goals = initialGoals.map(goal => ({ ...goal }));
    if (!Array.isArray(state.words)) state.words = [];
    if (!Array.isArray(state.wordTrash)) state.wordTrash = [];
    if (!Array.isArray(state.wordMeaningHistory)) state.wordMeaningHistory = [];
    if (!Array.isArray(state.ieltsRecords)) state.ieltsRecords = [];
    if (!Array.isArray(state.cet6Records)) state.cet6Records = [];
    if (!Array.isArray(state.cet6Materials)) state.cet6Materials = [];
    if (!Array.isArray(state.cet6Trash)) state.cet6Trash = [];
    if (!Array.isArray(state.cet6RecordTrash)) state.cet6RecordTrash = [];
    if (!state.cet6Training || typeof state.cet6Training !== 'object') state.cet6Training = { active: null, pendingRecord: null };
    if (!Array.isArray(state.paperHistory)) state.paperHistory = [];
    if (!Array.isArray(state.newsRecommendations)) state.newsRecommendations = [];
    if (!Array.isArray(state.paperRecommendations)) state.paperRecommendations = [];
    if (!state.recommendationSync || typeof state.recommendationSync !== 'object') state.recommendationSync = {};
    news = state.newsRecommendations.filter(item => !item.sample);
    paperRecommendations = state.paperRecommendations;
    applyCurrentPaperWhitelist();
    if (!Array.isArray(state.recycleBin)) state.recycleBin = [];
    if (!Array.isArray(state.cyclePeriods)) state.cyclePeriods = [];
    if (!Array.isArray(state.cyclePeriodTrash)) state.cyclePeriodTrash = [];
    if (!state.healthCalendarMonth) state.healthCalendarMonth = isoMonthKey(new Date());
    state.libraryFolders = WorkbenchLibraryCore.normalizeFolders(state.libraryFolders);
    if (!Array.isArray(state.calendarItems)) state.calendarItems = [];
    if (!Array.isArray(state.settings.calendarPeriods)) state.settings.calendarPeriods = [];
    if (typeof state.settings.timetableEnabled !== 'boolean') state.settings.timetableEnabled = false;
    if (!['week', 'month'].includes(state.settings.calendarView)) state.settings.calendarView = 'week';
    if (!['work', 'timetable'].includes(state.settings.calendarMode)) state.settings.calendarMode = 'work';
    if (!state.settings.timetable || typeof state.settings.timetable !== 'object') state.settings.timetable = {};
    if (!Array.isArray(state.settings.timetable.coursePeriods)) state.settings.timetable.coursePeriods = [];
    if (!Array.isArray(state.settings.timetable.courses)) state.settings.timetable.courses = [];
    if (typeof state.settings.cet6Sound !== 'boolean') state.settings.cet6Sound = true;
    if (!['pause', 'continue'].includes(state.settings.cet6Sleep)) state.settings.cet6Sleep = 'pause';
    ensureModulePreferences();
    normalizeReports();
  }

  async function initializeDatabase() {
    const info = await refreshDatabaseInfo();
    if (!info) return;
    try {
      const result = await callNative('loadWorkbenchState');
      if (result.state) normalizeHydratedState(result.state);
      databaseReady = true;
      if (!result.state) await callNative('saveWorkbenchState', { state });
      localStorage.removeItem('growth-workbench-prototype');
      renderAllViews();
      await purgeExpiredRecycleBin();
      await purgeExpiredCet6Trash();
      await refreshDatabaseInfo();
      runRecommendationCatchUp();
      openModuleSetupIfNeeded();
    } catch (error) {
      databaseReady = false;
      setDatabaseStatus(`数据库初始化失败，暂用本地缓存：${error.detail || error.message}`, 'error');
    }
  }

  async function changeDatabaseLocation() {
    const button = el('#changeDatabaseLocationButton');
    button.disabled = true;
    button.textContent = '等待选择…';
    try {
      const result = await callNative('chooseDatabaseDirectory');
      el('#databasePathLabel').textContent = result.path;
      setDatabaseStatus('迁移成功，旧数据库已保留', 'success');
      showToast('SQLite 数据库已迁移到新位置');
    } catch (error) {
      if (error.message !== 'operation_cancelled') showToast(error.detail || '数据库迁移失败');
    } finally {
      button.disabled = false;
      button.textContent = '迁移数据库位置';
    }
  }

  async function openDatabaseFolder() {
    try { await callNative('openDatabaseFolder'); }
    catch (_) { showToast('无法打开数据库所在文件夹'); }
  }

  async function refreshLibraryStorageInfo() {
    const label = el('#libraryStoragePathLabel');
    const status = el('#libraryStorageStatus');
    try {
      const result = await callNative('getLibraryStorageInfo');
      label.textContent = result.path;
      status.textContent = '本地目录 · 新导入文件使用此位置';
    } catch (_) {
      label.textContent = '仅桌面版支持配置';
      status.textContent = '网页预览不会复制文件';
    }
  }

  async function changeLibraryStorage() {
    const button = el('#changeLibraryStorageButton');
    button.disabled = true; button.textContent = '等待选择…';
    try {
      const migrate = window.confirm('是否把现有受管资料复制并校验到新位置？\n“确定”迁移现有文件；“取消”只影响以后导入。外部引用文件始终不会移动。');
      const result = await callNative('chooseLibraryStorageDirectory', { migrate });
      const pathMap = result.pathMap || {};
      const replacePaths = value => {
        if (Array.isArray(value)) return value.forEach(replacePaths);
        if (!value || typeof value !== 'object') return;
        Object.keys(value).forEach(key => { if (typeof value[key] === 'string' && pathMap[value[key]]) value[key] = pathMap[value[key]]; else replacePaths(value[key]); });
      };
      if (migrate) { replacePaths(state.library); replacePaths(state.research); saveState(); renderLibrary(); renderResearch(); }
      el('#libraryStoragePathLabel').textContent = result.path;
      el('#libraryStorageStatus').textContent = migrate ? '本地目录 · 受管文件已复制校验' : '本地目录 · 新导入文件使用此位置';
      showToast(migrate ? '资料库已迁移，旧文件保留为安全副本' : '存储位置已更新，已有文件未移动');
    } catch (error) {
      if (!['cancelled', 'operation_cancelled'].includes(error.message)) showToast('无法更改资料库存储位置');
    } finally { button.disabled = false; button.textContent = '更改资料库存储位置'; }
  }

  async function refreshApplicationIconStatus() {
    try {
      const result = await callNative('getApplicationIconStatus');
      el('#applicationIconStatus').textContent = result.configured ? '已使用自定义图片' : '使用应用默认图标';
      el('#resetApplicationIconButton').disabled = !result.configured;
    } catch (_) {
      el('#applicationIconStatus').textContent = '仅桌面版支持更改图标';
      el('#resetApplicationIconButton').disabled = true;
    }
  }

  async function chooseApplicationIcon() {
    try {
      await callNative('chooseApplicationIcon');
      await refreshApplicationIconStatus();
      showToast('桌面与 Dock 图标已更新；Finder 可能需要数秒刷新');
    } catch (error) {
      if (error.message !== 'cancelled') showToast('无法应用该图片，请选择有效的常见图片格式');
    }
  }

  async function resetApplicationIcon() {
    try {
      await callNative('resetApplicationIcon');
      await refreshApplicationIconStatus();
      showToast('已恢复默认应用图标');
    } catch (_) { showToast('恢复默认图标失败'); }
  }

  let nativeRequestSequence = 0;
  let aiSettingsDirty = false;
  let latestYoudaoResult = null;
  let sessionBackupPassword = '';
  const nativeRequests = new Map();

  function callNative(action, payload = {}) {
    const handler = window.webkit?.messageHandlers?.workbench;
    if (!handler) return Promise.reject(new Error('desktop_bridge_unavailable'));
    const requestId = `native-${Date.now()}-${++nativeRequestSequence}`;
    return new Promise((resolve, reject) => {
      nativeRequests.set(requestId, { resolve: result => { if (action === 'sendAiChat') recordAiUsage(payload, result); resolve(result); }, reject });
      handler.postMessage({ action, requestId, ...payload });
      setTimeout(() => {
        if (!nativeRequests.has(requestId)) return;
        nativeRequests.delete(requestId);
        reject(new Error('desktop_bridge_timeout'));
      }, action === 'sendAiChat' ? 60000 : (['createEncryptedBackup', 'inspectEncryptedBackup', 'applyInspectedBackup', 'importCet6Asset', 'chooseCet6MaterialFolder', 'chooseResearchFiles', 'chooseResearchFolder', 'importResearchAsset', 'chooseLibraryFiles', 'chooseLibraryFolder', 'importLibraryAsset', 'chooseAndExtractResearchText'].includes(action) ? 60000 : (['lookupYoudao', 'fetchRecommendationSource'].includes(action) ? 35000 : (['testAiConnection', 'testYoudaoConnection'].includes(action) ? 20000 : 8000))));
    });
  }

  window.workbenchNativeResult = result => {
    const pending = nativeRequests.get(result?.requestId);
    if (!pending) return;
    nativeRequests.delete(result.requestId);
    if (result.ok) pending.resolve(result);
    else {
      const error = new Error(result.error || 'native_operation_failed');
      error.status = result.status;
      error.detail = result.detail;
      pending.reject(error);
    }
  };

  function setAiKeyStatus(configured, message, persistence = '') {
    el('#aiKeyStatus').textContent = configured ? (persistence === 'session' ? '密钥仅本次会话可用' : '密钥已保存到钥匙串') : '密钥未配置';
    el('#aiKeyStatus').classList.toggle('warning', !configured);
    el('#aiDesktopHint').textContent = message;
    el('#deleteAiKeyButton').disabled = !configured;
  }

  function setAiConnectionStatus(message, tone = '') {
    const status = el('#aiConnectionStatus');
    status.textContent = message;
    status.classList.toggle('success', tone === 'success');
    status.classList.toggle('neutral', tone === 'neutral');
  }

  function markAiSettingsDirty() {
    aiSettingsDirty = true;
    setAiConnectionStatus('设置已修改，请先在底部保存 AI 设置，再测试连接');
  }

  function applyAiProviderDefaults() {
    const provider = el('#aiProviderSetting').value;
    if (provider !== 'DeepSeek V4 Flash' && provider !== 'DeepSeek官方API') return;
    if (provider === 'DeepSeek官方API') {
      el('#aiProfileSetting').value = 'deepseek-official';
      el('#aiBaseUrlSetting').value = 'https://api.deepseek.com';
    } else {
      if (!el('#aiProfileSetting').value.trim() || el('#aiProfileSetting').value.trim() === 'codex') el('#aiProfileSetting').value = '1';
      el('#aiBaseUrlSetting').value = 'https://www.mhcoding.xyz/';
    }
    el('#aiModelSetting').value = 'deepseek-v4-flash';
    markAiSettingsDirty();
    refreshAiKeyStatus();
  }

  async function refreshAiKeyStatus() {
    const account = el('#aiProfileSetting').value.trim() || 'codex';
    try {
      const result = await callNative('getAiKeyStatus', { account });
      const detail = result.persistence === 'session' ? '钥匙串授权失败，关闭应用后需重新输入' : '密钥不会显示或读回页面';
      setAiKeyStatus(result.configured, result.configured ? detail : '可在上方填写后安全保存', result.persistence);
    } catch (error) {
      setAiKeyStatus(false, error.message === 'desktop_bridge_unavailable' ? '仅桌面版可保存到 macOS 钥匙串' : '无法检查钥匙串状态');
    }
  }

  async function saveAiConfiguration() {
    const profile = el('#aiProfileSetting').value.trim() || 'codex';
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(profile)) { showToast('配置名称只能使用字母、数字、点、下划线或连字符'); el('#aiProfileSetting').focus(); return; }
    const baseUrl = el('#aiBaseUrlSetting').value.trim();
    const model = el('#aiModelSetting').value.trim();
    const apiKeyInput = el('#aiKeySetting');
    const apiKey = apiKeyInput.value;
    state.settings.aiProfile = profile;
    state.settings.aiProvider = el('#aiProviderSetting').value;
    state.settings.aiBaseUrl = baseUrl;
    state.settings.aiModel = model;
    state.settings.aiBudget = Number(el('#aiBudgetSetting').value) || 0;
    const priorProfile = state.settings.aiProfiles[profile] || {}; state.settings.aiProfiles[profile] = { ...priorProfile, id: profile, name: priorProfile.name || profile, provider: state.settings.aiProvider, baseUrl, defaultModel: model, inputPricePerMillion: Math.max(0, Number(el('#aiInputPriceSetting')?.value || 0)), outputPricePerMillion: Math.max(0, Number(el('#aiOutputPriceSetting')?.value || 0)), enabled: true };
    if (state.settings.aiAssistants.growth) { state.settings.aiAssistants.growth.profileId = profile; if (!state.settings.aiAssistants.growth.model) state.settings.aiAssistants.growth.model = model; }
    saveState();
    if (!apiKey) {
      showToast('已保存服务参数；未填写新密钥，钥匙串保持不变');
      aiSettingsDirty = false;
      renderAiModelControls();
      setAiConnectionStatus('设置已保存，可以测试连接', 'neutral');
      await refreshAiKeyStatus();
      return;
    }
    try {
      const result = await callNative('saveAiKey', { account: profile, key: apiKey });
      apiKeyInput.value = '';
      aiSettingsDirty = false;
      renderAiModelControls();
      const sessionOnly = result.persistence === 'session';
      setAiKeyStatus(true, sessionOnly ? '钥匙串授权失败，关闭应用后需重新输入' : '密钥不会显示或读回页面', result.persistence);
      setAiConnectionStatus(sessionOnly ? '设置已保存；密钥仅本次会话可用，可以测试连接' : '设置与密钥已保存，可以测试连接', 'neutral');
      showToast(sessionOnly ? '钥匙串不可用，密钥仅保存在本次会话内存中' : 'AI 配置已保存，密钥已写入 macOS 钥匙串');
    } catch (error) {
      apiKeyInput.value = '';
      showToast(error.message === 'desktop_bridge_unavailable' ? '服务参数已保存；请在桌面版中保存密钥' : '密钥保存失败，请检查钥匙串权限');
    }
  }

  async function deleteAiKey() {
    try {
      await callNative('deleteAiKey', { account: el('#aiProfileSetting').value.trim() || 'codex' });
      el('#aiKeySetting').value = '';
      setAiKeyStatus(false, '钥匙串中的该配置密钥已删除');
      showToast('AI 密钥已从 macOS 钥匙串删除');
    } catch (_) {
      showToast('无法删除密钥，请确认正在使用桌面版');
    }
  }

  async function testAiConnection() {
    const button = el('#testAiConnectionButton');
    const status = el('#aiConnectionStatus');
    const profile = el('#aiProfileSetting').value.trim() || 'codex';
    const baseUrl = el('#aiBaseUrlSetting').value.trim();
    const model = el('#aiModelSetting').value.trim();
    if (aiSettingsDirty) {
      setAiConnectionStatus('请先点击底部“保存 AI 设置”');
      return;
    }
    if (!baseUrl || !model) {
      status.textContent = '请先填写 Base URL 和模型 ID';
      showToast('连接测试需要 Base URL 和模型 ID');
      return;
    }
    try {
      const parsed = new URL(baseUrl);
      const localHttp = parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
      if (parsed.protocol !== 'https:' && !localHttp) throw new Error('invalid_url');
    } catch (_) {
      status.textContent = 'Base URL 无效；远程服务必须使用 HTTPS';
      return;
    }
    state.settings.aiProfile = profile;
    state.settings.aiProvider = el('#aiProviderSetting').value;
    state.settings.aiBaseUrl = baseUrl;
    state.settings.aiModel = model;
    saveState();
    button.disabled = true;
    button.textContent = '正在测试…';
    status.textContent = '正在验证地址、网络和密钥鉴权';
    try {
      const result = await callNative('testAiConnection', { account: profile, provider: state.settings.aiProvider, baseUrl, model });
      setAiConnectionStatus(`连接成功 · HTTP ${result.status}`, 'success');
      showToast('AI 服务连接成功；尚未发送对话内容或产生模型调用');
      await refreshAiKeyStatus();
    } catch (error) {
      const messages = {
        key_not_found: '未找到该配置名称对应的钥匙串密钥',
        invalid_url: 'Base URL 无效或不符合安全要求',
        authentication_failed: '鉴权失败，请检查密钥',
        service_not_found: '接口不存在，请检查 Base URL 是否包含 /v1',
        rate_limited: '服务限流或额度不足',
        network_failed: '网络连接失败或服务不可达',
        desktop_bridge_timeout: '连接测试超时',
        desktop_bridge_unavailable: '仅桌面版支持连接测试'
      };
      setAiConnectionStatus(messages[error.message] || `连接失败：${error.message}`);
      showToast(el('#aiConnectionStatus').textContent);
    } finally {
      button.disabled = false;
      button.textContent = '测试连接';
    }
  }

  function setYoudaoStatus(configured, message) {
    const keyStatus = el('#youdaoKeyStatus');
    const englishStatus = el('#youdaoEnglishStatus');
    keyStatus.textContent = configured ? '凭据已保存到钥匙串' : '尚未配置';
    keyStatus.classList.toggle('warning', !configured);
    englishStatus.textContent = configured ? '有道已配置' : '需要配置';
    englishStatus.classList.toggle('warning', !configured);
    el('#youdaoConnectionStatus').textContent = message;
    el('#deleteYoudaoButton').disabled = !configured;
  }

  async function refreshYoudaoStatus() {
    try {
      const result = await callNative('getYoudaoStatus');
      setYoudaoStatus(result.configured, result.configured ? '可以测试连接或前往英语学习查询词项' : '请填写有道智云应用 ID 和应用密钥');
    } catch (error) {
      setYoudaoStatus(false, error.message === 'desktop_bridge_unavailable' ? '仅桌面版支持有道凭据与查询' : '无法检查有道配置');
    }
  }

  async function saveYoudaoConfiguration() {
    const appIdInput = el('#youdaoAppIdSetting');
    const secretInput = el('#youdaoAppSecretSetting');
    const appId = appIdInput.value.trim();
    const appSecret = secretInput.value;
    if (!appId || !appSecret) { showToast('请同时填写有道应用 ID 和应用密钥'); return; }
    try {
      await callNative('saveYoudaoCredentials', { appId, appSecret });
      appIdInput.value = '';
      secretInput.value = '';
      setYoudaoStatus(true, '凭据已保存，可以测试连接');
      showToast('有道凭据已保存到 macOS 钥匙串');
    } catch (error) {
      secretInput.value = '';
      showToast(error.message === 'desktop_bridge_unavailable' ? '请在桌面版中保存有道凭据' : '有道凭据保存失败');
    }
  }

  async function deleteYoudaoConfiguration() {
    try {
      await callNative('deleteYoudaoCredentials');
      latestYoudaoResult = null;
      setYoudaoStatus(false, '有道凭据已从钥匙串删除');
      setSafeMarkup(el('#youdaoLookupResult'), '<span>有道凭据已删除。</span>');
      showToast('有道凭据已删除');
    } catch (_) { showToast('无法删除有道凭据'); }
  }

  async function testYoudaoConnection() {
    const button = el('#testYoudaoButton');
    button.disabled = true;
    button.textContent = '正在测试…';
    el('#youdaoConnectionStatus').textContent = '正在通过有道官方 API 查询测试词 hello';
    try {
      const result = await callNative('testYoudaoConnection');
      const meaning = Array.isArray(result.translations) ? result.translations.join('；') : '';
      setYoudaoStatus(true, `连接成功 · hello：${meaning || '已返回结果'}`);
      showToast('有道官方 API 连接成功');
    } catch (error) {
      const messages = { youdao_credentials_not_found: '尚未保存有道凭据', network_failed: '无法连接有道服务', youdao_api_error: `有道返回错误码 ${error.detail || '未知'}`, desktop_bridge_timeout: '有道连接测试超时' };
      el('#youdaoConnectionStatus').textContent = messages[error.message] || `连接失败：${error.message}`;
      showToast(el('#youdaoConnectionStatus').textContent);
    } finally {
      button.disabled = false;
      button.textContent = '测试连接';
    }
  }

  function renderYoudaoResult(result) {
    const translations = Array.isArray(result.translations) ? result.translations.filter(item => typeof item === 'string') : [];
    const explains = Array.isArray(result.basic?.explains) ? result.basic.explains.filter(item => typeof item === 'string') : [];
    const meanings = explains.length ? explains : translations;
    const dictionaryPhonetic = result.dictionary?.phonetic || result.dictionary?.phonetics?.find(item => item?.text)?.text || '';
    const genericPhonetic = result.basic?.phonetic || dictionaryPhonetic;
    const ukPhonetic = result.basic?.ukPhonetic || genericPhonetic;
    const usPhonetic = result.basic?.usPhonetic || genericPhonetic;
    const normalizePhonetic = value => value && (value.startsWith('/') ? value : `/${value}/`);
    const phonetics = (ukPhonetic || usPhonetic) ? `<div class="youdao-phonetics">${ukPhonetic ? `<span>英 ${escapeHtml(normalizePhonetic(ukPhonetic))}</span>` : ''}${usPhonetic ? `<span>美 ${escapeHtml(normalizePhonetic(usPhonetic))}</span>` : ''}</div>` : '<span class="youdao-phonetic-note">暂无音标，仍可使用系统发音</span>';
    const meaningRows = meanings.length ? meanings.map(item => `<li>${escapeHtml(item)}</li>`).join('') : '<li>有道未返回参考释义</li>';
    const posLabels = { verb: 'v.', adjective: 'adj.', noun: 'n.', adverb: 'adv.', pronoun: 'pron.', preposition: 'prep.', conjunction: 'conj.', interjection: 'int.', exclamation: 'int.' };
    const dictionarySections = Array.isArray(result.dictionary?.meanings) ? result.dictionary.meanings.map(group => {
      const definitions = Array.isArray(group.definitions) ? group.definitions.map(item => `<li><span>${escapeHtml(item.definition || '')}</span>${item.example ? `<small>${escapeHtml(item.example)}</small>` : ''}</li>`).join('') : '';
      return definitions ? `<section class="youdao-pos-group"><b>${escapeHtml(posLabels[group.partOfSpeech] || group.partOfSpeech || '释义')}</b><ol>${definitions}</ol></section>` : '';
    }).join('') : '';
    setSafeMarkup(el('#youdaoLookupResult'), `<article class="youdao-entry"><header><div><strong>${escapeHtml(result.query || '')}</strong>${phonetics}</div><button class="icon-button youdao-speak" id="speakYoudaoButton" type="button" title="播放发音" aria-label="播放 ${escapeHtml(result.query || '')} 的发音">🔊︎</button></header><div class="youdao-entry-divider"></div><section class="youdao-cn-meaning"><b>中文参考</b><ol class="youdao-meanings">${meaningRows}</ol></section>${dictionarySections ? `<div class="youdao-entry-divider"></div><div class="youdao-dictionary-sections">${dictionarySections}</div><p class="youdao-source-note">音标、音频与英文释义：Free Dictionary API；中文参考：有道文本翻译</p>` : ''}<footer class="youdao-result-actions"><button class="button primary" id="addYoudaoWordButton" type="button">加入今日词表</button><button class="button" id="openYoudaoEntryButton" type="button">在有道词典打开</button></footer></article>`);
    document.getElementById('addYoudaoWordButton')?.addEventListener('click', addLatestYoudaoWord);
    document.getElementById('speakYoudaoButton')?.addEventListener('click', playLatestYoudaoWord);
    document.getElementById('openYoudaoEntryButton')?.addEventListener('click', openLatestYoudaoEntry);
  }

  async function playLatestYoudaoWord() {
    if (!latestYoudaoResult?.query) return;
    const button = el('#speakYoudaoButton');
    button.disabled = true;
    try {
      const dictionaryAudio = latestYoudaoResult.dictionary?.phonetics?.find(item => item?.audio)?.audio;
      const audioUrl = latestYoudaoResult.speakUrl || dictionaryAudio;
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        await audio.play();
      } else {
        await callNative('speakYoudaoWord', { query: latestYoudaoResult.query });
      }
    } catch (_) {
      showToast('发音播放失败，请检查系统声音或网络');
    } finally {
      button.disabled = false;
    }
  }

  async function openLatestYoudaoEntry() {
    if (!latestYoudaoResult?.query) return;
    try {
      await callNative('openYoudaoEntry', { query: latestYoudaoResult.query });
    } catch (_) {
      showToast('无法打开有道词条页面');
    }
  }

  async function lookupYoudao(event) {
    event.preventDefault();
    const query = el('#youdaoLookupInput').value.trim();
    if (!query) { showToast('请输入要查询的单词或短语'); return; }
    const button = el('#youdaoLookupButton');
    button.disabled = true;
    button.textContent = '查询中…';
    setSafeMarkup(el('#youdaoLookupResult'), '<span>正在请求有道官方 API…</span>');
    try {
      latestYoudaoResult = await callNative('lookupYoudao', { query });
      renderYoudaoResult(latestYoudaoResult);
    } catch (error) {
      const messages = { youdao_credentials_not_found: '请先在“设置 → 英语服务”配置有道凭据。', network_failed: '网络连接失败，请稍后重试。', youdao_api_error: `有道查询失败，错误码：${error.detail || '未知'}` };
      setSafeMarkup(el('#youdaoLookupResult'), `<span>${escapeHtml(messages[error.message] || `查询失败：${error.message}`)}</span>`);
    } finally {
      button.disabled = false;
      button.textContent = '查询';
    }
  }

  function addLatestYoudaoWord() {
    if (!latestYoudaoResult?.query) return;
    const session = ensureWordSession();
    if (session.phase !== 'preview') { showToast('今日学习已经开始，请在下一学习日录入'); return; }
    const display = latestYoudaoResult.query.trim();
    const normalized = display.toLowerCase();
    const definitions = splitMeanings((latestYoudaoResult.translations || []).join('；'));
    const existing = state.words.find(word => word.normalized === normalized && word.status !== 'trash');
    if (existing) {
      const merged = [...new Set([...(existing.definitions || []), ...definitions])];
      if (merged.length > existing.definitions.length && window.confirm('是否将有道参考释义合并到本地词库？')) updateWordDefinitions(existing, merged, false);
      showToast('该词已存在，复习周期未重置'); return;
    }
    const id = Date.now();
    state.words.push({ id, display, normalized, definitions, sourceDate: session.day, cycleStartDay: session.day, status: 'active', history: [] });
    session.itemIds.push(id); session.offsets[id] = 0;
    saveState();
    renderWords();
    showToast('词项及参考释义已加入今日学习表，可在开始前编辑');
  }

  function formatBytes(bytes) { return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`; }

  function createSnapshotMeta() {
    const bytes = new TextEncoder().encode(JSON.stringify(state)).length;
    state.backupMeta = { createdAt: new Date().toISOString(), bytes, kind: 'prototype-metadata-only' }; saveState(); renderSettings(); showToast('仅保存了模拟快照元数据，未创建备份文件');
  }

  function renderWater() {
    el('#waterMetric').textContent = `${state.water} / 2000 ml`;
    el('#waterBar').style.width = `${Math.min(100, state.water / 20)}%`;
    if (el('#healthWaterMetric')) el('#healthWaterMetric').textContent = `${state.water} / 2000 ml`;
    if (el('#waterPercent')) el('#waterPercent').textContent = `${Math.min(100, Math.round(state.water / 20))}%`;
    if (el('#waterRing')) el('#waterRing').style.setProperty('--water-progress', `${Math.min(100, state.water / 20) * 3.6}deg`);
    if (el('#reviewWaterSummary')) el('#reviewWaterSummary').textContent = `${state.water} ml`;
  }

  const wordReviewOffsets = [0, 1, 2, 6, 14, 29];
  let editingWordId = null;
  let overridingWordId = null;
  let wordManagerMode = 'all';
  let wordBatchDeleteMode = false;

  function learningDayKey(date = new Date()) {
    const shifted = new Date(date.getTime() - 60 * 60 * 1000);
    return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}-${String(shifted.getDate()).padStart(2, '0')}`;
  }

  function dayDifference(from, to) {
    return Math.round((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86400000);
  }

  function splitMeanings(value) {
    return window.WorkbenchWordLearningCore.splitMeanings(value);
  }

  function normalizeMeaning(value) {
    return window.WorkbenchWordLearningCore.normalizeMeaning(value);
  }

  function migrateWordState() {
    const today = learningDayKey();
    state.words = state.words.map((word, index) => {
      const display = word.display || word.title || `词项${index + 1}`;
      const normalized = word.normalized || display.trim().toLowerCase();
      const definitions = splitMeanings(word.definitions || word.references || referenceMeanings[normalized] || []);
      return { ...word, display, normalized, definitions, sourceDate: word.sourceDate || today, cycleStartDay: word.cycleStartDay || today, status: word.status || 'active', history: Array.isArray(word.history) ? word.history : [] };
    });
    if (!Array.isArray(state.wordTrash)) state.wordTrash = [];
    if (!Array.isArray(state.wordMeaningHistory)) state.wordMeaningHistory = [];
  }

  function dueOffset(word, day) {
    if (word.status !== 'active') return null;
    const difference = dayDifference(word.cycleStartDay, day);
    const completed = new Set((word.history || []).filter(item => item.cycleStartDay === word.cycleStartDay).map(item => item.offset));
    return wordReviewOffsets.find(offset => offset <= difference && !completed.has(offset)) ?? null;
  }

  function ensureWordSession() {
    migrateWordState();
    const day = learningDayKey();
    if (!state.wordLearning || state.wordLearning.day !== day) {
      const due = state.words.filter(word => dueOffset(word, day) !== null).sort((a, b) => a.sourceDate.localeCompare(b.sourceDate));
      state.wordLearning = { day, phase: 'preview', itemIds: due.map(word => word.id), offsets: Object.fromEntries(due.map(word => [word.id, dueOffset(word, day)])), answers: {}, results: {}, retryIds: [], retryAnswers: {}, retryAttempts: {}, startedAt: null, submittedAt: null, checkpoint: null };
      wordBatchDeleteMode = false;
      saveState();
    }
    if (!state.wordLearning.offsets) state.wordLearning.offsets = Object.fromEntries(state.wordLearning.itemIds.map(id => {
      const word = state.words.find(item => item.id === id);
      return [id, word ? dueOffset(word, day) : 0];
    }));
    return state.wordLearning;
  }

  function wordSourceLabel(word) {
    const offset = state.wordLearning.offsets?.[word.id] ?? dueOffset(word, state.wordLearning.day);
    return offset === 0 ? `新词 · ${word.sourceDate}` : `首次录入 ${word.sourceDate} · 第${(offset ?? 0) + 1}天`;
  }

  function wordResultMarkup(word, result) {
    if (!result) return '<span class="word-result">未提交</span>';
    const matched = new Set(result.matched || []);
    const meanings = word.definitions.map(item => `<span class="meaning-token ${matched.has(item) ? 'matched' : 'missed'}">${escapeHtml(item)}</span>`).join('');
    const wrong = (result.extra || []).map(item => `<span class="meaning-token wrong-answer">${escapeHtml(item)}</span>`).join('');
    return `<span class="word-result ${result.result}">${resultLabel(result.result)}</span><div class="meaning-feedback">${meanings}${wrong}</div><small>答案：${escapeHtml(result.answer || '空白')}</small>`;
  }

  function renderWords() {
    const body = el('#wordPracticeBody');
    if (!body) return;
    const session = ensureWordSession();
    const words = session.itemIds.map(id => state.words.find(word => word.id === id)).filter(Boolean);
    const preview = session.phase === 'preview';
    const studying = session.phase === 'studying';
    el('#wordMeaningHeading').textContent = preview ? '中文释义' : studying ? '输入中文释义' : '核验结果与标准释义';
    setSafeMarkup(body, words.length ? words.map(word => {
      const result = session.results[word.id];
      const operation = studying ? '' : `<button class="text-button" type="button" data-word-edit="${word.id}">编辑</button>${preview ? `<button class="text-button danger-text" type="button" data-word-delete="${word.id}">删除</button>${wordBatchDeleteMode ? `<input type="checkbox" data-word-batch="${word.id}" aria-label="选择 ${escapeHtml(word.display)}">` : ''}` : result ? `<button class="text-button" type="button" data-word-override="${word.id}">人工改判</button>` : ''}`;
      const meaningCell = preview ? `<div class="preview-meanings">${word.definitions.length ? word.definitions.map(item => `<span>${escapeHtml(item)}</span>`).join('') : '<span class="pending-meaning">待补充释义</span>'}</div>` : studying ? `<input class="meaning-input" data-word-id="${word.id}" value="${escapeHtml(session.answers[word.id] || '')}" placeholder="输入中文释义，可留空">` : wordResultMarkup(word, result);
      return `<tr><td class="word-row-actions">${operation}</td><td><strong>${escapeHtml(word.display)}</strong></td><td>${meaningCell}</td><td><span class="status-tag">${escapeHtml(wordSourceLabel(word))}</span></td><td>${result ? `<span class="word-result ${result.result}">${resultLabel(result.result)}</span>` : '—'}</td></tr>`;
    }).join('') : '<tr><td colspan="5" class="empty-table">今日还没有词项。录入新词后会显示在这里；到期复习词将在新词之后出现。</td></tr>');
    el('#wordPrimaryAction').textContent = preview ? '开始学习' : studying ? '提交并检验' : '今日学习已完成';
    el('#wordPrimaryAction').disabled = !words.length || session.phase === 'submitted';
    el('#clearWordAnswersButton').hidden = !studying;
    el('#batchDeleteWordsButton').hidden = !preview || !words.length;
    el('#batchDeleteWordsButton').textContent = wordBatchDeleteMode ? '确认删除' : '批量删除';
    el('#wordInput').disabled = !preview;
    el('#addWordsButton').disabled = !preview;
    const completed = Object.keys(session.results).length;
    el('#wordSessionStatus').textContent = preview ? `${words.length} 个待开始` : studying ? `${words.length} 个作答中` : `${completed} 个已核验`;
    el('#dueWordMetric').textContent = words.length;
    el('#wordNavCount').textContent = words.length;
    el('#reviewEnglishSummary').textContent = `${words.length} 词`;
    el('#wordBankMetric').textContent = state.words.filter(word => word.status !== 'trash').length;
    el('#masteredWordMetric').textContent = state.words.filter(word => word.status === 'mastered').length;
    el('#wordTrashMetric').textContent = state.wordTrash.length;
    const checkpointCount = session.checkpoint?.keepIds?.length || 0;
    el('#openCheckpointButton').hidden = !checkpointCount;
    el('#checkpointWordMetric').textContent = checkpointCount;
    all('.meaning-input').forEach(input => input.addEventListener('input', event => { session.answers[event.target.dataset.wordId] = event.target.value; saveState(); }));
    all('[data-word-edit]').forEach(button => button.addEventListener('click', () => openWordEditor(Number(button.dataset.wordEdit))));
    all('[data-word-delete]').forEach(button => button.addEventListener('click', () => trashWord(Number(button.dataset.wordDelete))));
    all('[data-word-override]').forEach(button => button.addEventListener('click', () => openWordOverride(Number(button.dataset.wordOverride))));
    renderWordRetry();
  }

  function resultLabel(result) {
    return ({ correct: '正确', partial: '部分正确', wrong: '错误', unknown: '不会' })[result] || '未提交';
  }

  async function addWords() {
    const session = ensureWordSession();
    if (session.phase !== 'preview') { showToast('今日学习已经开始，新录入词项将在下一学习日处理'); return; }
    const entries = el('#wordInput').value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    if (!entries.length) { showToast('请先输入至少一个单词或短语'); return; }
    let added = 0;
    for (const entry of entries) {
      const parsed = window.WorkbenchWordLearningCore.parseEntry(entry);
      const display = parsed.display;
      if (!display) continue;
      const normalized = parsed.normalized;
      let definitions = parsed.definitions;
      let existing = state.words.find(word => word.normalized === normalized && word.status !== 'trash');
      if (!definitions.length && existing?.definitions?.length) definitions = existing.definitions;
      if (!definitions.length && referenceMeanings[normalized]) definitions = referenceMeanings[normalized];
      if (!definitions.length) {
        try {
          const lookup = await callNative('lookupYoudao', { query: display });
          definitions = splitMeanings((lookup.translations || []).join('；'));
          if (definitions.length && !window.confirm(`${display} 查询到：${definitions.join('；')}。是否保存到本地词库？`)) definitions = [];
        } catch (_) { /* Keep as pending and require manual editing. */ }
      }
      if (existing) {
        if (existing.status === 'mastered') { showToast(`${display} 已熟练掌握；可在本地词库选择重新学习`); continue; }
        const merged = [...new Set([...(existing.definitions || []), ...definitions])];
        if (merged.length > existing.definitions.length && window.confirm(`${display} 已在复习周期中，是否合并新释义？`)) updateWordDefinitions(existing, merged, false);
        if (dueOffset(existing, session.day) !== null && !session.itemIds.includes(existing.id)) { session.itemIds.push(existing.id); session.offsets[existing.id] = dueOffset(existing, session.day); }
        continue;
      }
      const id = Date.now() + added;
      const word = { id, display, normalized, definitions, sourceDate: session.day, cycleStartDay: session.day, status: 'active', history: [] };
      state.words.push(word); session.itemIds.push(id); session.offsets[id] = 0; added += 1;
    }
    el('#wordInput').value = '';
    saveState();
    renderWords();
    showToast(added ? `已加入 ${added} 个词项` : '已处理重复词项，未新增学习周期');
  }

  function gradeWords(event) {
    event.preventDefault();
    const session = ensureWordSession();
    const words = session.itemIds.map(id => state.words.find(word => word.id === id)).filter(Boolean);
    if (!words.length) { showToast('当前没有可学习的词项'); return; }
    if (session.phase === 'preview') {
      const pending = words.filter(word => !word.definitions.length);
      if (pending.length) { showToast(`还有 ${pending.length} 个词项缺少中文释义，请先编辑`); return; }
      session.phase = 'studying'; session.startedAt = new Date().toISOString(); saveState(); renderWords(); return;
    }
    if (session.phase !== 'studying') return;
    session.retryIds = [];
    const checkpointIds = [];
    words.forEach(word => {
      const offset = session.offsets?.[word.id] ?? dueOffset(word, session.day);
      const result = evaluateWordAnswer(word, session.answers[word.id] || '');
      result.definitionsSnapshot = [...word.definitions]; result.offset = offset;
      session.results[word.id] = result;
      word.history.push({ day: session.day, cycleStartDay: word.cycleStartDay, offset, answer: result.answer, result: result.result, definitionsSnapshot: [...word.definitions], submittedAt: new Date().toISOString() });
      if (['wrong', 'unknown'].includes(result.result)) session.retryIds.push(word.id);
      if (offset === 29) {
        if (['correct', 'partial'].includes(result.result)) word.status = 'mastered';
        else checkpointIds.push(word.id);
      }
    });
    session.phase = 'submitted'; session.submittedAt = new Date().toISOString();
    if (checkpointIds.length) session.checkpoint = { keepIds: checkpointIds, trashIds: [], createdAt: new Date().toISOString() };
    saveState();
    renderWords();
    if (checkpointIds.length) openWordCheckpoint();
    showToast('今日学习已核验并锁定；错误和不会的词已进入今日复习表');
  }

  function evaluateWordAnswer(word, answer) {
    return window.WorkbenchWordLearningCore.evaluate(word.definitions, answer);
  }

  function updateWordDefinitions(word, definitions, offerRegrade = true) {
    const previous = [...(word.definitions || [])];
    word.definitions = [...new Set(definitions)];
    state.wordMeaningHistory.push({ wordId: word.id, previous, current: [...word.definitions], changedAt: new Date().toISOString() });
    const session = ensureWordSession();
    if (offerRegrade && session.phase === 'submitted' && session.results[word.id] && window.confirm('释义已更新，是否使用新释义重新核验今天的答案？')) {
      const before = session.results[word.id];
      const after = evaluateWordAnswer(word, before.answer);
      after.definitionsSnapshot = [...word.definitions]; after.offset = before.offset;
      after.regradedFrom = before.result; after.regradedAt = new Date().toISOString();
      session.results[word.id] = after;
      applyFinalWordResult(word, after.result, before.offset);
    }
    saveState(); renderWords();
  }

  function openWordEditor(id) {
    const word = state.words.find(item => item.id === id);
    if (!word) return;
    editingWordId = id;
    el('#wordEditTitle').textContent = `编辑：${word.display}`;
    el('#wordEditMeanings').value = word.definitions.join('；');
    el('#wordEditDialog').showModal();
  }

  function saveWordMeanings(event) {
    event.preventDefault();
    const word = state.words.find(item => item.id === editingWordId);
    if (!word) return;
    const definitions = splitMeanings(el('#wordEditMeanings').value);
    if (!definitions.length) { showToast('至少保留一个中文释义；待补充词不能开始学习'); return; }
    updateWordDefinitions(word, definitions, true);
    el('#wordEditDialog').close('saved');
    renderWordManager();
  }

  function trashWord(id, context = 'ordinary') {
    const word = state.words.find(item => item.id === id);
    if (!word || !window.confirm(`删除“${word.display}”？将移除完整词汇记录和后续复习安排，并在回收站保留30天。`)) return;
    const session = ensureWordSession();
    state.wordTrash.unshift({ ...word, deletedAt: new Date().toISOString(), restoreMode: context === 'checkpoint' ? 'waiting-next' : 'original' });
    word.status = 'trash';
    session.itemIds = session.itemIds.filter(itemId => itemId !== id);
    session.retryIds = session.retryIds.filter(itemId => itemId !== id);
    if (session.checkpoint) {
      session.checkpoint.keepIds = session.checkpoint.keepIds.filter(itemId => itemId !== id);
      session.checkpoint.trashIds = session.checkpoint.trashIds.filter(itemId => itemId !== id);
    }
    saveState(); renderWords(); renderWordManager(); showToast('词项已移入词汇回收站');
  }

  function toggleWordBatchDelete() {
    const session = ensureWordSession();
    if (session.phase !== 'preview') return;
    if (!wordBatchDeleteMode) { wordBatchDeleteMode = true; renderWords(); return; }
    const ids = all('[data-word-batch]:checked').map(input => Number(input.dataset.wordBatch));
    if (!ids.length) { showToast('请先勾选需要删除的词项'); return; }
    if (!window.confirm(`确认删除选中的 ${ids.length} 个词项？复习词会删除完整周期和后续安排。`)) return;
    ids.forEach(id => {
      const word = state.words.find(item => item.id === id);
      if (!word) return;
      state.wordTrash.unshift({ ...word, deletedAt: new Date().toISOString(), restoreMode: 'original' }); word.status = 'trash';
      session.itemIds = session.itemIds.filter(itemId => itemId !== id);
    });
    wordBatchDeleteMode = false; saveState(); renderWords(); showToast(`${ids.length} 个词项已移入回收站`);
  }

  function clearWordAnswers(retry = false) {
    const session = ensureWordSession();
    if (retry) session.retryAnswers = {};
    else session.answers = {};
    saveState(); renderWords();
  }

  function renderWordRetry() {
    const session = ensureWordSession();
    const panel = el('#wordRetryPanel');
    const words = session.retryIds.map(id => state.words.find(word => word.id === id)).filter(Boolean);
    panel.hidden = session.phase !== 'submitted' || !words.length;
    el('#wordRetryStatus').textContent = `${words.length} 个待复习`;
    setSafeMarkup(el('#wordRetryBody'), words.map(word => `<tr><td><strong>${escapeHtml(word.display)}</strong></td><td><input data-retry-word="${escapeHtml(word.id)}" value="${escapeHtml(session.retryAnswers[word.id] || '')}" placeholder="输入任意一个正确释义，可留空"></td><td>${escapeHtml(resultLabel(session.retryAttempts[word.id]?.result))}</td></tr>`).join(''));
    all('[data-retry-word]').forEach(input => input.addEventListener('input', event => { session.retryAnswers[event.target.dataset.retryWord] = event.target.value; saveState(); }));
  }

  function gradeWordRetry(event) {
    event.preventDefault();
    const session = ensureWordSession();
    session.retryIds.slice().forEach(id => {
      const word = state.words.find(item => item.id === id);
      if (!word) return;
      const result = evaluateWordAnswer(word, session.retryAnswers[id] || '');
      const passed = ['correct', 'partial'].includes(result.result);
      session.retryAttempts[id] = { ...result, attempt: (session.retryAttempts[id]?.attempt || 0) + 1, at: new Date().toISOString() };
      if (passed) session.retryIds = session.retryIds.filter(itemId => itemId !== id);
    });
    session.retryAnswers = {}; saveState(); renderWords(); showToast('复习结果已更新；命中任意一个正确释义的词已移出');
  }

  function renderWordManager() {
    const query = (el('#wordManagerSearch')?.value || '').trim().toLowerCase();
    const words = state.words.filter(word => word.status !== 'trash' && (wordManagerMode !== 'mastered' || word.status === 'mastered')).filter(word => `${word.display} ${word.definitions.join(' ')}`.toLowerCase().includes(query));
    el('#wordManagerTitle').textContent = wordManagerMode === 'mastered' ? '熟练掌握词库' : '本地词库';
    setSafeMarkup(el('#wordManagerList'), words.length ? words.map(word => `<article class="word-manager-row"><div><strong>${escapeHtml(word.display)}</strong><span>${escapeHtml(word.definitions.join('；') || '待补充')} · 首次录入 ${escapeHtml(word.sourceDate)}</span><small>${word.status === 'mastered' ? '熟练掌握' : `复习周期起点 ${escapeHtml(word.cycleStartDay)}`}</small></div><div><button class="button" type="button" data-manager-edit="${escapeHtml(word.id)}">编辑</button>${word.status === 'mastered' ? `<button class="button" type="button" data-word-relearn="${escapeHtml(word.id)}">重新学习</button>` : ''}<button class="button" type="button" data-manager-delete="${escapeHtml(word.id)}">删除</button></div></article>`).join('') : '<div class="empty-state"><strong>没有匹配词项</strong></div>');
    all('[data-manager-edit]').forEach(button => button.addEventListener('click', () => openWordEditor(Number(button.dataset.managerEdit))));
    all('[data-manager-delete]').forEach(button => button.addEventListener('click', () => trashWord(Number(button.dataset.managerDelete))));
    all('[data-word-relearn]').forEach(button => button.addEventListener('click', () => relearnWord(Number(button.dataset.wordRelearn))));
  }

  function openWordManager(mode) {
    wordManagerMode = mode; el('#wordManagerSearch').value = ''; renderWordManager(); el('#wordManagerDialog').showModal();
  }

  function relearnWord(id) {
    const word = state.words.find(item => item.id === id);
    if (!word || !window.confirm(`将“${word.display}”重新加入学习周期？`)) return;
    const session = ensureWordSession(); word.status = 'active'; word.cycleStartDay = session.day;
    if (session.phase === 'preview' && !session.itemIds.includes(id)) session.itemIds.push(id);
    saveState(); renderWords(); renderWordManager();
  }

  function renderWordTrash() {
    const cutoff = Date.now() - 30 * 86400000;
    const retained = state.wordTrash.filter(item => new Date(item.deletedAt).getTime() > cutoff);
    if (retained.length !== state.wordTrash.length) { state.wordTrash = retained; saveState(); }
    setSafeMarkup(el('#wordTrashList'), state.wordTrash.length ? state.wordTrash.map(item => `<article class="word-manager-row"><div><strong>${escapeHtml(item.display)}</strong><span>${escapeHtml((item.definitions || []).join('；'))}</span><small>剩余 ${Math.max(0, Math.ceil((new Date(item.deletedAt).getTime() + 30 * 86400000 - Date.now()) / 86400000))} 天</small></div><div><button class="button" type="button" data-word-restore="${escapeHtml(item.id)}">恢复</button><button class="button" type="button" data-word-purge="${escapeHtml(item.id)}">永久删除</button></div></article>`).join('') : '<div class="empty-state"><strong>词汇回收站为空</strong></div>');
    all('[data-word-restore]').forEach(button => button.addEventListener('click', () => restoreWord(Number(button.dataset.wordRestore))));
    all('[data-word-purge]').forEach(button => button.addEventListener('click', () => { if (window.confirm('永久删除该词？此操作无法撤销。')) { state.wordTrash = state.wordTrash.filter(item => item.id !== Number(button.dataset.wordPurge)); saveState(); renderWordTrash(); renderWords(); } }));
  }

  function restoreWord(id) {
    const item = state.wordTrash.find(word => word.id === id);
    const word = state.words.find(word => word.id === id);
    if (!item || !word) return;
    Object.assign(word, item, { status: 'active' }); delete word.deletedAt; delete word.restoreMode;
    if (item.restoreMode === 'waiting-next') word.cycleStartDay = learningDayKey();
    state.wordTrash = state.wordTrash.filter(entry => entry.id !== id);
    const session = ensureWordSession();
    const offset = dueOffset(word, session.day);
    if (session.phase === 'preview' && offset !== null && !session.itemIds.includes(id)) { session.itemIds.push(id); session.offsets[id] = offset; }
    saveState(); renderWordTrash(); renderWords(); showToast(item.restoreMode === 'waiting-next' ? '已恢复为等待加入下一轮' : '已恢复原学习周期');
  }

  function openWordCheckpoint() {
    const checkpoint = ensureWordSession().checkpoint;
    if (!checkpoint?.keepIds?.length) return;
    renderWordCheckpoint(); el('#wordCheckpointDialog').showModal();
  }

  function renderWordCheckpoint() {
    const checkpoint = ensureWordSession().checkpoint;
    if (!checkpoint) return;
    setSafeMarkup(el('#wordCheckpointList'), checkpoint.keepIds.map(id => {
      const word = state.words.find(item => item.id === id), result = state.wordLearning.results[id];
      return word ? `<article class="word-manager-row"><div><strong>${escapeHtml(word.display)}</strong><span>${escapeHtml(word.definitions.join('；'))}</span><small>首次录入 ${word.sourceDate} · 第30天结果 ${resultLabel(result?.result)} · 默认进入下一轮</small></div><button class="button" type="button" data-checkpoint-remove="${id}">删除</button></article>` : '';
    }).join(''));
    setSafeMarkup(el('#wordCheckpointTrash'), checkpoint.trashIds.map(id => { const word = state.words.find(item => item.id === id); return word ? `<article class="word-manager-row"><strong>${escapeHtml(word.display)}</strong><button class="button" type="button" data-checkpoint-restore="${escapeHtml(id)}">恢复</button></article>` : ''; }).join('') || '<p class="muted-note">本页回收站为空</p>');
    el('#checkpointTrashCount').textContent = checkpoint.trashIds.length;
    all('[data-checkpoint-remove]').forEach(button => button.addEventListener('click', () => { const id = Number(button.dataset.checkpointRemove); checkpoint.keepIds = checkpoint.keepIds.filter(item => item !== id); checkpoint.trashIds.push(id); saveState(); renderWordCheckpoint(); renderWords(); }));
    all('[data-checkpoint-restore]').forEach(button => button.addEventListener('click', () => { const id = Number(button.dataset.checkpointRestore); checkpoint.trashIds = checkpoint.trashIds.filter(item => item !== id); checkpoint.keepIds.push(id); saveState(); renderWordCheckpoint(); renderWords(); }));
  }

  function confirmWordCheckpoint() {
    const session = ensureWordSession(), checkpoint = session.checkpoint;
    if (!checkpoint) return;
    checkpoint.keepIds.forEach(id => { const word = state.words.find(item => item.id === id); if (word) { word.status = 'active'; word.cycleStartDay = session.day; } });
    checkpoint.trashIds.forEach(id => {
      const word = state.words.find(item => item.id === id); if (!word) return;
      state.wordTrash.unshift({ ...word, deletedAt: new Date().toISOString(), restoreMode: 'waiting-next' }); word.status = 'trash';
    });
    session.checkpoint = null; saveState(); el('#wordCheckpointDialog').close('confirmed'); renderWords(); showToast('下一轮名单已确认；确认当天为新周期第1天');
  }

  function openWordOverride(id) {
    const result = ensureWordSession().results[id]; if (!result) return;
    overridingWordId = id; el('#wordOverrideResult').value = result.result; el('#wordOverrideReason').value = ''; el('#wordOverrideDialog').showModal();
  }

  function applyFinalWordResult(word, result, offset) {
    const session = ensureWordSession();
    if (offset === 29 && ['correct', 'partial'].includes(result)) {
      word.status = 'mastered';
      if (session.checkpoint) session.checkpoint.keepIds = session.checkpoint.keepIds.filter(id => id !== word.id);
    } else if (offset === 29 && ['wrong', 'unknown'].includes(result)) {
      word.status = 'active';
      if (!session.checkpoint) session.checkpoint = { keepIds: [], trashIds: [], createdAt: new Date().toISOString() };
      if (!session.checkpoint.keepIds.includes(word.id)) session.checkpoint.keepIds.push(word.id);
    }
  }

  function saveWordOverride(event) {
    event.preventDefault();
    const session = ensureWordSession(), word = state.words.find(item => item.id === overridingWordId), current = session.results[overridingWordId];
    if (!word || !current) return;
    const next = el('#wordOverrideResult').value, reason = el('#wordOverrideReason').value.trim();
    if (!reason) { showToast('请填写改判原因'); return; }
    current.overrides = [...(current.overrides || []), { from: current.result, to: next, reason, at: new Date().toISOString() }]; current.result = next;
    const restarted = current.offset === 29 && !session.checkpoint && word.cycleStartDay === session.day && word.status === 'active';
    if (!(restarted && ['correct', 'partial'].includes(next) && !window.confirm('新一轮已经开始。确定终止新周期并转入熟练掌握？取消将保留新周期。'))) applyFinalWordResult(word, next, current.offset);
    saveState(); el('#wordOverrideDialog').close('saved'); renderWords(); showToast('人工改判已保存，原自动结果仍保留');
  }

  function cyclePeriodForDay(day) {
    return state.cyclePeriods.find(period => period.start <= day && period.end >= day);
  }

  function openCyclePeriodDialog(period = null, day = isoToday()) {
    el('#cyclePeriodDialogTitle').textContent = period ? '编辑周期记录' : '新增周期记录';
    el('#cyclePeriodId').value = period?.id || '';
    el('#cyclePeriodStart').value = period?.start || day;
    el('#cyclePeriodEnd').value = period?.end || day;
    el('#cyclePeriodFlow').value = period?.flow || '';
    el('#cyclePeriodPain').value = period?.pain || '';
    el('#cyclePeriodMood').value = period?.mood || '';
    el('#cyclePeriodEnergy').value = period?.energy || '';
    el('#cyclePeriodSymptoms').value = (period?.symptoms || []).join('，');
    el('#cyclePeriodNotes').value = period?.notes || '';
    el('#cyclePeriodExclude').checked = Boolean(period?.excludeFromPrediction);
    el('#cyclePeriodError').textContent = '';
    el('#deleteCyclePeriodButton').hidden = !period;
    el('#cyclePeriodDialog').showModal();
  }

  function saveCyclePeriod(event) {
    event.preventDefault();
    const id = el('#cyclePeriodId').value;
    const start = el('#cyclePeriodStart').value;
    const end = el('#cyclePeriodEnd').value;
    const error = el('#cyclePeriodError');
    if (!start || !end) { error.textContent = '请选择开始日期和结束日期'; return; }
    if (end < start) { error.textContent = '结束日期不能早于开始日期'; return; }
    if (WorkbenchHealthCore.daysBetween(start, end) > 14) { error.textContent = '单次记录不能超过15天，请检查日期'; return; }
    if (WorkbenchHealthCore.overlaps(state.cyclePeriods, start, end, id || null)) { error.textContent = '该日期与已有周期记录重叠，请先修改原记录'; return; }
    const previous = state.cyclePeriods.find(period => String(period.id) === String(id));
    const record = {
      id: id || `cycle-${Date.now()}`, start, end, complete: true,
      flow: el('#cyclePeriodFlow').value, pain: el('#cyclePeriodPain').value,
      mood: el('#cyclePeriodMood').value.trim(), energy: el('#cyclePeriodEnergy').value,
      symptoms: el('#cyclePeriodSymptoms').value.split(/[,，、；;]/).map(value => value.trim()).filter(Boolean),
      notes: el('#cyclePeriodNotes').value.trim(), excludeFromPrediction: el('#cyclePeriodExclude').checked,
      createdAt: previous?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
      revisions: previous ? [...(previous.revisions || []), { start: previous.start, end: previous.end, updatedAt: previous.updatedAt || previous.createdAt }] : []
    };
    if (previous) state.cyclePeriods = state.cyclePeriods.map(period => String(period.id) === String(id) ? record : period);
    else state.cyclePeriods.push(record);
    state.cyclePeriods.sort((left, right) => left.start.localeCompare(right.start));
    saveState(); el('#cyclePeriodDialog').close('saved'); renderHealth(); showToast(previous ? '周期记录已更新' : '周期记录已保存');
  }

  function deleteCyclePeriod() {
    const id = el('#cyclePeriodId').value;
    const period = state.cyclePeriods.find(item => String(item.id) === String(id));
    if (!period || !window.confirm(`删除 ${period.start} 至 ${period.end} 的周期记录？可在历史记录中恢复。`)) return;
    state.cyclePeriods = state.cyclePeriods.filter(item => String(item.id) !== String(id));
    state.cyclePeriodTrash.unshift({ ...period, deletedAt: new Date().toISOString() });
    saveState(); el('#cyclePeriodDialog').close('deleted'); renderHealth(); showToast('周期记录已移入本地回收状态，30天后删除');
  }

  function restoreCyclePeriod(id) {
    const period = state.cyclePeriodTrash.find(item => String(item.id) === String(id));
    if (!period) return;
    if (WorkbenchHealthCore.overlaps(state.cyclePeriods, period.start, period.end)) { showToast('恢复失败：日期与现有记录重叠'); return; }
    state.cyclePeriodTrash = state.cyclePeriodTrash.filter(item => String(item.id) !== String(id));
    delete period.deletedAt;
    state.cyclePeriods.push(period); state.cyclePeriods.sort((left, right) => left.start.localeCompare(right.start));
    saveState(); renderHealth(); showToast('周期记录已恢复');
  }

  function shiftCycleMonth(amount) {
    const [year, month] = state.healthCalendarMonth.split('-').map(Number);
    state.healthCalendarMonth = isoMonthKey(new Date(year, month - 1 + amount, 1));
    saveState(); renderHealth();
  }

  function renderCycleCalendar() {
    const [year, monthNumber] = state.healthCalendarMonth.split('-').map(Number);
    const month = monthNumber - 1;
    const prediction = WorkbenchHealthCore.prediction(state.cyclePeriods);
    const predictedDays = new Set(prediction.ready ? WorkbenchHealthCore.range(prediction.earliestStart, prediction.latestEnd) : []);
    const grid = WorkbenchHealthCore.monthMatrix(year, month);
    el('#cycleCalendarTitle').textContent = `${year}年${monthNumber}月`;
    setSafeMarkup(el('#cycleCalendarGrid'), grid.map(day => {
      const period = cyclePeriodForDay(day.key);
      const classes = ['cycle-day', day.currentMonth ? '' : 'outside', period ? 'recorded' : predictedDays.has(day.key) ? 'predicted' : '', period && day.key === period.start ? 'range-start' : '', period && day.key === period.end ? 'range-end' : ''].filter(Boolean).join(' ');
      const label = period ? '已记录周期' : predictedDays.has(day.key) ? '预测区间' : '无记录';
      return `<button class="${classes}" type="button" data-cycle-day="${day.key}" aria-label="${day.key}，${label}"><span>${day.day}</span>${period ? '<i>记录</i>' : predictedDays.has(day.key) ? '<i>预测</i>' : ''}</button>`;
    }).join(''));
    all('[data-cycle-day]', el('#cycleCalendarGrid')).forEach(button => button.addEventListener('click', () => openCyclePeriodDialog(cyclePeriodForDay(button.dataset.cycleDay), button.dataset.cycleDay)));
    const status = el('#cyclePredictionStatus');
    if (prediction.ready) {
      status.textContent = `${prediction.confidence}置信提示`; status.classList.remove('warning');
      el('#cyclePredictionTitle').textContent = `${prediction.earliestStart} 至 ${prediction.latestEnd}`;
      el('#cyclePredictionCopy').textContent = `根据最近 ${prediction.completeCount} 个完整周期估算，周期中位数 ${prediction.cycleLength} 天、经期中位数 ${prediction.duration} 天。预测不是医疗结论。`;
    } else {
      status.textContent = '数据不足'; status.classList.add('warning');
      el('#cyclePredictionTitle').textContent = '预测区间';
      el('#cyclePredictionCopy').textContent = `已记录 ${prediction.completeCount || 0} 个完整周期；至少需要3个未排除的完整周期才显示预测区间。`;
    }
    const stats = WorkbenchHealthCore.statistics(state.cyclePeriods);
    setSafeMarkup(el('#cycleStatistics'), `<span>完整记录 <b>${Number(stats.count) || 0}</b></span><span>平均周期 <b>${Number(stats.averageCycle) || '—'} 天</b></span><span>平均持续 <b>${Number(stats.averageDuration) || '—'} 天</b></span><span>波动范围 <b>${Number(stats.variation) || '—'} 天</b></span>`);
    const history = el('#cycleHistoryList');
    const historyMarkup = [...state.cyclePeriods].reverse().map(period => `<article><div><strong>${escapeHtml(period.start)} 至 ${escapeHtml(period.end)}</strong><span>${period.excludeFromPrediction ? '异常记录，不参与预测' : `流量 ${escapeHtml(period.flow || '未记录')} · 疼痛 ${escapeHtml(period.pain || '未记录')}`}</span></div><button class="button" type="button" data-cycle-edit="${escapeHtml(period.id)}">编辑</button></article>`).join('') + state.cyclePeriodTrash.map(period => `<article class="trashed"><div><strong>${escapeHtml(period.start)} 至 ${escapeHtml(period.end)}</strong><span>已删除 · 30天内可恢复</span></div><button class="button" type="button" data-cycle-restore="${escapeHtml(period.id)}">恢复</button></article>`).join('');
    setSafeMarkup(history, historyMarkup || '<div class="empty-state"><strong>尚无周期记录</strong><span>点击月历日期或“新增周期记录”开始。</span></div>');
    all('[data-cycle-edit]', history).forEach(button => button.addEventListener('click', () => openCyclePeriodDialog(state.cyclePeriods.find(period => String(period.id) === button.dataset.cycleEdit))));
    all('[data-cycle-restore]', history).forEach(button => button.addEventListener('click', () => restoreCyclePeriod(button.dataset.cycleRestore)));
  }

  function renderHealth() {
    if (!el('#healthTimeline')) return;
    const cycleEnabled = state.settings.menstrualTrackingEnabled !== false;
    const cycleButton = el('#addCyclePeriodButton'); if (cycleButton?.closest('.panel')) cycleButton.closest('.panel').hidden = !cycleEnabled;
    if (el('.cycle-calendar-panel')) el('.cycle-calendar-panel').hidden = !cycleEnabled;
    const total = state.exercises.reduce((sum, item) => sum + item.duration, 0);
    el('#exerciseMetric').textContent = `${state.exercises.length} / 2 次 · ${total} / 90 分钟`;
    el('#reviewExerciseSummary').textContent = `${total} 分钟`;
    const items = [
      { title: `饮水 ${state.water} ml`, meta: '今日累计 · 白水及其他饮品' },
      ...state.exercises.slice().reverse().slice(0, 5).map(item => ({ title: `${item.type} ${item.duration} 分钟`, meta: new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.date)) }))
    ];
    setSafeMarkup(el('#healthTimeline'), items.map(item => `<div><span></span><p><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.meta)}</small></p></div>`).join(''));
    if (cycleEnabled) renderCycleCalendar();
  }

  function addExercise(event) {
    event.preventDefault();
    const duration = Number(el('#exerciseDuration').value);
    if (!duration || duration < 1) return;
    state.exercises.push({ id: Date.now(), type: el('#exerciseType').value, duration, date: new Date().toISOString() });
    saveState();
    renderHealth();
    showToast('运动记录已保存');
  }

  function purgeExpiredCycleTrash() {
    const cutoff = Date.now() - 30 * 86400000;
    const before = state.cyclePeriodTrash.length;
    state.cyclePeriodTrash = state.cyclePeriodTrash.filter(period => new Date(period.deletedAt).getTime() > cutoff);
    if (state.cyclePeriodTrash.length !== before) saveState();
  }

  function renderReview() {
    if (!el('#reviewForm')) return;
    const record = WorkbenchReviewCore.ensureRecord(state.reviews, activeReviewDate);
    const current = record.versions.find(item => item.id === record.currentVersionId);
    const done = state.tasks.filter(task => task.done).length;
    const keyTasks = state.tasks.filter(task => task.key);
    const keyDone = keyTasks.filter(task => task.done).length;
    el('#reviewTaskSummary').textContent = `${done} / ${state.tasks.length} 完成`;
    el('#reviewKeySummary').textContent = `${keyDone} / ${keyTasks.length}`;
    el('#reviewEnglishSummary').textContent = `${state.words.filter(word => (word.lastReviewedAt || '').slice(0, 10) === activeReviewDate).length} 词`;
    el('#reviewWaterSummary').textContent = `${state.water} ml`;
    el('#reviewExerciseSummary').textContent = `${state.exercises.filter(item => (item.date || '').slice(0, 10) === activeReviewDate).reduce((sum, item) => sum + Number(item.duration || 0), 0)} 分钟`;
    const ratingNames = [['energy','精力'], ['stress','压力'], ['satisfaction','满意度'], ['focus','专注度'], ['physical','身体状态']];
    setSafeMarkup(el('#ratingGrid'), ratingNames.map(([key, name]) => `<fieldset><legend>${escapeHtml(name)}</legend><div class="rating-options">${[1,2,3,4,5].map(value => `<label><input type="radio" name="rating-${escapeHtml(key)}" value="${value}" ${Number(record.draft.ratings[key]) === value ? 'checked' : ''}><span>${value}</span></label>`).join('')}</div></fieldset>`).join(''));
    WorkbenchReviewCore.QUESTIONS.forEach(name => { const input = el(`[name="${name}"]`, el('#reviewForm')); if (input) input.value = record.draft.answers[name] || ''; });
    el('#reviewHeadline').textContent = record.headline; el('#reviewDate').value = activeReviewDate; el('#reviewDate').max = WorkbenchReviewCore.localDateKey();
    el('#reviewMonthEnd').hidden = !WorkbenchReviewCore.isMonthEnd(activeReviewDate); el('#reviewEntryState').hidden = Boolean(current); el('#reviewResultState').hidden = !current;
    el('#reviewDraftStatus').textContent = record.draft.updatedAt ? '草稿已保存' : '草稿自动保存';
    if (current) renderReviewResult(record, current);
  }

  function saveReview(submit, silent = false) {
    const form = el('#reviewForm');
    const record = WorkbenchReviewCore.ensureRecord(state.reviews, activeReviewDate);
    WorkbenchReviewCore.QUESTIONS.forEach(name => { const input = el(`[name="${name}"]`, form); if (input) record.draft.answers[name] = input.value; });
    WorkbenchReviewCore.RATINGS.forEach(name => { const checked = el(`[name="rating-${name}"]:checked`, form); record.draft.ratings[name] = checked ? Number(checked.value) : null; });
    record.draft.updatedAt = new Date().toISOString();
    if (submit) {
      const result = WorkbenchReviewCore.submit(record);
      if (!result.ok) { showToast(result.validation.reason === 'future_date' ? '不能填写未来日期的复盘' : '请完成三项核心问题和全部主观量表'); return false; }
    }
    saveState();
    renderReview();
    if (submit) setTimeout(generateReviewAi, 320);
    if (!silent) showToast(submit ? '今日复盘已提交' : '复盘草稿已保存');
    return true;
  }

  function renderReviewResult(record, version) {
    const doneTasks = state.tasks.filter(task => task.done); const rate = state.tasks.length ? Math.round(doneTasks.length / state.tasks.length * 100) : 0;
    el('#reviewResultStatus').textContent = version.late ? '迟补复盘' : '按时提交'; el('#reviewResultTime').textContent = new Date(version.submittedAt).toLocaleString('zh-CN'); el('#reviewResultVersion').textContent = `V${version.number}`;
    el('#reviewEncouragement').textContent = doneTasks.length ? `今天完成了 ${doneTasks.length} 项任务，你的推进已有清晰证据。` : '你认真记录了今天，也为明天确定了第一步。';
    el('#reviewEncouragementBasis').textContent = `依据 ${state.tasks.length} 项任务、${state.words.length} 个词汇记录和本次复盘生成。`;
    const key = state.tasks.filter(task => task.key).slice(0, 3); const minutes = doneTasks.reduce((sum, task) => sum + Number(task.estimate || 0), 0);
    setSafeMarkup(el('#reviewVisualSummary'), `<div class="review-ring" style="--progress:${Number(rate) * 3.6}deg"><b>${Number(rate)}%</b><span>任务完成率</span></div><div class="review-chart"><b>关键任务</b>${key.length ? key.map(task => `<div><span>${escapeHtml(task.title)}</span><i class="${task.done ? 'done' : ''}">${task.done ? '已完成' : '未完成'}</i></div>`).join('') : '<p>今日没有关键任务</p>'}</div><div class="review-chart"><b>投入时间</b><div class="review-bar"><i style="width:${Math.min(100, Number(minutes) / 3)}%"></i></div><span>已完成任务估算 ${Number(minutes)} 分钟</span></div>`);
    const libraryToday = state.library.filter(item => (item.createdAt || '').slice(0, 10) === activeReviewDate);
    setSafeMarkup(el('#reviewEvidenceGallery'), libraryToday.length ? libraryToday.slice(0, 6).map(item => `<button class="review-evidence" type="button" ${item.path ? `data-library-open="${escapeHtml(item.path)}"` : ''}><b>${escapeHtml(item.title || item.name || '成果文件')}</b><span>${escapeHtml(item.type || '本地资料')}</span></button>`).join('') : '<div class="empty-state compact-empty"><strong>今日暂无成果附件</strong><span>从任务、论文项目或资料库关联文件后将在这里直接展示。</span></div>');
    const coreLabels = [['completed','今天完成了什么'], ['obstacle','最大的阻碍'], ['tomorrow','明天最重要的一件事']];
    setSafeMarkup(el('#reviewAnswerSnapshot'), coreLabels.map(([keyName,label]) => `<article><span>${escapeHtml(label)}</span><p>${escapeHtml(version.answers[keyName] || '未填写')}</p></article>`).join('') + `<div class="review-rating-snapshot">${[['energy','精力'],['stress','压力'],['satisfaction','满意度'],['focus','专注度'],['physical','身体状态']].map(([keyName,label]) => `<span>${label}<b>${Number(version.ratings[keyName]) || 0}</b></span>`).join('')}</div>`);
    setSafeMarkup(el('#reviewFurtherSnapshot'), WorkbenchReviewCore.QUESTIONS.filter(keyName => !['completed','obstacle','tomorrow'].includes(keyName)).map(keyName => version.answers[keyName] ? `<p>${escapeHtml(version.answers[keyName])}</p>` : '').join('') || '<p>没有补充内容。</p>');
    const actionId = WorkbenchReviewCore.actionId(version.id, 'task', 0); const written = record.actionWrites[actionId];
    setSafeMarkup(el('#reviewActionDrafts'), `<label class="review-action-draft"><input type="checkbox" data-review-action="${escapeHtml(actionId)}" ${written ? 'checked disabled' : 'checked'}><span><b>${escapeHtml(version.answers.tomorrow)}</b><small>${written ? '已写入待办' : '来源：明天最重要的一件事'}</small></span></label>`);
  }

  function editReviewHeadline() {
    const record = WorkbenchReviewCore.ensureRecord(state.reviews, activeReviewDate);
    const value = window.prompt('编辑复盘页标题', record.headline);
    if (value === null) return;
    if (!value.trim()) { showToast('标题不能为空'); return; }
    record.headline = value.trim().slice(0, 80); saveState(); renderReview();
  }

  function editSubmittedReview() {
    const record = WorkbenchReviewCore.ensureRecord(state.reviews, activeReviewDate);
    record.currentVersionId = null; saveState(); renderReview(); showToast('已载入当前内容，重新提交将创建新版本');
  }

  function showReviewHistory() {
    const records = Object.values(state.reviews.byDate).filter(item => item.versions.length).sort((a, b) => b.date.localeCompare(a.date));
    if (!records.length) { showToast('尚无已提交的复盘'); return; }
    const chosen = window.prompt(`输入要查看的日期：\n${records.map(item => `${item.date}（${item.versions.length}个版本）`).join('\n')}`, records[0].date);
    if (!chosen) return;
    if (!state.reviews.byDate[chosen]) { showToast('未找到该日期的复盘'); return; }
    activeReviewDate = chosen; const record = state.reviews.byDate[chosen];
    if (record.versions.length > 1) {
      const versionNumber = window.prompt(`选择版本（1-${record.versions.length}）`, String(record.versions.length));
      if (versionNumber === null) return; const version = record.versions.find(item => item.number === Number(versionNumber)); if (!version) { showToast('版本不存在'); return; } record.currentVersionId = version.id;
    } else record.currentVersionId = record.versions.at(-1)?.id || null;
    renderReview();
  }

  function writeReviewActions() {
    const record = WorkbenchReviewCore.ensureRecord(state.reviews, activeReviewDate); const version = record.versions.find(item => item.id === record.currentVersionId); if (!version) return;
    const selected = all('[data-review-action]:checked:not(:disabled)'); if (!selected.length) { showToast('没有待写入的行动'); return; }
    if (!window.confirm(`将 ${selected.length} 项行动写入今日待办，是否继续？`)) return;
    selected.forEach(input => { const sourceId = input.dataset.reviewAction; if (record.actionWrites[sourceId] || state.tasks.some(task => task.sourceId === sourceId)) return; const task = { id: Date.now() + Math.random(), title: version.answers.tomorrow, category: '今日复盘', goal: '复盘行动', priority: '高', estimate: 30, key: true, done: false, sourceId, createdAt: new Date().toISOString() }; state.tasks.unshift(task); record.actionWrites[sourceId] = { taskId: task.id, writtenAt: new Date().toISOString() }; });
    saveState(); renderTasks(); renderReview(); showToast('所选行动已写入待办');
  }

  async function generateReviewAi() {
    const record = WorkbenchReviewCore.ensureRecord(state.reviews, activeReviewDate); const version = record.versions.find(item => item.id === record.currentVersionId); if (!version) return;
    const target = el('#reviewAiResult'); setSafeMarkup(target, '<p>正在基于本次复盘和今日聚合事实生成建议…</p>');
    try {
      const prompt = `你只负责每日复盘建议。基于给定事实，输出简短鼓励、一个明日优先建议和依据，不诊断、不虚构。\n${JSON.stringify({ date: activeReviewDate, tasks: state.tasks.map(task => ({ title: task.title, done: task.done, key: task.key })), review: version })}`;
      const config = assertAiAvailable('review'); const result = await callNative('sendAiChat', { account: config.account, provider: config.provider, baseUrl: config.baseUrl, model: config.model, prompt, context: { feature: '今日复盘', allowedFields: ['任务完成状态', '复盘回答', '主观量表'] }, attachments: [], history: [] });
      const text = result.reply || result.content || result.message || 'AI 已返回，但内容为空。'; record.aiByVersion[version.id] = { text, createdAt: new Date().toISOString(), model: config.model }; saveState(); setSafeMarkup(target, `<p>${escapeHtml(text)}</p><small>依据：本次复盘、今日任务完成状态与量表</small>`);
    } catch (error) { setSafeMarkup(target, `<p>AI 建议生成失败：${escapeHtml(error.detail || error.message)}</p><small>复盘已保存在 SQLite，可稍后重试。</small>`); }
  }

  function exportCurrentReview() {
    const record = WorkbenchReviewCore.ensureRecord(state.reviews, activeReviewDate); const version = record.versions.find(item => item.id === record.currentVersionId); if (!version) return;
    const body = `# ${record.headline}\n\n日期：${activeReviewDate}\n版本：V${version.number}\n\n## 今天完成了什么\n${version.answers.completed}\n\n## 最大阻碍\n${version.answers.obstacle}\n\n## 明天最重要的一件事\n${version.answers.tomorrow}\n`;
    const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `今日复盘-${activeReviewDate}.md`; link.click(); URL.revokeObjectURL(link.href); showToast('复盘已导出为 Markdown');
  }

  function openCalendarItemDialog(item = null, preset = {}) {
    const date = item?.date || preset.date || dateKey(new Date());
    const start = item?.start || preset.time || '09:00';
    const startMinutes = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
    const endMinutes = Math.min(23 * 60 + 59, startMinutes + 60);
    el('#calendarItemDialogTitle').textContent = item ? '编辑工作项' : '增加工作项';
    el('#calendarItemId').value = item?.id || '';
    el('#calendarItemTitle').value = item?.title || '';
    el('#calendarItemDate').value = date;
    el('#calendarItemWeekday').value = String(parseDateKey(date).getDay());
    el('#calendarItemStart').value = start;
    el('#calendarItemEnd').value = item?.end || `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
    el('#calendarItemLocation').value = item?.location || '';
    el('#calendarItemContent').value = item?.content || '';
    el('#calendarItemError').textContent = '';
    el('#deleteCalendarItemButton').hidden = !item;
    el('#calendarItemDialog').showModal();
    setTimeout(() => el('#calendarItemTitle').focus(), 0);
  }

  function saveCalendarItem() {
    const id = el('#calendarItemId').value;
    const title = el('#calendarItemTitle').value.trim();
    const date = el('#calendarItemDate').value;
    const start = el('#calendarItemStart').value;
    const end = el('#calendarItemEnd').value;
    if (!title || !date || !start || !end) {
      el('#calendarItemError').textContent = '名称、日期、星期和时间段为必填项。';
      return false;
    }
    if (end <= start) {
      el('#calendarItemError').textContent = '结束时间必须晚于开始时间。';
      return false;
    }
    const record = { id: id || `calendar-${Date.now()}`, title, date, weekday: Number(el('#calendarItemWeekday').value), start, end, location: el('#calendarItemLocation').value.trim(), content: el('#calendarItemContent').value.trim() };
    const existingIndex = state.calendarItems.findIndex(item => String(item.id) === String(id));
    if (existingIndex >= 0) state.calendarItems[existingIndex] = record;
    else state.calendarItems.push(record);
    saveState();
    renderCalendar();
    el('#calendarItemDialog').close('saved');
    showToast(existingIndex >= 0 ? '工作项已更新' : '工作项已加入日历');
    return true;
  }

  function deleteCalendarItem() {
    const id = el('#calendarItemId').value;
    const index = state.calendarItems.findIndex(item => String(item.id) === String(id));
    if (index < 0) return;
    state.recycleBin.push({ type: 'calendar-item', deletedAt: new Date().toISOString(), item: state.calendarItems[index] });
    state.calendarItems.splice(index, 1);
    saveState();
    renderCalendar();
    el('#calendarItemDialog').close('deleted');
    showToast('工作项已移入回收站，将保留30天');
  }

  function renderCalendarSettings() {
    el('#timetableEnabledSetting').checked = Boolean(state.settings.timetableEnabled);
    const list = el('#calendarPeriodList');
    list.replaceChildren();
    state.settings.calendarPeriods.forEach(period => addCalendarPeriodRow(period));
    if (!state.settings.calendarPeriods.length) setSafeMarkup(list, '<p class="calendar-period-empty">尚未设置工作时间段</p>');
    setCalendarPeriodsEditing(false);
    const timetable = state.settings.timetable;
    el('#semesterNameSetting').value = timetable.semesterName || '';
    el('#semesterWeeksSetting').value = timetable.semesterWeeks || 20;
    el('#semesterStartSetting').value = timetable.semesterStart || '';
    const coursePeriodList = el('#coursePeriodList');
    coursePeriodList.replaceChildren();
    timetable.coursePeriods.forEach(period => addCoursePeriodRow(period));
    if (!timetable.coursePeriods.length) setSafeMarkup(coursePeriodList, '<p class="calendar-period-empty">尚未设置课程节次</p>');
    renderCourseSettingsList();
    updateTimetableVisibility();
  }

  function updateTimetableVisibility() {
    const enabled = el('#timetableEnabledSetting').checked;
    el('#timetableSettingsSection').hidden = !enabled;
    el('#calendarModeSwitch').hidden = !enabled;
    if (!enabled && state.settings.calendarMode === 'timetable') state.settings.calendarMode = 'work';
  }

  function setCalendarPeriodsEditing(editing) {
    el('#workCalendarPeriodSection').classList.toggle('editing', editing);
    all('.calendar-period-row input, .calendar-period-row select, .calendar-period-row [data-remove-period]', el('#calendarPeriodList')).forEach(control => { control.disabled = !editing; });
    el('#addCalendarPeriodButton').disabled = !editing;
    el('#saveCalendarSettingsButton').disabled = !editing;
    el('#editCalendarPeriodsButton').textContent = editing ? '正在修改' : '修改日历时间段';
  }

  function addCalendarPeriodRow(period = {}) {
    const list = el('#calendarPeriodList');
    el('.calendar-period-empty', list)?.remove();
    const row = document.createElement('div');
    row.className = 'calendar-period-row';
    row.dataset.periodId = period.id || `period-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setSafeMarkup(row, `<select data-period-group aria-label="时间段分组"><option value="上午" ${period.group === '下午' ? '' : 'selected'}>上午</option><option value="下午" ${period.group === '下午' ? 'selected' : ''}>下午</option></select><input data-period-name maxlength="40" value="${escapeHtml(period.name || '')}" placeholder="自定义名称" aria-label="时间段名称"><input data-period-start type="time" value="${escapeHtml(period.start || '')}" aria-label="开始时间"><span>至</span><input data-period-end type="time" value="${escapeHtml(period.end || '')}" aria-label="结束时间"><button class="icon-button" type="button" data-remove-period aria-label="删除时间段">×</button>`);
    list.appendChild(row);
  }

  function addCoursePeriodRow(period = {}) {
    const list = el('#coursePeriodList');
    el('.calendar-period-empty', list)?.remove();
    const row = document.createElement('div');
    row.className = 'calendar-period-row course-period-row';
    row.dataset.coursePeriodId = period.id || `course-period-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setSafeMarkup(row, `<select data-course-period-group aria-label="课程节次分组"><option value="上午" ${period.group === '下午' ? '' : 'selected'}>上午</option><option value="下午" ${period.group === '下午' ? 'selected' : ''}>下午</option></select><input data-course-period-name maxlength="40" value="${escapeHtml(period.name || '')}" placeholder="第一节" aria-label="节次名称"><input data-course-period-start type="time" value="${escapeHtml(period.start || '')}" aria-label="开始时间"><span>至</span><input data-course-period-end type="time" value="${escapeHtml(period.end || '')}" aria-label="结束时间"><button class="icon-button" type="button" data-remove-course-period aria-label="删除课程节次">×</button>`);
    list.appendChild(row);
  }

  function saveCalendarSettings() {
    const periods = all('.calendar-period-row').map(row => ({ id: row.dataset.periodId, group: el('[data-period-group]', row).value, name: el('[data-period-name]', row).value.trim(), start: el('[data-period-start]', row).value, end: el('[data-period-end]', row).value }));
    const invalid = periods.find(period => !period.name || !period.start || !period.end || period.end <= period.start);
    if (invalid) { el('#calendarSettingsStatus').textContent = '请填写名称和有效的起止时间'; return; }
    const ordered = periods.slice().sort((a, b) => a.start.localeCompare(b.start));
    const overlap = ordered.some((period, index) => index > 0 && period.start < ordered[index - 1].end);
    if (overlap) { el('#calendarSettingsStatus').textContent = '存在重叠时间段，无法保存'; return; }
    state.settings.calendarPeriods = periods;
    state.settings.timetableEnabled = el('#timetableEnabledSetting').checked;
    saveState();
    setCalendarPeriodsEditing(false);
    el('#calendarSettingsStatus').textContent = '日历设置已保存';
    showToast('日历设置已保存');
  }

  function saveTimetableSettings() {
    const timetable = state.settings.timetable;
    const semesterName = el('#semesterNameSetting').value.trim();
    const semesterWeeks = Number(el('#semesterWeeksSetting').value);
    const semesterStart = el('#semesterStartSetting').value;
    const periods = all('.course-period-row').map(row => ({ id: row.dataset.coursePeriodId, group: el('[data-course-period-group]', row).value, name: el('[data-course-period-name]', row).value.trim(), start: el('[data-course-period-start]', row).value, end: el('[data-course-period-end]', row).value }));
    if (!semesterName || !semesterStart || !semesterWeeks) { el('#timetableSettingsStatus').textContent = '请填写学期名称、周数和开学日期'; return; }
    const invalid = periods.find(period => !period.name || !period.start || !period.end || period.end <= period.start);
    if (invalid) { el('#timetableSettingsStatus').textContent = '请填写有效的课程节次名称与时间'; return; }
    const ordered = periods.slice().sort((a, b) => a.start.localeCompare(b.start));
    if (ordered.some((period, index) => index > 0 && period.start < ordered[index - 1].end)) { el('#timetableSettingsStatus').textContent = '课程节次时间存在重叠'; return; }
    Object.assign(timetable, { semesterName, semesterWeeks, semesterStart, coursePeriods: periods });
    saveState();
    renderCalendar();
    el('#timetableSettingsStatus').textContent = '课程表设置已保存';
    showToast('课程表设置已保存');
  }

  function currentCoursePeriodsFromForm() {
    return all('.course-period-row').map(row => ({ id: row.dataset.coursePeriodId, name: el('[data-course-period-name]', row).value.trim() || '未命名节次', start: el('[data-course-period-start]', row).value, end: el('[data-course-period-end]', row).value }));
  }

  function renderCourseSettingsList() {
    const courses = state.settings.timetable.courses;
    setSafeMarkup(el('#courseList'), courses.length ? courses.map(course => {
      const periods = state.settings.timetable.coursePeriods;
      const start = periods.find(period => String(period.id) === String(course.startPeriodId));
      const end = periods.find(period => String(period.id) === String(course.endPeriodId));
      const weekLabel = { all: '全部周', odd: '单周', even: '双周', custom: course.customWeeks || '自定义' }[course.weekMode] || '全部周';
      return `<button class="course-setting-row" type="button" data-edit-course="${course.id}"><span class="course-color-dot" style="--course-color:${escapeHtml(course.color || '#6f8f87')}"></span><strong>${escapeHtml(course.name)}</strong><span>周${['日','一','二','三','四','五','六'][Number(course.weekday)]} · ${escapeHtml(start?.name || '未关联')}–${escapeHtml(end?.name || '未关联')}</span><span>${escapeHtml(weekLabel)}${course.location ? ` · ${escapeHtml(course.location)}` : ''}</span></button>`;
    }).join('') : '<p class="calendar-period-empty">尚未增加课程</p>');
  }

  function openCourseDialog(course = null, preset = {}) {
    const periods = currentCoursePeriodsFromForm();
    if (!periods.length) { showToast('请先增加并填写课程时间段'); return; }
    const options = periods.map((period, index) => `<option value="${period.id}">${escapeHtml(period.name || `第${index + 1}节`)}</option>`).join('');
    setSafeMarkup(el('#courseStartPeriod'), options);
    setSafeMarkup(el('#courseEndPeriod'), options);
    el('#courseDialogTitle').textContent = course ? '编辑课程' : '增加课程';
    el('#courseId').value = course?.id || '';
    el('#courseName').value = course?.name || '';
    el('#courseWeekday').value = String(course?.weekday ?? preset.weekday ?? 1);
    el('#courseLocation').value = course?.location || '';
    el('#courseStartPeriod').value = course?.startPeriodId || periods[preset.periodIndex || 0]?.id;
    el('#courseEndPeriod').value = course?.endPeriodId || periods[preset.periodIndex || 0]?.id;
    el('#courseWeekMode').value = course?.weekMode || 'all';
    el('#courseCustomWeeks').value = course?.customWeeks || '';
    el('#courseColor').value = course?.color || '#6f8f87';
    el('#courseFormError').textContent = '';
    el('#deleteCourseButton').hidden = !course;
    el('#courseDialog').showModal();
    setTimeout(() => el('#courseName').focus(), 0);
  }

  function saveCourse() {
    const id = el('#courseId').value;
    const name = el('#courseName').value.trim();
    const periods = currentCoursePeriodsFromForm();
    const startPeriodId = el('#courseStartPeriod').value;
    const endPeriodId = el('#courseEndPeriod').value;
    const startIndex = periods.findIndex(period => period.id === startPeriodId);
    const endIndex = periods.findIndex(period => period.id === endPeriodId);
    const weekMode = el('#courseWeekMode').value;
    const customWeeks = el('#courseCustomWeeks').value.trim();
    if (!name || startIndex < 0 || endIndex < startIndex) { el('#courseFormError').textContent = '请填写课程名，并确保结束节不早于开始节。'; return; }
    if (weekMode === 'custom' && !expandWeekSelection(customWeeks).length) { el('#courseFormError').textContent = '自定义周次格式应类似 1-8,10,12。'; return; }
    const course = { id: id || `course-${Date.now()}`, name, weekday: Number(el('#courseWeekday').value), location: el('#courseLocation').value.trim(), startPeriodId, endPeriodId, weekMode, customWeeks, color: el('#courseColor').value };
    const courses = state.settings.timetable.courses;
    const index = courses.findIndex(item => String(item.id) === String(id));
    if (index >= 0) courses[index] = course;
    else courses.push(course);
    saveState();
    renderCourseSettingsList();
    renderCalendar();
    el('#courseDialog').close('saved');
    showToast(index >= 0 ? '课程已更新' : '课程已增加');
  }

  function deleteCourse() {
    const id = el('#courseId').value;
    state.settings.timetable.courses = state.settings.timetable.courses.filter(course => String(course.id) !== String(id));
    saveState();
    renderCourseSettingsList();
    renderCalendar();
    el('#courseDialog').close('deleted');
    showToast('课程已删除');
  }

  function renderCalendar() {
    if (!state.settings.timetableEnabled) state.settings.calendarMode = 'work';
    const mode = state.settings.calendarMode || 'work';
    el('#calendarModeSwitch').hidden = !state.settings.timetableEnabled;
    all('[data-calendar-mode]').forEach(button => button.classList.toggle('active', button.dataset.calendarMode === mode));
    el('#calendarViewSwitch').hidden = mode === 'timetable';
    el('#addCalendarItemButton').textContent = mode === 'timetable' ? '增加课程' : '增加';
    if (mode === 'timetable') { renderTimetableCalendar(); return; }
    const view = state.settings.calendarView || 'week';
    all('[data-calendar-view]').forEach(button => button.classList.toggle('active', button.dataset.calendarView === view));
    el('#calendarTitle').textContent = view === 'week' ? '本周日历' : '本月日历';
    el('#calendarRangeLabel').textContent = view === 'week' ? '周一至周日 · 08:00–23:59' : `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`;
    el('#calendarHead').classList.toggle('month-calendar-head', view === 'month');
    el('#weekGrid').classList.toggle('month-grid', view === 'month');
    if (view === 'month') renderMonthCalendar();
    else renderWeekCalendar();
  }

  function renderTimetableCalendar() {
    const timetable = state.settings.timetable;
    const monday = startOfWeek(new Date());
    const days = Array.from({ length: 7 }, (_, index) => new Date(monday.getTime() + index * 86400000));
    const semesterStart = timetable.semesterStart ? startOfWeek(parseDateKey(timetable.semesterStart)) : null;
    const currentWeek = semesterStart ? Math.floor((monday - semesterStart) / (7 * 86400000)) + 1 : null;
    el('#calendarTitle').textContent = timetable.semesterName ? `${timetable.semesterName}课程表` : '本周课程表';
    el('#calendarRangeLabel').textContent = currentWeek && currentWeek > 0 ? `第 ${currentWeek} 周 · 周一至周日` : '请先在设置中填写学期与课程时间';
    el('#calendarHead').className = 'calendar-head';
    el('#weekGrid').className = 'week-grid timetable-grid';
    setSafeMarkup(el('#calendarHead'), '<div></div>' + days.map(day => `<div class="${sameDay(day, new Date()) ? 'today' : ''}"><strong>${['一','二','三','四','五','六','日'][dayIndex(day)]}</strong><span>${day.getMonth() + 1}/${day.getDate()}</span></div>`).join(''));
    const periods = timetable.coursePeriods || [];
    if (!periods.length) {
      setSafeMarkup(el('#weekGrid'), '<div class="timetable-empty">请前往“设置 → 日历”增加课程时间段</div>');
      return;
    }
    el('#weekGrid').style.gridTemplateRows = `repeat(${periods.length}, 76px)`;
    let grid = periods.map((period, row) => `<div class="time-cell course-time-cell" style="grid-column:1;grid-row:${row + 1}"><strong>${escapeHtml(period.name || `第${row + 1}节`)}</strong><span>${escapeHtml(period.start)}–${escapeHtml(period.end)}</span></div>${days.map((day, col) => `<button class="day-cell" type="button" data-course-date="${dateKey(day)}" data-course-period="${row}" style="grid-column:${col + 2};grid-row:${row + 1}" aria-label="增加周${['一','二','三','四','五','六','日'][col]}${escapeHtml(period.name || `第${row + 1}节`)}课程"></button>`).join('')}`).join('');
    timetable.courses.filter(course => courseRunsInWeek(course, currentWeek)).forEach(course => {
      const startIndex = periods.findIndex(period => String(period.id) === String(course.startPeriodId));
      const endIndex = periods.findIndex(period => String(period.id) === String(course.endPeriodId));
      if (startIndex < 0 || endIndex < startIndex) return;
      const column = ((Number(course.weekday) + 6) % 7) + 2;
      grid += `<button class="calendar-event course-event" type="button" data-course-id="${course.id}" style="grid-column:${column};grid-row:${startIndex + 1} / span ${endIndex - startIndex + 1};--course-color:${escapeHtml(course.color || '#6f8f87')}"><strong>${escapeHtml(course.name)}</strong>${course.location ? `<small>${escapeHtml(course.location)}</small>` : ''}</button>`;
    });
    setSafeMarkup(el('#weekGrid'), grid);
  }

  function courseRunsInWeek(course, week) {
    if (!week || week < 1) return false;
    if (course.weekMode === 'odd') return week % 2 === 1;
    if (course.weekMode === 'even') return week % 2 === 0;
    if (course.weekMode !== 'custom') return true;
    return expandWeekSelection(course.customWeeks).includes(week);
  }

  function expandWeekSelection(value) {
    const result = new Set();
    String(value || '').split(/[,，]/).map(part => part.trim()).filter(Boolean).forEach(part => {
      const match = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (match) for (let week = Number(match[1]); week <= Number(match[2]); week += 1) result.add(week);
      else if (/^\d+$/.test(part)) result.add(Number(part));
    });
    return [...result];
  }

  function renderWeekCalendar() {
    const monday = startOfWeek(new Date());
    const days = Array.from({ length: 7 }, (_, index) => new Date(monday.getTime() + index * 86400000));
    setSafeMarkup(el('#calendarHead'), '<div></div>' + days.map(day => `<div class="${sameDay(day, new Date()) ? 'today' : ''}"><strong>${['一','二','三','四','五','六','日'][dayIndex(day)]}</strong><span>${day.getMonth() + 1}/${day.getDate()}</span></div>`).join(''));
    let grid = '';
    for (let row = 0; row < 8; row += 1) {
      const hour = 8 + row * 2;
      grid += `<div class="time-cell" style="grid-column:1;grid-row:${row + 1}">${String(hour).padStart(2, '0')}:00</div>`;
      for (let col = 0; col < 7; col += 1) grid += `<button class="day-cell" type="button" data-calendar-date="${dateKey(days[col])}" data-calendar-time="${String(hour).padStart(2, '0')}:00" aria-label="增加 ${dateKey(days[col])} ${hour}点的工作项" style="grid-column:${col + 2};grid-row:${row + 1}"></button>`;
    }
    state.calendarItems.filter(item => days.some(day => dateKey(day) === item.date)).forEach(item => {
      const date = parseDateKey(item.date);
      const column = dayIndex(date) + 2;
      const hour = Number(item.start.split(':')[0]);
      const row = Math.max(1, Math.min(8, Math.floor((hour - 8) / 2) + 1));
      grid += `<button class="calendar-event" type="button" data-calendar-item-id="${item.id}" style="grid-column:${column};grid-row:${row}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.start)}–${escapeHtml(item.end)}</span>${item.location ? `<small>${escapeHtml(item.location)}</small>` : ''}</button>`;
    });
    setSafeMarkup(el('#weekGrid'), grid);
  }

  function renderMonthCalendar() {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const start = startOfWeek(first);
    const days = Array.from({ length: 42 }, (_, index) => new Date(start.getTime() + index * 86400000));
    setSafeMarkup(el('#calendarHead'), ['一', '二', '三', '四', '五', '六', '日'].map(day => `<div><strong>周${day}</strong></div>`).join(''));
    setSafeMarkup(el('#weekGrid'), days.map(day => {
      const key = dateKey(day);
      const items = state.calendarItems.filter(item => item.date === key);
      const summaries = items.slice(0, 3).map(item => `<button type="button" data-calendar-item-id="${item.id}">${escapeHtml(item.start)} ${escapeHtml(item.title)}</button>`).join('');
      const more = items.length > 3 ? `<span>另有 ${items.length - 3} 项</span>` : '';
      return `<article class="month-day ${day.getMonth() === today.getMonth() ? '' : 'outside'} ${sameDay(day, today) ? 'today' : ''}"><button class="month-day-add" type="button" data-calendar-date="${key}" aria-label="增加 ${key} 的工作项">${day.getDate()}</button><div>${summaries}${more}</div></article>`;
    }).join(''));
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function parseDateKey(value) {
    const [year, month, day] = String(value).split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function startOfWeek(date) {
    const result = new Date(date);
    const day = result.getDay() || 7;
    result.setDate(result.getDate() - day + 1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function sameDay(a, b) { return a.toDateString() === b.toDateString(); }
  function dayIndex(day) { return (day.getDay() + 6) % 7; }

  function switchView(view) {
    if (!isModuleEnabled(view)) { showToast('该模块已关闭，可在“设置 → 通用 → 模块管理”中开启'); return; }
    all('[data-view-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.viewPanel === view));
    all('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    if (view === 'ai') renderAiModelControls();
    if (view === 'paper-history') renderPaperHistory();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function applyPreferences() {
    const appearance = state.settings?.appearance || state.theme;
    document.documentElement.dataset.theme = appearance === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : appearance;
    el('#appShell').classList.toggle('compact', state.compact);
    el('#appShell').classList.toggle('sidebar-collapsed', state.sidebar);
    applyModulePreferences();
  }

  function addTask() {
    const title = el('#addTitle').value.trim();
    if (!title) return false;
    if (el('#addType').value === 'task') {
      state.tasks.unshift({ id: Date.now(), title, category: el('#addCategory').value, goal: '待关联目标', priority: el('#addPriority').value, estimate: 30, key: false, done: false, date: isoToday(), createdAt: new Date().toISOString() });
      saveState();
      renderTasks();
      renderReview();
      showToast('任务已添加到今日待办');
    } else {
      showToast(`${el('#addType').selectedOptions[0].text}已保存为原型记录`);
    }
    el('#addTitle').value = '';
    return true;
  }

  function search(query) {
    const normalized = query.trim().toLowerCase();
    const corpus = [
      ...state.tasks.map(task => ({ title: task.title, meta: `任务 · ${task.category}` })),
      ...goals.map(goal => ({ title: goal.title, meta: `目标 · ${goal.type}` })),
      ...news.map(item => ({ title: item[1], meta: `资讯 · ${item[0]}` })),
      ...state.words.map(word => ({ title: word.display, meta: '英语词汇 · 本地词表' }))
      ,...state.library.map(item => ({ title: item.title, meta: `资料 · ${item.category}` }))
      ,...paperRecommendations.map(item => ({ title: item.title, meta: `论文推荐 · ${item.topic}` }))
    ];
    const results = normalized ? corpus.filter(item => `${item.title} ${item.meta}`.toLowerCase().includes(normalized)).slice(0, 10) : corpus.slice(0, 5);
    setSafeMarkup(el('#searchResults'), results.length ? results.map(item => `<div class="search-result"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.meta)}</span></div>`).join('') : '<p class="muted-note">没有找到匹配内容</p>');
  }

  function showToast(message) {
    const toast = el('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function setSafeMarkup(target, markup) {
    if (!target) return;
    if (!window.DOMPurify) throw new Error('DOM sanitizer is unavailable');
    const fragment = window.DOMPurify.sanitize(String(markup || ''), {
      RETURN_DOM_FRAGMENT: true,
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base'],
      FORBID_ATTR: ['srcdoc'],
      SANITIZE_DOM: true,
      ALLOW_DATA_ATTR: true
    });
    target.replaceChildren(fragment);
  }

  function renderAiChat() {
    const target = el('#aiChatMessages');
    if (!target) return;
    const intro = '<div class="ai-message assistant"><b>成长规划 AI 助手</b><p>提交今日复盘后，可以让我结合今日任务、学习和健康汇总给出建议。月末还可以生成月总结与下月计划草案。</p></div>';
    setSafeMarkup(target, intro + state.aiChats.slice(-20).map(message => `<div class="ai-message ${message.role === 'user' ? 'user' : 'assistant'}"><b>${message.role === 'user' ? '你' : '成长规划 AI 助手'}</b><p>${escapeHtml(message.content)}</p></div>`).join(''));
    target.scrollTop = target.scrollHeight;
  }

  function availableAiModes() {
    const config = aiConfig('growth'); const provider = config.provider;
    const model = config.model || '当前配置模型';
    return [{ id: 'configured', label: model, detail: `${provider} 当前已保存模型` }];
  }

  function renderAiModelControls() {
    const modes = availableAiModes();
    if (!modes.some(mode => mode.id === state.aiMode)) state.aiMode = modes[0].id;
    const switcher = el('#aiModeSwitch');
    const selector = el('#aiChatModel');
    if (!switcher || !selector) return;
    switcher.style.setProperty('--ai-mode-count', modes.length);
    setSafeMarkup(switcher, modes.map(mode => `<button class="${mode.id === state.aiMode ? 'active' : ''}" type="button" data-ai-mode="${escapeHtml(mode.id)}"><b>${escapeHtml(mode.label)}</b><span>${escapeHtml(mode.detail)}</span></button>`).join(''));
    setSafeMarkup(selector, modes.map(mode => `<option value="${escapeHtml(mode.id)}" ${mode.id === state.aiMode ? 'selected' : ''}>${escapeHtml(mode.label)}</option>`).join(''));
    all('[data-ai-mode]', switcher).forEach(button => button.addEventListener('click', () => { state.aiMode = button.dataset.aiMode; saveState(); renderAiModelControls(); }));
  }

  async function refreshAiRuntimeStatus() {
    const status = el('#aiRuntimeStatus');
    if (!status) return;
    const config = aiConfig('growth'); status.textContent = `${config.provider} · ${config.model}`;
    status.classList.remove('warning');
    try {
      const keyStatus = await callNative('getAiKeyStatus', { account: config.account });
      if (!keyStatus.configured) { status.textContent = 'DeepSeek 密钥未保存'; status.classList.add('warning'); }
      else status.textContent = `DeepSeek 已配置 · ${keyStatus.persistence === 'session' ? '本次会话密钥' : '钥匙串密钥'}`;
    } catch (_) {
      status.textContent = '仅桌面版可调用 DeepSeek';
      status.classList.add('warning');
    }
  }

  function reviewContext() {
    return {
      date: isoToday(),
      tasks: state.tasks.map(task => ({ title: task.title, category: task.category, done: task.done, key: task.key, estimate: task.estimate })),
      english: { wordsRecorded: state.words.length, ieltsSessions: state.ieltsRecords.length, cet6Sessions: state.cet6Records.length },
      health: { waterMl: state.water, exerciseMinutes: state.exercises.reduce((sum, item) => sum + Number(item.duration || 0), 0) },
      review: state.review
    };
  }

  function readChatFile(file) {
    const textTypes = ['text/plain', 'text/markdown', 'text/csv', 'application/json'];
    if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('附件超过 5 MB'));
    if (file.type.startsWith('image/')) return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, mime: file.type, dataUrl: reader.result }); reader.onerror = () => reject(new Error('图片读取失败')); reader.readAsDataURL(file); });
    if (textTypes.includes(file.type) || /\.(txt|md|csv|json)$/i.test(file.name)) return file.text().then(text => ({ name: file.name, mime: file.type || 'text/plain', text: text.slice(0, 50000) }));
    return Promise.resolve({ name: file.name, mime: file.type || 'application/octet-stream', metadataOnly: true });
  }

  function setAiSendStatus(message, tone = '') {
    const status = el('#aiChatSendStatus');
    status.textContent = message;
    status.classList.toggle('error', tone === 'error');
    status.classList.toggle('success', tone === 'success');
  }

  async function sendAiChatMessage(event) {
    event.preventDefault();
    const input = el('#aiChatInput');
    const files = Array.from(el('#aiChatFiles').files || []);
    const prompt = input.value.trim();
    if (!prompt) { setAiSendStatus('请先输入消息。', 'error'); input.focus(); return; }
    if (files.length > 5) { setAiSendStatus('每次最多添加 5 个附件。', 'error'); return; }
    const selectedMode = el('#aiChatModel').value;
    state.aiMode = selectedMode;
    let config; try { config = assertAiAvailable('growth'); } catch (error) { setAiSendStatus(error.detail || error.message, 'error'); return; } const model = selectedMode === 'configured' ? config.model : selectedMode;
    const hasImages = files.some(file => file.type.startsWith('image/'));
    if (hasImages && config.provider === 'DeepSeek官方API') { setAiSendStatus('DeepSeek 官方当前接入的文本模型不支持图片，请移除图片或切换至支持视觉的服务。', 'error'); return; }
    const button = el('#sendAiChat');
    button.disabled = true;
    button.textContent = '…';
    setAiSendStatus(`正在通过 ${config.provider} · ${model} 发送…`);
    try {
      const keyStatus = await callNative('getAiKeyStatus', { account: config.account });
      if (!keyStatus.configured) throw new Error('key_not_found');
      const attachments = await Promise.all(files.map(readChatFile));
      state.aiChats.push({ role: 'user', content: prompt, at: new Date().toISOString() });
      saveState(); renderAiChat(); input.value = '';
      const result = await callNative('sendAiChat', { account: config.account, provider: config.provider, baseUrl: config.baseUrl, model, prompt, context: reviewContext(), attachments, history: state.aiChats.slice(-10) });
      state.aiChats.push({ role: 'assistant', content: result.content, at: new Date().toISOString(), model });
      saveState(); renderAiChat();
      el('#aiChatFiles').value = '';
      el('#aiChatFileSummary').textContent = '未添加附件';
      setAiSendStatus(`发送成功 · ${config.provider} · ${model}`, 'success');
    } catch (error) {
      const labels = { key_not_found: '未找到 DeepSeek 官方密钥，请打开 AI 设置重新输入并保存。', authentication_failed: 'DeepSeek 鉴权失败，请检查官方 API 密钥。', insufficient_balance: 'DeepSeek 官方账户余额不足，请充值后重试。', rate_limited: 'DeepSeek 服务限流，请稍后重试。', unsupported_provider: '当前服务尚未接通对话接口。', network_failed: '无法连接 api.deepseek.com。', invalid_response: 'DeepSeek 返回了无法解析的内容。', model_not_found: '当前模型不在 DeepSeek 官方模型列表中。', service_error: 'DeepSeek 拒绝了请求。', desktop_bridge_timeout: '请求超时，请稍后重试。' };
      const detail = error.detail ? ` ${error.detail}` : (error.status ? ` HTTP ${error.status}` : '');
      setAiSendStatus(`${labels[error.message] || `发送失败：${error.message}`}${detail}`, 'error');
    } finally {
      button.disabled = false;
      button.textContent = '↑';
    }
  }

  function bindEvents() {
    window.addEventListener('workbench-review-notification', event => { if (event.detail?.action === 'skipToday') { state.reviews.skippedDates = { ...(state.reviews.skippedDates || {}), [WorkbenchReviewCore.localDateKey()]: new Date().toISOString() }; saveState(); showToast('今日复盘提醒已跳过，不影响任何连续记录'); return; } activeReviewDate = WorkbenchReviewCore.localDateKey(); switchView('review'); renderReview(); });
    all('[data-dialog-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog')?.close('cancel')));
    all('[data-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
    all('[data-go-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.goView)));
    document.addEventListener('click', event => { const button = event.target.closest('.review-evidence[data-library-open]'); if (button) callNative('openLibraryFile', { path: button.dataset.libraryOpen }).catch(() => showToast('成果文件失效，请重新定位')); });
    all('[data-open-add]').forEach(button => button.addEventListener('click', () => el('#quickAddDialog').showModal()));
    el('#quickAddButton').addEventListener('click', () => el('#quickAddDialog').showModal());
    el('#saveQuickAdd').addEventListener('click', event => { if (!addTask()) event.preventDefault(); });
    el('#addGoalButton').addEventListener('click', openGoalDialog);
    el('#goalForm').addEventListener('submit', event => { event.preventDefault(); saveGoal(); });
    all('[data-calendar-view]').forEach(button => button.addEventListener('click', () => { state.settings.calendarView = button.dataset.calendarView; saveState(); renderCalendar(); }));
    all('[data-calendar-mode]').forEach(button => button.addEventListener('click', () => { state.settings.calendarMode = button.dataset.calendarMode; saveState(); renderCalendar(); }));
    el('#addCalendarItemButton').addEventListener('click', () => { if (state.settings.calendarMode === 'timetable') openCourseDialog(); else openCalendarItemDialog(); });
    el('#weekGrid').addEventListener('click', event => {
      const courseButton = event.target.closest('[data-course-id]');
      if (courseButton) { openCourseDialog(state.settings.timetable.courses.find(course => String(course.id) === courseButton.dataset.courseId)); return; }
      const courseCell = event.target.closest('[data-course-date]');
      if (courseCell) { openCourseDialog(null, { weekday: parseDateKey(courseCell.dataset.courseDate).getDay(), periodIndex: Number(courseCell.dataset.coursePeriod) }); return; }
      const itemButton = event.target.closest('[data-calendar-item-id]');
      if (itemButton) { openCalendarItemDialog(state.calendarItems.find(item => String(item.id) === itemButton.dataset.calendarItemId)); return; }
      const cell = event.target.closest('[data-calendar-date]');
      if (cell) openCalendarItemDialog(null, { date: cell.dataset.calendarDate, time: cell.dataset.calendarTime });
    });
    el('#calendarItemForm').addEventListener('submit', event => { event.preventDefault(); saveCalendarItem(); });
    el('#calendarItemDate').addEventListener('change', event => { if (event.target.value) el('#calendarItemWeekday').value = String(parseDateKey(event.target.value).getDay()); });
    el('#deleteCalendarItemButton').addEventListener('click', deleteCalendarItem);
    el('#editCalendarPeriodsButton').addEventListener('click', () => { setCalendarPeriodsEditing(true); el('#calendarSettingsStatus').textContent = '可修改名称与起止时间'; if (!state.settings.calendarPeriods.length) addCalendarPeriodRow(); });
    el('#addCalendarPeriodButton').addEventListener('click', () => { setCalendarPeriodsEditing(true); addCalendarPeriodRow(); });
    el('#calendarPeriodList').addEventListener('click', event => { const remove = event.target.closest('[data-remove-period]'); if (remove) { remove.closest('.calendar-period-row').remove(); if (!el('.calendar-period-row', el('#calendarPeriodList'))) setSafeMarkup(el('#calendarPeriodList'), '<p class="calendar-period-empty">尚未设置工作时间段</p>'); } });
    el('#saveCalendarSettingsButton').addEventListener('click', saveCalendarSettings);
    el('#timetableEnabledSetting').addEventListener('change', event => { state.settings.timetableEnabled = event.target.checked; updateTimetableVisibility(); saveState(); renderCalendar(); el('#calendarSettingsStatus').textContent = '课程表开关已保存'; });
    el('#addCoursePeriodButton').addEventListener('click', () => addCoursePeriodRow());
    el('#coursePeriodList').addEventListener('click', event => { const remove = event.target.closest('[data-remove-course-period]'); if (remove) { remove.closest('.course-period-row').remove(); if (!el('.course-period-row', el('#coursePeriodList'))) setSafeMarkup(el('#coursePeriodList'), '<p class="calendar-period-empty">尚未设置课程节次</p>'); } });
    el('#saveTimetableSettingsButton').addEventListener('click', saveTimetableSettings);
    el('#addCourseButton').addEventListener('click', () => openCourseDialog());
    el('#courseList').addEventListener('click', event => { const button = event.target.closest('[data-edit-course]'); if (button) openCourseDialog(state.settings.timetable.courses.find(course => String(course.id) === button.dataset.editCourse)); });
    el('#courseForm').addEventListener('submit', event => { event.preventDefault(); saveCourse(); });
    el('#deleteCourseButton').addEventListener('click', deleteCourse);
    el('#searchButton').addEventListener('click', () => { search(''); el('#searchDialog').showModal(); setTimeout(() => el('#globalSearch').focus(), 0); });
    el('#globalSearch').addEventListener('input', event => search(event.target.value));
    all('[data-water]').forEach(button => button.addEventListener('click', () => { state.lastWater = state.water; state.water = Math.min(4000, state.water + Number(button.dataset.water)); saveState(); renderWater(); renderHealth(); showToast(`已记录 ${button.dataset.water} ml`); }));
    el('#undoWaterButton').addEventListener('click', () => { if (state.lastWater === null) { showToast('没有可撤销的饮水记录'); return; } const current = state.water; state.water = state.lastWater; state.lastWater = current; saveState(); renderWater(); renderHealth(); showToast('已撤销最近一次饮水记录'); });
    el('#addCyclePeriodButton').addEventListener('click', () => openCyclePeriodDialog());
    el('#cyclePeriodForm').addEventListener('submit', saveCyclePeriod);
    el('#deleteCyclePeriodButton').addEventListener('click', deleteCyclePeriod);
    el('#previousCycleMonthButton').addEventListener('click', () => shiftCycleMonth(-1));
    el('#nextCycleMonthButton').addEventListener('click', () => shiftCycleMonth(1));
    el('#todayCycleMonthButton').addEventListener('click', () => { state.healthCalendarMonth = isoMonthKey(new Date()); saveState(); renderHealth(); });
    el('#openCycleHistoryButton').addEventListener('click', () => { const list = el('#cycleHistoryList'); list.hidden = !list.hidden; el('#openCycleHistoryButton').textContent = list.hidden ? '查看历史记录' : '收起历史记录'; });
    el('#addWordsButton').addEventListener('click', addWords);
    el('#wordPracticeForm').addEventListener('submit', gradeWords);
    el('#clearWordAnswersButton').addEventListener('click', () => clearWordAnswers(false));
    el('#batchDeleteWordsButton').addEventListener('click', toggleWordBatchDelete);
    el('#wordRetryForm').addEventListener('submit', gradeWordRetry);
    el('#clearRetryAnswersButton').addEventListener('click', () => clearWordAnswers(true));
    el('#wordEditForm').addEventListener('submit', saveWordMeanings);
    el('#deleteEditingWordButton').addEventListener('click', () => { el('#wordEditDialog').close('delete'); trashWord(editingWordId); });
    el('#openWordBankButton').addEventListener('click', () => openWordManager('all'));
    el('#openMasteredWordsButton').addEventListener('click', () => openWordManager('mastered'));
    el('#wordManagerSearch').addEventListener('input', renderWordManager);
    el('#openWordTrashButton').addEventListener('click', () => { renderWordTrash(); el('#wordTrashDialog').showModal(); });
    el('#openCheckpointButton').addEventListener('click', openWordCheckpoint);
    el('#checkpointBackButton').addEventListener('click', () => el('#wordCheckpointDialog').close('back'));
    el('#confirmCheckpointButton').addEventListener('click', confirmWordCheckpoint);
    el('#wordOverrideForm').addEventListener('submit', saveWordOverride);
    el('#youdaoLookupForm').addEventListener('submit', lookupYoudao);
    el('#exerciseForm').addEventListener('submit', addExercise);
    el('#reviewForm').addEventListener('input', () => { clearTimeout(saveReview.timer); el('#reviewDraftStatus').textContent = '正在保存…'; saveReview.timer = setTimeout(() => saveReview(false, true), 450); });
    el('#saveReviewDraft').addEventListener('click', () => saveReview(false));
    el('#reviewForm').addEventListener('submit', event => { event.preventDefault(); saveReview(true); });
    el('#reviewDate').addEventListener('change', event => { if (event.target.value > WorkbenchReviewCore.localDateKey()) { showToast('不能选择未来日期'); event.target.value = activeReviewDate; return; } activeReviewDate = event.target.value; renderReview(); });
    el('#editReviewHeadline').addEventListener('click', editReviewHeadline);
    el('#editSubmittedReview').addEventListener('click', editSubmittedReview);
    el('#openReviewHistory').addEventListener('click', showReviewHistory);
    el('#reviewHistoryBottom').addEventListener('click', showReviewHistory);
    el('#writeReviewActions').addEventListener('click', writeReviewActions);
    el('#retryReviewAi').addEventListener('click', generateReviewAi);
    el('#exportReview').addEventListener('click', exportCurrentReview);
    el('#aiChatFiles').addEventListener('change', event => { const files = Array.from(event.target.files || []); el('#aiChatFileSummary').textContent = files.length ? files.map(file => file.name).join('、') : '未添加附件'; });
    el('#aiChatModel').addEventListener('change', event => { state.aiMode = event.target.value; saveState(); renderAiModelControls(); });
    el('#aiChatForm').addEventListener('submit', sendAiChatMessage);
    el('#openAiSettingsButton').addEventListener('click', () => { switchView('settings'); const tab = el('[data-settings-tab="ai"]'); if (tab) tab.click(); });
    el('#themeToggle').addEventListener('click', () => { const current = document.documentElement.dataset.theme; state.settings.appearance = current === 'light' ? 'dark' : 'light'; state.theme = state.settings.appearance; saveState(); applyPreferences(); renderSettings(); });
    el('#compactToggle').addEventListener('click', () => { state.compact = !state.compact; saveState(); applyPreferences(); });
    el('#sidebarToggle').addEventListener('click', () => { if (window.innerWidth <= 680) el('#appShell').classList.toggle('mobile-nav-open'); else { state.sidebar = !state.sidebar; saveState(); applyPreferences(); } });
    el('#mobileMenuButton').addEventListener('click', () => el('#appShell').classList.toggle('mobile-nav-open'));
    el('#privacyToggle').addEventListener('click', event => { const pressed = event.currentTarget.getAttribute('aria-pressed') === 'true'; event.currentTarget.setAttribute('aria-pressed', String(!pressed)); el('#appShell').classList.toggle('privacy-mode', !pressed); showToast(!pressed ? '隐私模式已开启' : '隐私模式已关闭'); });
    el('#timerButton').addEventListener('click', event => { const active = event.currentTarget.dataset.active === 'true'; event.currentTarget.dataset.active = String(!active); event.currentTarget.textContent = active ? '开始计时' : '暂停计时'; showToast(active ? '计时已暂停' : '已开始记录实际时长'); });
    el('#regenerateAdvice').addEventListener('click', event => { event.currentTarget.disabled = true; el('#adviceText').textContent = '正在根据今日任务、日程和目标状态生成建议…'; setTimeout(() => { el('#adviceText').textContent = '先完成小论文的可验证产出；若下午精力下降，将英语任务拆为阅读与词汇两个短时段。'; event.currentTarget.disabled = false; showToast('AI建议草案已更新，未自动调整计划'); }, 900); });
    el('#openLibraryAdd').addEventListener('click', () => { setSafeMarkup(el('#libraryFolderInput'), folderOptions(activeLibraryFolder === 'all' ? 'system-other' : activeLibraryFolder)); el('#libraryAddDialog').showModal(); });
    el('#createLibraryFolderButton').addEventListener('click', () => openLibraryFolderDialog());
    el('#libraryFolderForm').addEventListener('submit', saveLibraryFolder);
    el('#uploadLibraryFilesButton').addEventListener('click', () => chooseLibraryFiles('chooseLibraryFiles'));
    el('#uploadLibraryFolderButton').addEventListener('click', () => chooseLibraryFiles('chooseLibraryFolder'));
    el('#libraryImportForm').addEventListener('submit', importLibraryFiles);
    el('#saveLibraryItem').addEventListener('click', event => { if (!addLibraryItem()) event.preventDefault(); });
    el('#libraryFilter').addEventListener('input', renderLibrary);
    el('#openPaperHistoryButton').addEventListener('click', () => switchView('paper-history'));
    el('#refreshNewsButton').addEventListener('click', () => refreshNews(true));
    all('[data-news-filter]').forEach(button => button.addEventListener('click', () => {
      activeNewsFilter = button.dataset.newsFilter;
      all('[data-news-filter]').forEach(item => item.classList.toggle('active', item === button));
      renderNewsFeed();
    }));
    el('#refreshPapersButton').addEventListener('click', () => refreshPapers(true));
    document.addEventListener('click', event => { const button = event.target.closest('[data-external-url]'); if (button) callNative('openExternalURL', { url: button.dataset.externalUrl }).catch(() => showToast('无法使用默认浏览器打开链接')); });
    all('[data-cet6-tab]').forEach(button => button.addEventListener('click', () => { all('[data-cet6-tab]').forEach(item => item.classList.toggle('active', item === button)); all('[data-cet6-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.cet6Panel === button.dataset.cet6Tab)); }));
    el('#chooseCet6FolderButton').addEventListener('click', () => chooseCet6Materials('chooseCet6MaterialFolder'));
    el('#chooseCet6FilesButton').addEventListener('click', () => chooseCet6Materials('chooseCet6MaterialFiles'));
    el('#cet6ImportForm').addEventListener('submit', confirmCet6Import);
    el('#startCet6PaperButton').addEventListener('click', () => openCet6Setup('paper'));
    el('#startCet6ModulesButton').addEventListener('click', () => openCet6Setup('modules'));
    el('#startCet6PaperTimerButton').addEventListener('click', () => openCet6Setup('timer'));
    el('#cet6TimerMode').addEventListener('change', updateCet6SetupFields);
    el('#cet6TrainingMaterial').addEventListener('change', updateCet6SetupFields);
    el('#cet6AudioMode').addEventListener('change', updateCet6SetupFields);
    el('#cet6SetupForm').addEventListener('submit', createCet6Session);
    el('#resumeCet6SessionButton').addEventListener('click', () => state.cet6Training.active ? openCet6Training() : openCet6RecordDialog());
    el('#cet6StartPauseButton').addEventListener('click', toggleCet6Timer);
    el('#cet6EndButton').addEventListener('click', requestCet6End);
    el('#continueCet6TrainingButton').addEventListener('click', () => el('#cet6EndDialog').close('continue'));
    el('#discardCet6TrainingButton').addEventListener('click', discardCet6Session);
    el('#finishCet6TrainingButton').addEventListener('click', finishCet6Session);
    all('[data-cet6-extend]').forEach(button => button.addEventListener('click', () => extendCet6(Number(button.dataset.cet6Extend))));
    el('#customExtendCet6Button').addEventListener('click', () => extendCet6(Math.max(1, Number(el('#cet6CustomExtension').value)) * 60));
    el('#timeoutNextCet6Button').addEventListener('click', nextCet6Module);
    el('#cet6NextModuleButton').addEventListener('click', nextCet6Module);
    all('[data-cet6-audio]').forEach(button => button.addEventListener('click', handleCet6Audio));
    el('#cet6FocusButton').addEventListener('click', () => el('#cet6TrainingDialog').classList.toggle('focus-mode'));
    el('#cet6TrainingDialog').addEventListener('cancel', event => { event.preventDefault(); requestCet6End(); });
    el('#cet6TrainingRecordForm').addEventListener('submit', event => saveCet6TrainingRecord(event, false));
    el('#saveCet6RecordDraftButton').addEventListener('click', event => saveCet6TrainingRecord(event, true));
    el('#deferCet6RecordButton').addEventListener('click', event => saveCet6TrainingRecord(event, true));
    el('#changeCet6StorageButton').addEventListener('click', changeCet6Storage);
    el('#cet6SoundSetting').addEventListener('change', event => { state.settings.cet6Sound = event.target.checked; saveState(); });
    el('#cet6SleepSetting').addEventListener('change', event => { state.settings.cet6Sleep = event.target.value; saveState(); });
    el('#testCet6SoundButton').addEventListener('click', () => playCet6Alert(740, true));
    window.addEventListener('workbench-system-sleep', handleCet6SystemSleep);
    el('#choosePaperPdfButton').addEventListener('click', choosePaperPdf);
    el('#confirmPaperLibraryButton').addEventListener('click', confirmPaperLibrary);
    el('#openRecycleBinButton').addEventListener('click', () => { renderRecycleBin(); el('#recycleBinDialog').showModal(); });
    el('#emptyRecycleBinButton').addEventListener('click', emptyRecycleBin);
    all('[data-report-tab]').forEach(button => button.addEventListener('click', () => { all('[data-report-tab]').forEach(item => item.classList.toggle('active', item === button)); all('[data-report-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.reportPanel === button.dataset.reportTab)); }));
    all('[data-plan-level]').forEach(button => button.addEventListener('click', () => { state.reports.planLevel = button.dataset.planLevel; saveState(); renderReports(); }));
    el('#generateWeeklyButton').addEventListener('click', generateWeekly);
    el('#confirmWeeklyPlan').addEventListener('click', confirmWeekly);
    el('#generateMonthlyButton').addEventListener('click', generateMonthly);
    el('#confirmMonthlyButton').addEventListener('click', confirmMonthly);
    all('[data-settings-tab]').forEach(button => button.addEventListener('click', () => { all('[data-settings-tab]').forEach(item => item.classList.toggle('active', item === button)); all('[data-settings-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.settingsPanel === button.dataset.settingsTab)); }));
    el('#appearanceSetting').addEventListener('change', event => { state.settings.appearance = event.target.value; state.theme = event.target.value === 'dark' ? 'dark' : 'light'; saveState(); applyPreferences(); });
    el('#compactSetting').addEventListener('change', event => { state.compact = event.target.checked; saveState(); applyPreferences(); });
    el('#moduleSetupForm').addEventListener('submit', saveInitialModuleSetup);
    el('#moduleSetupDialog').addEventListener('cancel', event => event.preventDefault());
    all('[data-module-preset]').forEach(button => button.addEventListener('click', () => applyModulePreset(button.dataset.modulePreset)));
    ['#aiProfileSetting', '#aiProviderSetting', '#aiBaseUrlSetting', '#aiModelSetting', '#aiKeySetting', '#aiBudgetSetting', '#aiInputPriceSetting', '#aiOutputPriceSetting'].forEach(selector => el(selector)?.addEventListener('input', markAiSettingsDirty));
    el('#aiProviderSetting').addEventListener('change', applyAiProviderDefaults);
    el('#aiProfileSetting').addEventListener('change', refreshAiKeyStatus);
    el('#saveAiConfigButton').addEventListener('click', saveAiConfiguration);
    el('#saveRecommendationSettingsButton').addEventListener('click', saveRecommendationSettings);
    el('#testAiConnectionButton').addEventListener('click', testAiConnection);
    el('#deleteAiKeyButton').addEventListener('click', deleteAiKey);
    el('#saveYoudaoButton').addEventListener('click', saveYoudaoConfiguration);
    el('#testYoudaoButton').addEventListener('click', testYoudaoConnection);
    el('#deleteYoudaoButton').addEventListener('click', deleteYoudaoConfiguration);
    el('#changeDatabaseLocationButton').addEventListener('click', changeDatabaseLocation);
    el('#openDatabaseFolderButton').addEventListener('click', openDatabaseFolder);
    el('#changeLibraryStorageButton').addEventListener('click', changeLibraryStorage);
    el('#chooseApplicationIconButton').addEventListener('click', chooseApplicationIcon);
    el('#resetApplicationIconButton').addEventListener('click', resetApplicationIcon);
    el('#openPrivacyPolicyButton').addEventListener('click', () => el('#privacyPolicyDialog').showModal());
    el('#openPrivacyMode').addEventListener('click', () => el('#privacyToggle').click());
    all('.exam-record-form').forEach(form => {
      form.elements.date.value = isoToday();
      form.elements.module.addEventListener('change', () => toggleExamScoreFields(form));
      form.addEventListener('submit', saveExamRecord);
      toggleExamScoreFields(form);
    });
    all('[data-training]').forEach(button => button.addEventListener('click', () => showToast(`${button.dataset.training}：请先导入并配对合法资料`)));
    all('[data-import-placeholder]').forEach(button => button.addEventListener('click', () => showToast(`${button.dataset.importPlaceholder} 文件导入将在桌面版文件接口接入`)));
    all('[data-audio-toggle]').forEach(button => button.addEventListener('click', () => { button.textContent = button.textContent === '播放' ? '暂停' : '播放'; showToast('原型播放器未加载版权音频'); }));
    document.addEventListener('keydown', event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search(''); el('#searchDialog').showModal(); setTimeout(() => el('#globalSearch').focus(), 0); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); el('#quickAddDialog').showModal(); }
    });
  }

  function renderAllViews() {
    synchronizePaperArchive();
    setDates();
    renderTasks();
    renderGoals();
    renderNews();
    renderWater();
    renderCalendar();
    renderWords();
    renderHealth();
    renderReview();
    renderAiChat();
    renderAiModelControls();
    renderNewsFeed();
    renderPapers();
    renderPaperHistory();
    updateRecommendationStatus();
    renderLibrary();
    renderRecycleBin();
    renderResearch();
    renderExamRecords('ielts');
    renderExamRecords('cet6');
    renderCet6Materials();
    renderCet6CurrentSession();
    renderCet6Reviews();
    renderReports();
    renderSettings();
    applyPreferences();
  }

  window.WorkbenchPluginApi = Object.freeze({
    state,
    saveState,
    callNative,
    showToast,
    escapeHtml,
    isoToday,
    renderExamRecords,
    renderTasks,
    renderCalendar,
    renderLibrary,
    aiConfig,
    assertAiAvailable
  });

  renderAllViews();
  refreshAiRuntimeStatus();
  bindEvents();
  refreshAiKeyStatus();
  refreshYoudaoStatus();
  refreshApplicationIconStatus();
  refreshLibraryStorageInfo();
  refreshCet6StorageInfo();
  refreshBackupInfo();
  initializeDatabase();
  purgeExpiredRecycleBin();
  purgeExpiredCycleTrash();
  window.setInterval(purgeExpiredRecycleBin, 24 * 60 * 60 * 1000);
  window.setInterval(purgeExpiredCycleTrash, 24 * 60 * 60 * 1000);
  window.setInterval(purgeExpiredCet6Trash, 24 * 60 * 60 * 1000);
  window.setInterval(() => { if (state.wordLearning?.day !== learningDayKey()) renderWords(); }, 60 * 1000);
  window.setInterval(runRecommendationCatchUp, 15 * 60 * 1000);
  window.setInterval(maybeRunBackupCatchUp, 60 * 60 * 1000);
}());
