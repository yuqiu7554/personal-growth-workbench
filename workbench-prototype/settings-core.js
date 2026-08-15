(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkbenchSettingsCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ASSISTANTS = [
    ['growth', '成长规划 AI 助手', '跨模块对话与总体规划'],
    ['english', '英语学习 AI 助手', '词汇、学习计划与英语资料'],
    ['ielts', 'IELTS 训练 AI 助手', '口语、写作批改及训练建议'],
    ['cet6', 'CET-6 训练 AI 助手', '作文与翻译批改'],
    ['research', '论文项目 AI 助手', '项目规划、里程碑和研究缺口'],
    ['news', '今日热点 AI 助手', '摘要、翻译、关联性和排序'],
    ['papers', '每周论文 AI 助手', '摘要翻译、研究关联和阅读排序'],
    ['health', '运动健康 AI 助手', '个人记录趋势与非医疗建议'],
    ['review', '今日复盘 AI 助手', '提交后的建议与鼓励'],
    ['reports', '周月总结 AI 助手', '周总结、月总结及计划草案']
  ].map(([id, name, scope]) => ({ id, name, scope }));
  const clone = value => JSON.parse(JSON.stringify(value));
  function normalize(settings) {
    const source = settings && typeof settings === 'object' ? settings : {};
    const legacyId = String(source.aiProfile || 'deepseek-official');
    const profileSource = source.aiProfiles || source.profiles;
    const profiles = profileSource && typeof profileSource === 'object' ? clone(profileSource) : {};
    if (!profiles[legacyId]) profiles[legacyId] = { id: legacyId, name: legacyId, provider: source.aiProvider || 'DeepSeek官方API', baseUrl: source.aiBaseUrl || 'https://api.deepseek.com', defaultModel: source.aiModel || 'deepseek-chat', enabled: true };
    Object.values(profiles).forEach(profile => { profile.inputPricePerMillion = Math.max(0, Number(profile.inputPricePerMillion || 0)); profile.outputPricePerMillion = Math.max(0, Number(profile.outputPricePerMillion || 0)); });
    const profileId = profiles[legacyId] ? legacyId : Object.keys(profiles)[0];
    const priorSource = source.aiAssistants || source.assistants;
    const prior = priorSource && typeof priorSource === 'object' ? priorSource : {};
    const currentMonth = new Date().toISOString().slice(0, 7); const storedMonth = source.aiBudgetMonth || source.monthKey || currentMonth; const reset = storedMonth !== currentMonth;
    const assistants = Object.fromEntries(ASSISTANTS.map(def => [def.id, { profileId: prior[def.id]?.profileId || profileId, model: prior[def.id]?.model || profiles[profileId]?.defaultModel || '', budget: Math.max(0, Number(prior[def.id]?.budget || 0)), enabled: prior[def.id]?.enabled !== false, preview: prior[def.id]?.preview !== false, spent: reset ? 0 : Math.max(0, Number(prior[def.id]?.spent || 0)), inputTokens: reset ? 0 : Math.max(0, Number(prior[def.id]?.inputTokens || 0)), outputTokens: reset ? 0 : Math.max(0, Number(prior[def.id]?.outputTokens || 0)) }]));
    return { profiles, assistants, globalBudget: Math.max(0, Number(source.aiGlobalBudget ?? source.globalBudget ?? source.aiBudget ?? 0)), globalSpent: reset ? 0 : Math.max(0, Number(source.aiGlobalSpent ?? source.globalSpent ?? 0)), monthKey: currentMonth };
  }
  function resolve(settings, assistantId) {
    const model = normalize(settings); const assistant = model.assistants[assistantId] || model.assistants.growth; const profile = model.profiles[assistant.profileId] || Object.values(model.profiles)[0];
    return { assistantId, assistant, profile, account: profile?.id || '', provider: profile?.provider || '', baseUrl: profile?.baseUrl || '', model: assistant.model || profile?.defaultModel || '' };
  }
  function budgetStatus(settings, assistantId) {
    const model = normalize(settings); const assistant = model.assistants[assistantId] || model.assistants.growth;
    if (!assistant.enabled) return { allowed: false, reason: 'assistant_disabled' };
    if (model.globalBudget > 0 && model.globalSpent >= model.globalBudget) return { allowed: false, reason: 'global_budget_reached' };
    if (assistant.budget > 0 && assistant.spent >= assistant.budget) return { allowed: false, reason: 'assistant_budget_reached' };
    return { allowed: true, reason: null };
  }
  function addProfile(settings, profile) {
    const id = String(profile.id || '').trim(); if (!/^[A-Za-z0-9._-]{1,64}$/.test(id)) throw new Error('invalid_profile_id');
    const result = normalize(settings); result.profiles[id] = { id, name: String(profile.name || id).trim().slice(0, 64), provider: profile.provider, baseUrl: profile.baseUrl, defaultModel: profile.defaultModel, enabled: profile.enabled !== false }; return result;
  }
  return { ASSISTANTS, normalize, resolve, budgetStatus, addProfile };
});
