(function () {
  'use strict';
  const api = window.WorkbenchPluginApi;
  const core = window.WorkbenchResearchCore;
  if (!api || !core || !document.querySelector('#researchWorkspace')) return;
  const { state, saveState, showToast, escapeHtml, isoToday } = api;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  state.research = core.migrateResearch(state.research);
  let activeTab = 'overview';
  let pendingAssets = [];
  let researchAiAttachment = null;

  const projects = () => Object.values(state.research.projects);
  const activeProject = () => state.research.projects[state.research.active] || projects()[0];
  const fmt = value => value || '未设置';
  const daysUntil = value => value ? Math.ceil((new Date(`${value}T23:59:59`) - new Date()) / 86400000) : null;

  function currentStage(project) {
    return (project.stages || []).find(stage => (stage.milestones || []).some(item => !item.completedAt)) || project.stages?.at(-1) || null;
  }

  function nextMilestone(project) {
    return (project.stages || []).flatMap(stage => stage.milestones || []).find(item => !item.completedAt) || null;
  }

  function renderProjectList() {
    const query = $('#researchProjectSearch').value.trim().toLowerCase();
    const visible = projects().filter(project => !project.archivedAt && (!query || `${project.title} ${project.type} ${project.direction}`.toLowerCase().includes(query)));
    $('#researchProjectCount').textContent = `${visible.filter(project => ['进行中', '暂停'].includes(project.status)).length} 个进行中项目`;
    $('#researchProjectList').innerHTML = visible.length ? visible.map(project => `<button class="project-choice ${project.id === state.research.active ? 'active' : ''}" type="button" data-research-project="${escapeHtml(project.id)}"><span><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.status)} · ${escapeHtml(currentStage(project)?.name || '尚未设置阶段')}</small></span><b>${core.projectProgress(project)}%</b></button>`).join('') : '<div class="empty-state compact-empty"><strong>没有匹配的项目</strong><span>新建项目或查看归档项目。</span></div>';
    $$('[data-research-project]').forEach(button => button.addEventListener('click', () => { state.research.active = button.dataset.researchProject; saveState(); render(); }));
  }

  function renderHeader(project) {
    $('#researchProjectType').textContent = `${project.type} · ${project.status}`;
    $('#activeResearchProjectTitle').textContent = project.title;
    $('#activeResearchProgress').textContent = `${core.projectProgress(project)}%`;
    $('#researchProjectMeta').textContent = `${fmt(project.startDate)} 至 ${fmt(project.endDate)}${project.supervisor ? ` · ${project.supervisor}` : ''}`;
  }

  function renderOverview(project) {
    const stage = currentStage(project), milestone = nextMilestone(project), remaining = daysUntil(project.endDate);
    const cards = [
      ['当前阶段', stage?.name || '未设置', milestone ? `下一步：${milestone.title}` : '暂无待完成里程碑'],
      ['截止日期', fmt(project.endDate), remaining === null ? '尚未排期' : remaining < 0 ? `已逾期 ${Math.abs(remaining)} 天` : `剩余 ${remaining} 天`],
      ['项目资料', `${project.assets.length} 项`, project.versions.length ? `最新版本：${project.versions[0].version}` : '尚无版本记录'],
      ['导师意见', `${project.advisorItems.filter(item => item.status !== '已处理').length} 项待回应`, project.advisorItems[0]?.title || '暂无导师意见'],
      ['风险与阻塞', `${project.blockers.filter(item => item.status !== '已解决').length} 项`, project.blockers[0]?.title || '当前没有已记录阻塞'],
      ['研究日志', `${project.logs.length} 条`, project.logs[0]?.title || '记录方法、假设或会议决策']
    ];
    $('#researchOverviewGrid').innerHTML = cards.map(([label, value, note]) => `<article class="panel research-summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`).join('');
    $('#researchActivityList').innerHTML = project.activity.length ? project.activity.slice(0, 8).map(item => `<div class="research-record-row"><div><strong>${escapeHtml(item.title)}</strong><span>${new Date(item.at).toLocaleString('zh-CN')}</span></div><span class="status-tag">${escapeHtml(item.type)}</span></div>`).join('') : '<div class="empty-state compact-empty"><strong>尚无项目动态</strong><span>新增里程碑、资料、日志或阻塞后会记录在这里。</span></div>';
  }

  function renderEmptyPanels(project) {
    const empty = (selector, count, title, text) => { if (!count) $(selector).innerHTML = `<div class="empty-state"><strong>${title}</strong><span>${text}</span></div>`; };
    empty('#researchAssetList', project.assets.length, '尚无项目资料', '上传文件、文件夹，或添加网页链接和文字笔记。');
    empty('#researchAdvisorList', project.advisorItems.length, '尚无导师意见', '录入文字、批注文档、截图或会议记录。');
    empty('#researchVersionList', project.versions.length, '尚无版本记录', '新版本不会覆盖旧版本。');
    empty('#researchLogList', project.logs.length, '尚无研究日志', '记录假设变化、方法选择和关键决策。');
    empty('#researchBlockerList', project.blockers.length, '当前没有阻塞', '等待导师、缺少数据或连续延期可集中记录。');
  }

  function renderAssets(project) {
    $('#researchAssetList').innerHTML = project.assets.length ? project.assets.map(asset => `<article class="research-asset-row"><div><strong>${escapeHtml(asset.title || asset.name)}</strong><span>${escapeHtml(asset.category)} · ${escapeHtml(asset.type || asset.extension || '文件')} · ${asset.managed ? '项目资料库' : '外部引用'}</span><small>${asset.path ? escapeHtml(asset.path) : escapeHtml(asset.value || '')}</small></div><div class="inline-actions">${asset.path ? `<button class="button" type="button" data-open-research-asset="${escapeHtml(asset.id)}">预览</button>` : ''}<button class="button" type="button" data-delete-research-asset="${escapeHtml(asset.id)}">移出</button></div></article>`).join('') : '<div class="empty-state"><strong>尚无项目资料</strong><span>上传文件、文件夹，或添加网页链接和文字笔记。</span></div>';
    const trash = state.research.trash.filter(entry => entry.projectId === project.id);
    if (trash.length) $('#researchAssetList').insertAdjacentHTML('beforeend', `<details class="research-trash"><summary>项目资料回收站（${trash.length}）</summary>${trash.map(entry => `<div class="research-record-row"><div><strong>${escapeHtml(entry.asset.title || entry.asset.name)}</strong><span>${Math.max(0, 30 - Math.floor((Date.now() - new Date(entry.deletedAt)) / 86400000))} 天后自动删除</span></div><button class="button" type="button" data-restore-research-asset="${escapeHtml(entry.id)}">恢复</button></div>`).join('')}</details>`);
    $$('[data-open-research-asset]').forEach(button => button.addEventListener('click', async () => { const asset = project.assets.find(item => item.id === button.dataset.openResearchAsset); try { await api.callNative('openResearchFile', { path: asset.path }); } catch (_) { asset.missing = true; saveState(); renderAssets(project); showToast('文件已移动或失效，请重新定位'); } }));
    $$('[data-delete-research-asset]').forEach(button => button.addEventListener('click', () => removeAsset(button.dataset.deleteResearchAsset)));
    $$('[data-restore-research-asset]').forEach(button => button.addEventListener('click', () => restoreAsset(button.dataset.restoreResearchAsset)));
  }

  function renderRecords(project) {
    const row = (item, kind) => `<div class="research-record-row"><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.status || item.type || kind)}${item.date ? ` · ${escapeHtml(item.date)}` : ''}${item.owner ? ` · ${escapeHtml(item.owner)}` : ''}</span><small>${escapeHtml(item.details || '')}</small></div>${kind === 'blocker' && item.status !== '已解决' ? `<button class="button" type="button" data-resolve-research-blocker="${escapeHtml(item.id)}">标记解决</button>` : ''}</div>`;
    $('#researchAdvisorList').innerHTML = project.advisorItems.length ? project.advisorItems.map(item => row(item, '导师意见')).join('') : '<div class="empty-state"><strong>尚无导师意见</strong><span>录入文字、批注文档、截图或会议记录。</span></div>';
    $('#researchLogList').innerHTML = project.logs.length ? project.logs.map(item => row(item, '研究日志')).join('') : '<div class="empty-state"><strong>尚无研究日志</strong><span>记录假设变化、方法选择和关键决策。</span></div>';
    $('#researchBlockerList').innerHTML = project.blockers.length ? project.blockers.map(item => row(item, 'blocker')).join('') : '<div class="empty-state"><strong>当前没有阻塞</strong><span>等待导师、缺少数据或连续延期可集中记录。</span></div>';
    $('#researchVersionList').innerHTML = project.versions.length ? project.versions.map((item, index) => `<div class="research-record-row"><div><strong>${escapeHtml(item.version || item.title)}</strong><span>${new Date(item.createdAt).toLocaleString('zh-CN')} · ${escapeHtml(item.assetTitle || '未关联文件')}</span><small>${escapeHtml(item.details || '')}</small></div><div class="inline-actions">${item.path ? `<button class="button" type="button" data-open-research-version="${index}">打开</button>` : ''}${index < project.versions.length - 1 && item.path && project.versions[index + 1].path ? `<button class="button" type="button" data-compare-research-version="${index}">并排比较</button>` : ''}</div></div>`).join('') : '<div class="empty-state"><strong>尚无版本记录</strong><span>新版本不会覆盖旧版本。</span></div>';
    $$('[data-resolve-research-blocker]').forEach(button => button.addEventListener('click', () => { const item = project.blockers.find(entry => entry.id === button.dataset.resolveResearchBlocker); item.status = '已解决'; item.resolvedAt = new Date().toISOString(); saveState(); render(); }));
    $$('[data-open-research-version]').forEach(button => button.addEventListener('click', () => api.callNative('openResearchFile', { path: project.versions[Number(button.dataset.openResearchVersion)].path }).catch(() => showToast('版本文件失效'))));
    $$('[data-compare-research-version]').forEach(button => button.addEventListener('click', async () => { const index = Number(button.dataset.compareResearchVersion); await api.callNative('openResearchComparison', { paths: [project.versions[index + 1].path, project.versions[index].path] }).then(() => showToast('已用系统应用打开两个版本；复杂格式差异需人工确认')).catch(() => showToast('至少一个版本文件已失效')); }));
  }

  function renderAi(project) {
    $('#researchAiMessages').innerHTML = '<div class="ai-message assistant"><b>论文项目 AI</b><p>我只分析当前项目的结构化进度、里程碑、阻塞和你明确授权的文字，不会直接修改论文正文或项目记录。</p></div>' + project.aiChats.slice(-30).map(message => `<div class="ai-message ${message.role}"><b>${message.role === 'user' ? '你' : '论文项目 AI'}</b><p>${escapeHtml(message.content)}</p></div>`).join('');
  }

  function projectAiContext(project) {
    return {
      project: { id: project.id, title: project.title, type: project.type, status: project.status, startDate: project.startDate, endDate: project.endDate, direction: project.direction, progress: core.projectProgress(project) },
      stages: (project.stages || []).map(stage => ({ name: stage.name, weight: stage.weight, progress: Math.round(core.stageProgress(stage)), milestones: (stage.milestones || []).map(item => ({ title: item.title, startDate: item.startDate, endDate: item.endDate, required: item.required !== false, completed: Boolean(item.completedAt), dependsOn: item.dependsOn || '' })) })),
      blockers: project.blockers.filter(item => item.status !== '已解决').map(item => ({ title: item.title, status: item.status, owner: item.owner, date: item.date })),
      advisorItems: project.advisorItems.filter(item => item.status !== '已处理').map(item => ({ title: item.title, status: item.status })),
      evidenceCounts: { assets: project.assets.length, versions: project.versions.length, logs: project.logs.length }
    };
  }

  const researchAiInstruction = '你是个人成长工作台中受限的论文项目规划助手。只允许执行项目进度分析、里程碑拆分、周计划、阻塞与延期风险、下一步建议和导师意见整理。不得改写论文正文，不得虚构文件内容、导师意见、截止日期或研究事实。回答固定包含：现状依据、风险、下一里程碑、建议任务、日期影响、证据不足、待确认操作。所有建议只是草案，不得声称已写入工作台。';

  async function submitResearchAi(event) {
    event.preventDefault(); const project = activeProject(), input = $('#researchAiInput').value.trim();
    if (!input) { $('#researchAiStatus').textContent = '请输入规划问题'; return; }
    let config; try { config = api.assertAiAvailable('research'); } catch (error) { $('#researchAiStatus').textContent = error.detail || error.message; return; }
    const sent = ['当前项目基本信息', '阶段与里程碑', '未解决阻塞', '未处理导师意见', '资料数量'];
    if (researchAiAttachment) sent.push(`附件提取文字：${researchAiAttachment.fileName}`);
    if (config.assistant.preview && !window.confirm(`将向 ${config.provider} 的 ${config.model} 发送：\n${sent.join('\n')}\n\n原始文件不会上传。是否继续？`)) return;
    const context = projectAiContext(project); const attachmentText = researchAiAttachment ? `\n\n用户逐项授权的附件“${researchAiAttachment.fileName}”提取文字：\n${researchAiAttachment.text}` : '';
    const prompt = `${researchAiInstruction}\n\n用户问题：${input}${attachmentText}`; $('#researchAiStatus').textContent = '正在生成规划草案…';
    project.aiChats.push({ role: 'user', content: input, at: new Date().toISOString() }); saveState(); renderAi(project);
    try {
      const result = await api.callNative('sendAiChat', { account: config.account, provider: config.provider, baseUrl: config.baseUrl, model: config.model, prompt, context: { feature: '论文项目', scope: context }, attachments: [], history: project.aiChats.slice(-10) });
      project.aiChats.push({ role: 'assistant', content: result.content, at: new Date().toISOString(), audit: { provider: config.provider, model: config.model, sent } }); $('#researchAiInput').value = ''; researchAiAttachment = null; $('#researchAiAttachmentStatus').textContent = '未添加附件'; $('#researchAiStatus').textContent = '规划草案已生成，尚未修改任何项目数据';
    } catch (error) { project.aiDrafts.push({ input, attachmentFileName: researchAiAttachment?.fileName || '', failedAt: new Date().toISOString(), error: error.message }); $('#researchAiStatus').textContent = `调用失败：${error.message}，已保存本地草稿`; }
    saveState(); renderAi(project);
  }

  async function extractResearchAiAttachment() {
    const button = $('#extractResearchAiAttachmentButton'); button.disabled = true; button.textContent = '正在本地提取…';
    try { const result = await api.callNative('chooseAndExtractResearchText'); if (!window.confirm(`已从“${result.fileName}”提取 ${result.text.length} 个字符。是否授权将这些文字用于当前项目本次 AI 对话？`)) return; researchAiAttachment = { fileName: result.fileName, text: result.text }; $('#researchAiAttachmentStatus').textContent = `已授权：${result.fileName}`; }
    catch (error) { if (error.message !== 'cancelled') $('#researchAiAttachmentStatus').textContent = `提取失败：${error.message}`; }
    finally { button.disabled = false; button.textContent = '选择附件并本地提取'; }
  }

  function clearResearchAi() { const project = activeProject(); if (!project.aiChats.length || !window.confirm('清除当前项目的全部 AI 对话历史？项目数据和失败草稿不会删除。')) return; project.aiChats = []; saveState(); renderAi(project); showToast('当前项目 AI 对话已清除'); }

  function exportResearchAi() {
    const project = activeProject(); if (!project.aiChats.length) { showToast('当前项目没有可导出的 AI 对话'); return; }
    const text = project.aiChats.map(item => `## ${item.role === 'user' ? '用户' : '论文项目 AI'}\n\n${item.content}\n`).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`# ${project.title} AI规划对话\n\n${text}`], { type: 'text/markdown' })); link.download = `${project.title}-AI规划.md`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function injectResearchPrivacy() {
    const content = $('#privacyPolicyDialog .policy-content'); if (!content || $('#researchPrivacySupplement')) return;
    content.insertAdjacentHTML('beforeend', '<section id="researchPrivacySupplement"><h3>论文项目与规划 AI</h3><p>论文项目资料默认引用本地原文件，可选复制到“资料库/项目ID”目录。共享文件解除单个项目关联时不会删除其他项目仍在使用的文件；项目和资料回收站保留30天。</p><p>论文项目AI只发送当前项目的结构化进度和用户逐项授权后确认的提取文字，原始文件不上传。AI输出仅为规划草案，不会直接改写论文正文或静默修改项目记录。</p></section>');
  }

  function renderPendingAssets() {
    $('#researchPendingFiles').innerHTML = pendingAssets.length ? pendingAssets.map(file => `<div class="research-record-row"><div><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(file.extension.toUpperCase())} · ${(Number(file.size) / 1024 / 1024).toFixed(2)} MB</span></div><span class="status-tag">待导入</span></div>`).join('') : '<div class="empty-state compact-empty"><strong>尚未选择文件</strong><span>支持PDF、Word、表格、图片、PPT、文本、BibTeX、RIS和ZIP。</span></div>';
  }

  async function chooseAssets(action) {
    $('#researchAssetStatus').textContent = '正在等待选择…';
    try { const result = await api.callNative(action); pendingAssets = result.files || []; renderPendingAssets(); $('#researchAssetStatus').textContent = pendingAssets.length ? `已选择 ${pendingAssets.length} 个文件` : '没有可导入的支持文件'; }
    catch (error) { $('#researchAssetStatus').textContent = error.message === 'cancelled' ? '' : `选择失败：${error.message}`; }
  }

  function findDuplicate(fingerprint) {
    if (!fingerprint) return null;
    for (const project of projects()) { const asset = project.assets.find(item => item.fingerprint === fingerprint); if (asset) return asset; }
    return null;
  }

  async function importAssets(event) {
    event.preventDefault(); if (!pendingAssets.length) { $('#researchAssetStatus').textContent = '请先选择文件或文件夹'; return; }
    const project = activeProject(), copy = $('#researchAssetMode').value === 'copy', category = $('#researchAssetCategory').value;
    let imported = 0;
    for (const [index, file] of pendingAssets.entries()) {
      $('#researchAssetStatus').textContent = `正在处理 ${index + 1}/${pendingAssets.length}：${file.name}`;
      const duplicate = findDuplicate(file.fingerprint);
      if (duplicate && window.confirm(`“${file.name}”与资料库已有文件重复。是否直接关联已有资料？\n取消将作为新版本继续导入。`)) {
        project.assets.push({ ...structuredClone(duplicate), id: crypto.randomUUID(), sharedAssetId: duplicate.sharedAssetId || duplicate.id, linkedAt: new Date().toISOString() }); imported += 1; continue;
      }
      try {
        const result = await api.callNative('importResearchAsset', { path: file.path, projectId: project.id, copy });
        project.assets.unshift({ id: crypto.randomUUID(), title: result.name, name: result.name, category, type: '文件', extension: result.extension, path: result.path, size: result.size, fingerprint: result.fingerprint, managed: result.managed, missing: false, createdAt: new Date().toISOString() }); imported += 1;
      } catch (error) { $('#researchAssetStatus').textContent = `“${file.name}”导入失败：${error.message}`; }
    }
    project.activity.unshift({ id: crypto.randomUUID(), type: 'assets_added', title: `新增 ${imported} 项项目资料`, at: new Date().toISOString() });
    saveState(); pendingAssets = []; $('#researchAssetDialog').close('imported'); render(); api.renderLibrary(); showToast(`已导入 ${imported} 项资料`);
  }

  function saveTextAsset(event) {
    event.preventDefault(); const project = activeProject();
    project.assets.unshift({ id: crypto.randomUUID(), title: $('#researchTextAssetTitle').value.trim(), category: $('#researchTextAssetCategory').value, type: $('#researchTextAssetType').value, value: $('#researchTextAssetValue').value.trim(), managed: false, createdAt: new Date().toISOString() });
    project.activity.unshift({ id: crypto.randomUUID(), type: 'asset_added', title: `新增资料：${$('#researchTextAssetTitle').value.trim()}`, at: new Date().toISOString() });
    saveState(); $('#researchTextAssetDialog').close('saved'); render(); showToast('项目资料已保存');
  }

  function removeAsset(id) {
    const project = activeProject(), index = project.assets.findIndex(item => item.id === id); if (index < 0) return;
    const asset = project.assets[index];
    if (!window.confirm(`从当前项目移出“${asset.title || asset.name}”？外部原文件不会删除。`)) return;
    project.assets.splice(index, 1);
    const sharedElsewhere = projects().some(other => other.id !== project.id && other.assets.some(item => (asset.sharedAssetId && item.sharedAssetId === asset.sharedAssetId) || (asset.path && item.path === asset.path)));
    if (!sharedElsewhere) state.research.trash.push({ id: crypto.randomUUID(), projectId: project.id, asset, deletedAt: new Date().toISOString() });
    saveState(); render(); showToast(sharedElsewhere ? '已解除当前项目关联，共享文件仍被其他项目使用' : '资料已移入30天回收站');
  }

  function restoreAsset(id) {
    const index = state.research.trash.findIndex(entry => entry.id === id); if (index < 0) return;
    const entry = state.research.trash.splice(index, 1)[0], project = state.research.projects[entry.projectId]; if (project) project.assets.unshift(entry.asset);
    saveState(); render(); showToast('资料已恢复');
  }

  async function purgeResearchTrash() {
    const cutoff = Date.now() - 30 * 86400000;
    for (const entry of [...state.research.trash]) {
      if (new Date(entry.deletedAt).getTime() > cutoff) continue;
      const referenced = projects().some(project => project.assets.some(item => entry.asset.path && item.path === entry.asset.path));
      if (!referenced && entry.asset.managed && entry.asset.path) { try { await api.callNative('deleteManagedResearchFile', { path: entry.asset.path }); } catch (_) { continue; } }
      state.research.trash = state.research.trash.filter(item => item.id !== entry.id);
    }
    for (const entry of [...state.research.projectTrash]) {
      if (new Date(entry.deletedAt).getTime() > cutoff) continue;
      let removable = true;
      for (const asset of entry.project.assets.filter(item => item.managed && item.path)) { const referenced = projects().some(project => project.assets.some(item => item.path === asset.path)); if (referenced) continue; try { await api.callNative('deleteManagedResearchFile', { path: asset.path }); } catch (_) { removable = false; break; } }
      if (removable) state.research.projectTrash = state.research.projectTrash.filter(item => item.id !== entry.id);
    }
    saveState();
  }

  function openRecordDialog(kind) {
    const names = { advisor: ['导师意见', '新增导师意见'], version: ['版本记录', '新增版本'], log: ['研究日志', '新增研究日志'], blocker: ['阻塞中心', '新增阻塞'] };
    $('#researchRecordKind').value = kind; $('#researchRecordKicker').textContent = names[kind][0]; $('#researchRecordTitle').textContent = names[kind][1]; $('#researchRecordForm').reset(); $('#researchRecordKind').value = kind;
    $('#researchRecordStatusField').hidden = !['advisor', 'blocker'].includes(kind); $('#researchRecordDateField').hidden = kind !== 'blocker'; $('#researchRecordOwnerField').hidden = kind !== 'blocker'; $('#researchRecordVersionField').hidden = kind !== 'version'; $('#researchRecordAssetField').hidden = kind !== 'version';
    $('#researchRecordStatus').innerHTML = kind === 'blocker' ? '<option>待解决</option><option>处理中</option><option>已解决</option>' : '<option>待处理</option><option>处理中</option><option>待导师确认</option><option>已处理</option><option>不采纳</option>';
    $('#researchRecordAsset').innerHTML = '<option value="">不关联文件</option>' + activeProject().assets.filter(item => item.path).map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title || item.name)}</option>`).join('');
    $('#researchRecordDialog').showModal();
  }

  function saveRecord(event) {
    event.preventDefault(); const project = activeProject(), kind = $('#researchRecordKind').value, asset = project.assets.find(item => item.id === $('#researchRecordAsset').value);
    const item = { id: crypto.randomUUID(), title: $('#researchRecordName').value.trim(), details: $('#researchRecordDetails').value.trim(), createdAt: new Date().toISOString() };
    if (kind === 'advisor') { item.status = $('#researchRecordStatus').value; project.advisorItems.unshift(item); }
    if (kind === 'log') { item.type = '研究记录'; project.logs.unshift(item); }
    if (kind === 'blocker') { Object.assign(item, { status: $('#researchRecordStatus').value, date: $('#researchRecordDate').value, owner: $('#researchRecordOwner').value.trim() }); project.blockers.unshift(item); }
    if (kind === 'version') { Object.assign(item, { version: $('#researchRecordVersion').value.trim() || `v${project.versions.length + 1}`, assetId: asset?.id || '', assetTitle: asset?.title || asset?.name || '', path: asset?.path || '' }); project.versions.unshift(item); }
    project.activity.unshift({ id: crypto.randomUUID(), type: `${kind}_added`, title: item.title, at: item.createdAt }); saveState(); $('#researchRecordDialog').close('saved'); render(); showToast('项目记录已保存');
  }

  function allMilestones(project) { return (project.stages || []).flatMap(stage => (stage.milestones || []).map(item => ({ ...item, stageId: stage.id, stageName: stage.name }))); }

  function renderMilestones(project) {
    const validation = core.validateStageWeights(project);
    $('#researchWeightStatus').textContent = `当前阶段权重合计 ${validation.total}%${validation.valid ? ' · 可保存' : ' · 必须调整为100%'}`;
    $('#researchWeightStatus').classList.toggle('warning-text', !validation.valid);
    $('#researchStageTrack').innerHTML = (project.stages || []).length ? project.stages.map((stage, index) => {
      const progress = Math.round(core.stageProgress(stage));
      const milestones = (stage.milestones || []).map(item => {
        const dependency = item.dependsOn ? allMilestones(project).find(entry => entry.id === item.dependsOn) : null;
        const risk = dependency && !dependency.completedAt && !item.completedAt;
        return `<div class="research-milestone-row ${item.completedAt ? 'done' : ''}"><div><strong>${escapeHtml(item.title)}</strong><span>${fmt(item.startDate)} 至 ${fmt(item.endDate)} · ${item.required === false ? '可选' : '必需'}${risk ? ` · 前置“${escapeHtml(dependency.title)}”未完成` : ''}</span><small>${escapeHtml(item.standard || '未填写完成标准')}</small></div><div class="inline-actions"><button class="button" type="button" data-task-research-milestone="${escapeHtml(item.id)}">加入待办</button>${item.completedAt ? `<button class="button" type="button" data-undo-research-milestone="${escapeHtml(item.id)}">撤销</button>` : `<button class="button primary" type="button" data-complete-research-milestone="${escapeHtml(item.id)}">确认完成</button>`}</div></div>`;
      }).join('');
      return `<article class="research-stage-card"><header><span>${index + 1}</span><div><strong>${escapeHtml(stage.name)}</strong><small>${progress}% 完成</small></div><label>权重<input type="number" min="0" max="100" step="1" value="${Number(stage.weight) || 0}" data-research-stage-weight="${escapeHtml(stage.id)}"></label><div class="inline-actions"><button class="icon-button" type="button" data-rename-research-stage="${escapeHtml(stage.id)}" title="重命名阶段" aria-label="重命名阶段">✎</button><button class="icon-button" type="button" data-delete-research-stage="${escapeHtml(stage.id)}" title="删除阶段" aria-label="删除阶段">×</button></div></header><div class="progress-track"><i style="width:${progress}%"></i></div>${milestones || '<div class="empty-state compact-empty"><strong>尚无里程碑</strong><span>为该阶段设置可验证的成果节点。</span></div>'}</article>`;
    }).join('') : '<div class="empty-state"><strong>空白项目尚无阶段</strong><span>请编辑项目或创建阶段后再添加里程碑。</span></div>';
    $$('[data-complete-research-milestone]').forEach(button => button.addEventListener('click', () => openEvidenceDialog(button.dataset.completeResearchMilestone)));
    $$('[data-undo-research-milestone]').forEach(button => button.addEventListener('click', () => undoMilestone(button.dataset.undoResearchMilestone)));
    $$('[data-task-research-milestone]').forEach(button => button.addEventListener('click', () => createMilestoneTask(button.dataset.taskResearchMilestone)));
    $$('[data-rename-research-stage]').forEach(button => button.addEventListener('click', () => renameStage(button.dataset.renameResearchStage)));
    $$('[data-delete-research-stage]').forEach(button => button.addEventListener('click', () => deleteStage(button.dataset.deleteResearchStage)));
  }

  function addStage() {
    const project = activeProject(), name = window.prompt('请输入新阶段名称：'); if (!name?.trim()) return;
    const weight = Number(window.prompt('请输入阶段权重（保存前所有阶段权重之和必须为100）：', '0')) || 0;
    project.stages.push({ id: crypto.randomUUID(), name: name.trim(), weight, order: project.stages.length, startDate: '', endDate: '', milestones: [] }); saveState(); render(); showToast('阶段已新增，请检查总权重');
  }

  function renameStage(id) { const stage = activeProject().stages.find(item => item.id === id); if (!stage) return; const name = window.prompt('修改阶段名称：', stage.name); if (!name?.trim()) return; stage.name = name.trim(); saveState(); render(); }
  function deleteStage(id) { const project = activeProject(), index = project.stages.findIndex(item => item.id === id); if (index < 0) return; const stage = project.stages[index]; if (stage.milestones.length) { showToast('请先处理该阶段的里程碑，避免丢失项目历史'); return; } if (!window.confirm(`删除空阶段“${stage.name}”？`)) return; project.stages.splice(index, 1); project.stages.forEach((item, order) => { item.order = order; }); saveState(); render(); }

  function createMilestoneTask(id) {
    const project = activeProject(), milestone = allMilestones(project).find(item => item.id === id); if (!milestone) return;
    if (state.tasks.some(task => task.researchMilestoneId === id && !task.done)) { showToast('该里程碑已有未完成待办'); return; }
    state.tasks.push({ id: `research-task-${Date.now()}`, title: milestone.title, category: project.type === '毕业论文' ? '毕业论文' : '科研/小论文', goal: project.title, priority: '高', estimate: 60, key: false, done: false, date: milestone.endDate || '', researchProjectId: project.id, researchMilestoneId: id });
    if (milestone.endDate) state.calendarItems.push({ id: `research-calendar-${Date.now()}`, title: milestone.title, date: milestone.endDate, weekday: new Date(`${milestone.endDate}T00:00:00`).getDay(), start: '09:00', end: '10:00', location: '', content: `关联论文项目：${project.title}。完成待办后仍需确认里程碑成果证据。`, researchProjectId: project.id, researchMilestoneId: id });
    saveState(); api.renderTasks(); api.renderCalendar(); showToast(milestone.endDate ? '已加入待办和日历，完成后仍需确认里程碑' : '已加入待办；里程碑未排期，未写入日历');
  }

  function openMilestoneDialog() {
    const project = activeProject();
    if (!project.stages.length) { showToast('空白项目需要先添加阶段'); return; }
    $('#researchMilestoneStage').innerHTML = project.stages.map(stage => `<option value="${escapeHtml(stage.id)}">${escapeHtml(stage.name)}</option>`).join('');
    $('#researchMilestoneDependency').innerHTML = '<option value="">无</option>' + allMilestones(project).filter(item => !item.completedAt).map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.stageName)} · ${escapeHtml(item.title)}</option>`).join('');
    $('#researchMilestoneForm').reset(); $('#researchMilestoneWeight').value = 1; $('#researchMilestoneRequired').checked = true; $('#researchMilestoneError').textContent = '';
    $('#researchMilestoneDialog').showModal();
  }

  function saveMilestone(event) {
    event.preventDefault(); const project = activeProject();
    const stage = project.stages.find(item => item.id === $('#researchMilestoneStage').value);
    const title = $('#researchMilestoneName').value.trim(), standard = $('#researchMilestoneStandard').value.trim();
    const startDate = $('#researchMilestoneStart').value, endDate = $('#researchMilestoneEnd').value;
    if (!stage || !title || !standard) { $('#researchMilestoneError').textContent = '请填写名称、阶段和完成标准'; return; }
    if (startDate && endDate && endDate < startDate) { $('#researchMilestoneError').textContent = '结束日期不能早于开始日期'; return; }
    stage.milestones.push({ id: crypto.randomUUID(), title, standard, startDate, endDate, weight: Number($('#researchMilestoneWeight').value) || 1, required: $('#researchMilestoneRequired').checked, dependsOn: $('#researchMilestoneDependency').value, evidence: [], completedAt: null, history: [] });
    project.activity.unshift({ id: crypto.randomUUID(), type: 'milestone_added', title: `新增里程碑：${title}`, at: new Date().toISOString() });
    project.updatedAt = new Date().toISOString(); saveState(); $('#researchMilestoneDialog').close('saved'); render(); showToast('里程碑已新增');
  }

  function openEvidenceDialog(id) {
    const milestone = allMilestones(activeProject()).find(item => item.id === id);
    if (!milestone) return;
    $('#researchEvidenceMilestoneId').value = id; $('#researchEvidenceTitle').textContent = `完成“${milestone.title}”`;
    $('#researchEvidenceForm').reset(); $('#researchEvidenceMilestoneId').value = id; $('#researchEvidenceError').textContent = ''; $('#researchEvidenceDialog').showModal();
  }

  function completeMilestone(event) {
    event.preventDefault();
    try { core.completeMilestone(activeProject(), $('#researchEvidenceMilestoneId').value, { type: $('#researchEvidenceType').value, value: $('#researchEvidenceValue').value.trim() }); }
    catch (_) { $('#researchEvidenceError').textContent = '请至少填写一项成果证据'; return; }
    saveState(); $('#researchEvidenceDialog').close('completed'); render(); showToast('里程碑已完成，进度和甘特图已同步');
  }

  function undoMilestone(id) {
    const reason = window.prompt('请输入撤销原因。原完成时间和证据将保留在历史中：');
    if (!reason?.trim()) return;
    const project = activeProject(), milestone = allMilestones(project).find(item => item.id === id);
    if (!milestone) return;
    milestone.history ||= []; milestone.history.push({ action: 'undo', reason: reason.trim(), completedAt: milestone.completedAt, evidence: structuredClone(milestone.evidence || []), at: new Date().toISOString() });
    milestone.completedAt = null; project.activity.unshift({ id: crypto.randomUUID(), type: 'milestone_undone', title: `撤销里程碑：${milestone.title}`, at: new Date().toISOString() });
    saveState(); render(); showToast('已撤销并保留历史');
  }

  function saveStageWeights() {
    const project = activeProject();
    $$('[data-research-stage-weight]').forEach(input => { const stage = project.stages.find(item => item.id === input.dataset.researchStageWeight); if (stage) stage.weight = Number(input.value) || 0; });
    const validation = core.validateStageWeights(project);
    if (!validation.valid) { renderMilestones(project); showToast(`阶段权重合计为 ${validation.total}%，无法保存`); return; }
    project.updatedAt = new Date().toISOString(); saveState(); render(); showToast('阶段权重已保存');
  }

  const dayNumber = value => Math.floor(new Date(`${value}T00:00:00`).getTime() / 86400000);
  function ganttBar(item, range, level, project) {
    if (!item.startDate || !item.endDate) return '';
    const left = (dayNumber(item.startDate) - dayNumber(range.start)) / range.days * 100;
    const width = Math.max(1.5, (dayNumber(item.endDate) - dayNumber(item.startDate) + 1) / range.days * 100);
    const locked = Boolean(item.completedAt);
    const baseline = item.originalBaseline?.startDate && item.originalBaseline?.endDate ? { left: (dayNumber(item.originalBaseline.startDate) - dayNumber(range.start)) / range.days * 100, width: Math.max(1.5, (dayNumber(item.originalBaseline.endDate) - dayNumber(item.originalBaseline.startDate) + 1) / range.days * 100) } : null;
    return `<div class="research-gantt-row level-${level}"><span>${escapeHtml(item.name || item.title)}</span><div class="research-gantt-lane"><i class="research-gantt-bar ${locked ? 'locked' : ''}" style="left:${left}%;width:${width}%;background:${escapeHtml(project.color)}" ${locked ? '' : `draggable="true" data-gantt-project="${escapeHtml(project.id)}" data-gantt-item="${escapeHtml(item.id || project.id)}" data-gantt-level="${level}"`} title="${escapeHtml(item.startDate)} 至 ${escapeHtml(item.endDate)}"></i>${state.research.filters.baseline && baseline ? `<em class="research-gantt-baseline" style="left:${baseline.left}%;width:${baseline.width}%"></em>` : ''}</div></div>`;
  }

  function renderGantt() {
    const query = $('#researchGanttSearch').value.trim().toLowerCase();
    const visible = projects().filter(project => !project.archivedAt && ['进行中', '暂停'].includes(project.status) && (!query || project.title.toLowerCase().includes(query)));
    const range = core.ganttRange(visible);
    if (!range) { $('#researchGantt').innerHTML = '<div class="empty-state"><strong>尚无已排期项目</strong><span>为项目、阶段或里程碑设置日期后显示甘特图；未排期内容不会生成虚假时间条。</span></div>'; return; }
    const rows = visible.map(project => ganttBar({ ...project, name: project.title }, range, 0, project) + (project.stages || []).map(stage => ganttBar(stage, range, 1, project) + (stage.milestones || []).map(item => ganttBar(item, range, 2, project)).join('')).join('')).join('');
    const unplanned = visible.flatMap(project => (project.stages || []).flatMap(stage => (stage.milestones || []).filter(item => !item.startDate || !item.endDate).map(item => `${project.title} · ${item.title}`)));
    $('#researchGantt').innerHTML = `<div class="research-gantt-scale"><strong>${range.start}</strong><span>${range.scale}视图 · ${range.days}天</span><strong>${range.end}</strong></div>${rows}${unplanned.length ? `<details class="research-unplanned"><summary>未排期（${unplanned.length}）</summary>${unplanned.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</details>` : ''}`;
    $$('.research-gantt-bar[draggable="true"]').forEach(bar => { bar.addEventListener('dragstart', event => { bar.dataset.dragStartX = String(event.clientX); event.dataTransfer.setData('text/plain', bar.dataset.ganttItem); }); bar.addEventListener('dragend', event => moveGanttItem(event, bar, range)); });
  }

  function moveGanttItem(event, bar, range) {
    const laneWidth = bar.parentElement.getBoundingClientRect().width;
    const started = Number(bar.dataset.dragStartX || event.clientX); const delta = Math.round((event.clientX - started) / Math.max(1, laneWidth) * range.days);
    if (!delta) return;
    const project = state.research.projects[bar.dataset.ganttProject];
    let item = project;
    if (bar.dataset.ganttLevel === '1') item = project.stages.find(entry => entry.id === bar.dataset.ganttItem);
    if (bar.dataset.ganttLevel === '2') item = allMilestones(project).find(entry => entry.id === bar.dataset.ganttItem);
    if (!item || item.completedAt) return;
    const shift = value => { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + delta); return date.toISOString().slice(0, 10); };
    item.originalBaseline ||= { startDate: item.startDate, endDate: item.endDate }; item.startDate = shift(item.startDate); item.endDate = shift(item.endDate);
    project.activity.unshift({ id: crypto.randomUUID(), type: 'schedule_changed', title: `${item.title || item.name || project.title} 调整 ${delta} 天`, at: new Date().toISOString() });
    saveState(); render(); showToast(`时间已移动 ${delta} 天，原始基线已保留`);
  }

  function render() {
    renderProjectList();
    const project = activeProject();
    if (!project) return;
    $('#researchBaselineToggle').checked = Boolean(state.research.filters.baseline);
    renderHeader(project); renderOverview(project); renderMilestones(project); renderAssets(project); renderRecords(project); renderAi(project); renderEmptyPanels(project); renderGantt();
    $$('[data-research-tab]').forEach(button => button.classList.toggle('active', button.dataset.researchTab === activeTab));
    $$('[data-research-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.researchPanel === activeTab));
  }

  function openProjectDialog(project = null, duplicate = false) {
    const source = project || activeProject();
    $('#researchProjectDialogTitle').textContent = project && !duplicate ? '编辑项目' : duplicate ? '复制项目结构' : '新增项目';
    $('#researchEditingProjectId').value = project && !duplicate ? project.id : '';
    $('#researchProjectName').value = duplicate ? `${source.title} 副本` : project?.title || '';
    $('#researchProjectKind').value = project?.type || '小论文';
    $('#researchProjectStart').value = project?.startDate || isoToday();
    $('#researchProjectEnd').value = project?.endDate || '';
    $('#researchProjectStatus').value = project?.status || '未开始';
    $('#researchProjectTemplate').value = duplicate ? 'copy' : project ? 'standard' : 'standard';
    $('#researchProjectTemplate').disabled = Boolean(project && !duplicate);
    $('#researchProjectSupervisor').value = project?.supervisor || '';
    $('#researchProjectColor').value = project?.color || '#64748b';
    $('#researchProjectDirection').value = project?.direction || '';
    $('#researchProjectDescription').value = project?.description || '';
    $('#researchProjectError').textContent = '';
    $('#researchProjectDialog').showModal();
  }

  function saveProject(event) {
    event.preventDefault();
    const id = $('#researchEditingProjectId').value;
    const startDate = $('#researchProjectStart').value, endDate = $('#researchProjectEnd').value;
    if (!$('#researchProjectName').value.trim() || !startDate || !endDate) { $('#researchProjectError').textContent = '请填写所有带 * 的必填项'; return; }
    if (endDate < startDate) { $('#researchProjectError').textContent = '目标完成日期不能早于开始日期'; return; }
    const data = { title: $('#researchProjectName').value.trim(), type: $('#researchProjectKind').value, startDate, endDate, status: $('#researchProjectStatus').value, supervisor: $('#researchProjectSupervisor').value.trim(), color: $('#researchProjectColor').value, direction: $('#researchProjectDirection').value.trim(), description: $('#researchProjectDescription').value.trim() };
    if (id && data.status === '已完成') { const required = allMilestones(state.research.projects[id]).filter(item => item.required !== false); if (!required.length || required.some(item => !item.completedAt)) { $('#researchProjectError').textContent = '所有必需里程碑完成后才能将项目设为已完成'; return; } }
    if (id) Object.assign(state.research.projects[id], data, { updatedAt: new Date().toISOString() });
    else {
      const template = $('#researchProjectTemplate').value;
      const created = core.createProject({ ...data, template });
      if (template === 'copy') created.stages = structuredClone(activeProject().stages).map(stage => ({ ...stage, id: crypto.randomUUID(), milestones: (stage.milestones || []).map(item => ({ ...item, id: crypto.randomUUID(), completedAt: null, evidence: [] })) }));
      state.research.projects[created.id] = created; state.research.active = created.id;
    }
    saveState(); $('#researchProjectDialog').close('saved'); render(); showToast(id ? '项目已更新' : '项目已创建');
  }

  function archiveProject() {
    const project = activeProject();
    if (!project || !window.confirm(`归档“${project.title}”？归档后停止提醒和 AI 计划，可随时恢复。`)) return;
    project.archivedAt = new Date().toISOString(); project.status = '已归档';
    state.research.active = projects().find(item => !item.archivedAt)?.id || project.id;
    saveState(); $('#researchProjectActionsDialog').close('archived'); render(); showToast('项目已归档');
  }

  function renderArchive() {
    const archived = projects().filter(project => project.archivedAt);
    const trashed = state.research.projectTrash || [];
    $('#researchArchiveList').innerHTML = (archived.length ? archived.map(project => `<div class="research-record-row"><div><strong>${escapeHtml(project.title)}</strong><span>${escapeHtml(project.type)} · ${new Date(project.archivedAt).toLocaleDateString('zh-CN')}</span></div><div class="inline-actions"><button class="button" type="button" data-restore-research-project="${escapeHtml(project.id)}">恢复</button><button class="button" type="button" data-trash-research-project="${escapeHtml(project.id)}">移入回收站</button></div></div>`).join('') : '<div class="empty-state compact-empty"><strong>没有归档项目</strong><span>归档后的项目会显示在这里。</span></div>') + (trashed.length ? `<h3>项目回收站</h3>${trashed.map(entry => `<div class="research-record-row"><div><strong>${escapeHtml(entry.project.title)}</strong><span>${Math.max(0, 30 - Math.floor((Date.now() - new Date(entry.deletedAt)) / 86400000))} 天后清理</span></div><button class="button" type="button" data-restore-trashed-project="${escapeHtml(entry.id)}">恢复</button></div>`).join('')}` : '');
    $$('[data-restore-research-project]').forEach(button => button.addEventListener('click', () => { const project = state.research.projects[button.dataset.restoreResearchProject]; project.archivedAt = null; project.status = '暂停'; state.research.active = project.id; saveState(); renderArchive(); render(); showToast('项目已恢复为暂停状态'); }));
    $$('[data-trash-research-project]').forEach(button => button.addEventListener('click', () => trashProject(button.dataset.trashResearchProject)));
    $$('[data-restore-trashed-project]').forEach(button => button.addEventListener('click', () => restoreTrashedProject(button.dataset.restoreTrashedProject)));
  }

  function trashProject(id) { const project = state.research.projects[id]; if (!project?.archivedAt || !window.confirm(`将“${project.title}”移入30天回收站？外部引用文件不会删除。`)) return; state.research.projectTrash.push({ id: crypto.randomUUID(), project: structuredClone(project), deletedAt: new Date().toISOString() }); delete state.research.projects[id]; saveState(); renderArchive(); render(); }
  function restoreTrashedProject(id) { const index = state.research.projectTrash.findIndex(entry => entry.id === id); if (index < 0) return; const entry = state.research.projectTrash.splice(index, 1)[0]; entry.project.archivedAt = new Date().toISOString(); entry.project.status = '已归档'; state.research.projects[entry.project.id] = entry.project; saveState(); renderArchive(); render(); }

  function bind() {
    $('#addResearchProjectButton').addEventListener('click', () => openProjectDialog(null));
    $('#editResearchProjectButton').addEventListener('click', () => openProjectDialog(activeProject()));
    $('#researchProjectForm').addEventListener('submit', saveProject);
    $('#researchProjectSearch').addEventListener('input', renderProjectList);
    $('#researchProjectMenuButton').addEventListener('click', () => $('#researchProjectActionsDialog').showModal());
    $('#duplicateResearchProjectButton').addEventListener('click', () => { $('#researchProjectActionsDialog').close('copy'); openProjectDialog(activeProject(), true); });
    $('#archiveResearchProjectButton').addEventListener('click', archiveProject);
    $('#researchArchiveButton').addEventListener('click', () => { renderArchive(); $('#researchArchiveDialog').showModal(); });
    $('#addResearchStageButton').addEventListener('click', addStage);
    $('#addResearchMilestoneButton').addEventListener('click', openMilestoneDialog);
    $('#researchMilestoneForm').addEventListener('submit', saveMilestone);
    $('#researchEvidenceForm').addEventListener('submit', completeMilestone);
    $('#saveResearchWeightsButton').addEventListener('click', saveStageWeights);
    $('#researchGanttSearch').addEventListener('input', renderGantt);
    $('#researchBaselineToggle').addEventListener('change', event => { state.research.filters.baseline = event.target.checked; saveState(); renderGantt(); });
    $('#uploadResearchAssetButton').addEventListener('click', () => { pendingAssets = []; renderPendingAssets(); $('#researchAssetStatus').textContent = ''; $('#researchAssetDialog').showModal(); });
    $('#chooseResearchFilesButton').addEventListener('click', () => chooseAssets('chooseResearchFiles'));
    $('#chooseResearchFolderButton').addEventListener('click', () => chooseAssets('chooseResearchFolder'));
    $('#researchAssetForm').addEventListener('submit', importAssets);
    $('#addResearchLinkButton').addEventListener('click', () => { $('#researchTextAssetForm').reset(); $('#researchTextAssetDialog').showModal(); });
    $('#researchTextAssetForm').addEventListener('submit', saveTextAsset);
    $('#addAdvisorItemButton').addEventListener('click', () => openRecordDialog('advisor'));
    $('#addResearchVersionButton').addEventListener('click', () => openRecordDialog('version'));
    $('#addResearchLogButton').addEventListener('click', () => openRecordDialog('log'));
    $('#addResearchBlockerButton').addEventListener('click', () => openRecordDialog('blocker'));
    $('#researchRecordForm').addEventListener('submit', saveRecord);
    $('#researchAiForm').addEventListener('submit', submitResearchAi);
    $('#extractResearchAiAttachmentButton').addEventListener('click', extractResearchAiAttachment);
    $('#clearResearchAiButton').addEventListener('click', clearResearchAi);
    $('#exportResearchAiButton').addEventListener('click', exportResearchAi);
    $$('[data-research-tab]').forEach(button => button.addEventListener('click', () => { activeTab = button.dataset.researchTab; render(); }));
  }

  window.WorkbenchResearchModule = Object.freeze({ render });
  injectResearchPrivacy(); bind(); render(); saveState(); purgeResearchTrash(); window.setInterval(purgeResearchTrash, 24 * 60 * 60 * 1000);
}());
