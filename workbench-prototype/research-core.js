(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkbenchResearchCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_STAGES = [
    '选题与研究问题', '文献检索与综述', '理论框架与假设', '数据与研究方法',
    '分析与结果', '初稿撰写', '导师修改', '投稿或答辩准备'
  ];

  const iso = value => value ? new Date(value).toISOString().slice(0, 10) : '';
  const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const clamp = value => Math.max(0, Math.min(100, Number(value) || 0));

  function defaultStages(startDate = '', endDate = '') {
    return DEFAULT_STAGES.map((name, index) => ({
      id: uid('stage'), name, weight: index < 4 ? 13 : 12, order: index,
      startDate: index === 0 ? startDate : '', endDate: index === DEFAULT_STAGES.length - 1 ? endDate : '',
      milestones: []
    }));
  }

  function createProject(input = {}) {
    const id = input.id || uid('project');
    const stages = input.template === 'blank' ? [] : defaultStages(input.startDate, input.endDate);
    return {
      id, title: input.title || '未命名项目', type: input.type || '自定义', status: input.status || '未开始',
      startDate: iso(input.startDate), endDate: iso(input.endDate), direction: input.direction || '',
      description: input.description || '', supervisor: input.supervisor || '', color: input.color || '#64748b',
      goalId: input.goalId || '', stages, assets: [], advisorItems: [], versions: [], logs: [], blockers: [],
      aiChats: [], aiDrafts: [], activity: [], originalBaseline: { startDate: iso(input.startDate), endDate: iso(input.endDate) },
      archivedAt: null, createdAt: input.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
    };
  }

  function migrateProject(key, legacy) {
    if (legacy.id && Array.isArray(legacy.stages)) return legacy;
    const project = createProject({
      id: key, title: legacy.title, type: key === 'paper' ? '小论文' : key === 'thesis' ? '毕业论文' : '自定义',
      status: '进行中'
    });
    const stageIndex = Math.max(0, Math.min(DEFAULT_STAGES.length - 1, Number(legacy.stage) || 0));
    project.stages.forEach((stage, index) => {
      if (index < stageIndex) stage.milestones.push({ id: uid('milestone'), title: `${stage.name}阶段确认`, required: true, weight: 1, completedAt: project.createdAt, evidence: [{ type: '历史迁移', value: '原工作台进度' }] });
    });
    project.stages[stageIndex].milestones.push({ id: uid('milestone'), title: legacy.milestone || '确认当前阶段成果', required: true, weight: 1, startDate: '', endDate: '', evidence: [] });
    project.legacyProgress = clamp(legacy.progress);
    return project;
  }

  function migrateResearch(research = {}) {
    const source = research.projects || {};
    const projects = {};
    Object.entries(source).forEach(([key, value]) => { projects[key] = migrateProject(key, value || {}); });
    if (!Object.keys(projects).length) {
      projects.paper = createProject({ id: 'paper', title: '小论文', type: '小论文', status: '进行中' });
      projects.thesis = createProject({ id: 'thesis', title: '毕业论文', type: '毕业论文', status: '未开始' });
    }
    const active = projects[research.active] ? research.active : Object.keys(projects)[0];
    return { ...research, version: 2, active, projects, trash: research.trash || [], projectTrash: research.projectTrash || [], filters: research.filters || { statuses: ['进行中', '暂停'], query: '', baseline: false } };
  }

  function stageProgress(stage) {
    const milestones = stage.milestones || [];
    if (!milestones.length) return 0;
    const total = milestones.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 1), 0);
    const done = milestones.filter(item => item.completedAt).reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 1), 0);
    return total ? done / total * 100 : 0;
  }

  function projectProgress(project) {
    const stages = project.stages || [];
    const totalWeight = stages.reduce((sum, stage) => sum + Math.max(0, Number(stage.weight) || 0), 0);
    if (!totalWeight) return clamp(project.legacyProgress);
    const calculated = stages.reduce((sum, stage) => sum + stageProgress(stage) * Math.max(0, Number(stage.weight) || 0), 0) / totalWeight;
    return Math.round(Math.max(calculated, Number(project.legacyProgress) || 0));
  }

  function validateStageWeights(project) {
    const total = (project.stages || []).reduce((sum, stage) => sum + Number(stage.weight || 0), 0);
    return { valid: Math.abs(total - 100) < 0.001, total };
  }

  function completeMilestone(project, milestoneId, evidence, at = new Date().toISOString()) {
    for (const stage of project.stages || []) {
      const milestone = (stage.milestones || []).find(item => item.id === milestoneId);
      if (!milestone) continue;
      if (!evidence || !String(evidence.value || '').trim()) throw new Error('evidence_required');
      milestone.evidence = [...(milestone.evidence || []), evidence];
      milestone.completedAt = at;
      project.activity.unshift({ id: uid('activity'), type: 'milestone_completed', title: milestone.title, at });
      project.updatedAt = at;
      return milestone;
    }
    throw new Error('milestone_not_found');
  }

  function ganttRange(projects) {
    const dates = [];
    projects.forEach(project => {
      if (project.startDate) dates.push(project.startDate);
      if (project.endDate) dates.push(project.endDate);
      (project.stages || []).forEach(stage => {
        if (stage.startDate) dates.push(stage.startDate);
        if (stage.endDate) dates.push(stage.endDate);
        (stage.milestones || []).forEach(item => { if (item.startDate) dates.push(item.startDate); if (item.endDate) dates.push(item.endDate); });
      });
    });
    if (!dates.length) return null;
    const start = new Date(`${dates.sort()[0]}T00:00:00`);
    const end = new Date(`${dates.sort().at(-1)}T00:00:00`);
    const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
    return { start: iso(start), end: iso(end), days, scale: days <= 45 ? '日' : days <= 240 ? '周' : '月' };
  }

  return { DEFAULT_STAGES, createProject, migrateResearch, stageProgress, projectProgress, validateStageWeights, completeMilestone, ganttRange };
}));
