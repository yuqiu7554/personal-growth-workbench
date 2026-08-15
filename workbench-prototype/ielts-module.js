(function () {
  'use strict';

  const api = window.WorkbenchPluginApi;
  if (!api) return;
  const { state, saveState, showToast, escapeHtml, isoToday, renderExamRecords } = api;
  const callNative = (action, payload = {}) => {
    if (action !== 'sendAiChat') return api.callNative(action, payload);
    const assistantId = payload.context?.feature === 'CET-6' ? 'cet6' : 'ielts'; const config = api.assertAiAvailable(assistantId);
    return api.callNative(action, { ...payload, account: config.account, provider: config.provider, baseUrl: config.baseUrl, model: config.model });
  };
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const modules = ['听力', '阅读', 'Writing Task 1', 'Writing Task 2'];
  const defaultMinutes = { 听力: 40, 阅读: 60, 'Writing Task 1': 20, 'Writing Task 2': 40 };
  const ratingNames = ['流利度', '词汇', '语法', '发音', '满意度'];
  const ielts = state.ielts ||= {};
  ielts.materials ||= [];
  ielts.materialTrash ||= [];
  ielts.recordTrash ||= [];
  ielts.topics ||= [];
  ielts.recordings ||= [];
  ielts.recordingTrash ||= [];
  ielts.speakingSessions ||= [];
  ielts.aiChats ||= [];
  ielts.aiDrafts ||= [];
  ielts.writtenTraining ||= { active: null, pendingRecord: null };
  ielts.settings ||= { defaultType: 'Academic', countdown: true, microphoneId: '', speakingMode: 'questions' };

  let selectedTopicId = ielts.topics[0]?.id || null;
  let activeQuestionId = null;
  let recordingDraft = null;
  let recordingTicker = null;
  let countdownTimer = null;
  let simulationDraft = null;
  let preparedQuestionId = null;
  let writtenTicker = null;
  let pendingImport = [];
  let writtenOrder = [...modules];
  let aiMode = 'speaking';
  let cet6AiMode = 'translation';

  function uid(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
  function formatClock(seconds) { const v = Math.max(0, Math.floor(Number(seconds || 0))); return `${String(Math.floor(v / 3600)).padStart(2, '0')}:${String(Math.floor(v % 3600 / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`; }
  function topicById(id) { return ielts.topics.find(topic => topic.id === id); }
  function questionById(id) { for (const topic of ielts.topics) { const question = topic.questions.find(item => item.id === id); if (question) return { topic, question }; } return null; }
  function recordingsFor(questionId) { return ielts.recordings.filter(item => item.questionId === questionId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  function preferredRecording(questionId) { const list = recordingsFor(questionId); return list.find(item => item.favorite) || list[0] || null; }

  function switchTab(name) {
    $$('[data-ielts-tab]').forEach(button => button.classList.toggle('active', button.dataset.ieltsTab === name));
    $$('[data-ielts-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.ieltsPanel === name));
  }

  function renderOverview() {
    $('#ieltsDefaultTypeLabel').textContent = ielts.settings.defaultType;
    $('#ieltsRecordMetric').textContent = state.ieltsRecords.length;
    $('#ieltsSpeakingMetric').textContent = ielts.recordings.length;
    $('#ieltsMaterialMetric').textContent = ielts.materials.length;
    $('#ieltsReviewMetric').textContent = state.ieltsRecords.reduce((sum, record) => sum + (record.reviews || []).filter(item => !item.done).length, 0);
    $('#ieltsNavCount').textContent = state.ieltsRecords.length + ielts.speakingSessions.length;
    $('#ieltsWrittenOverview').innerHTML = state.ieltsRecords.length ? `<strong>${escapeHtml(state.ieltsRecords[0].module)}</strong><span>最近训练：${escapeHtml(state.ieltsRecords[0].date)} · ${escapeHtml(state.ieltsRecords[0].material || '未填写材料')}</span>` : '<strong>尚未建立笔试记录</strong><span>可以不上传资料，直接开始计时。</span>';
    const latest = ielts.recordings.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    $('#ieltsSpeakingOverview').innerHTML = latest ? `<strong>${escapeHtml(questionById(latest.questionId)?.topic.name || '口语练习')}</strong><span>最近录音：${escapeHtml(latest.createdAt.slice(0, 10))} · ${Math.round(latest.duration || 0)}秒</span>` : '<strong>尚未录制口语回答</strong><span>先创建话题与问题，再进行逐题或完整模拟。</span>';
  }

  function renderTopics() {
    const root = $('#ieltsTopicList');
    const visibleTopics = ielts.topics.filter(topic => !topic.archived);
    root.innerHTML = (visibleTopics.length ? visibleTopics.map(topic => `<article class="speaking-topic-row" draggable="true" data-drag-ielts-topic="${topic.id}"><button class="${topic.id === selectedTopicId ? 'active' : ''}" type="button" data-ielts-topic="${topic.id}"><span>${escapeHtml(topic.part)}</span><strong>${escapeHtml(topic.name)}</strong><small>${topic.questions.length} 题 · ${escapeHtml(topic.tags || '未设置标签')}</small></button><div><button type="button" data-edit-ielts-topic="${topic.id}">编辑</button><button type="button" data-archive-ielts-topic="${topic.id}">归档</button></div></article>`).join('') : '<div class="empty-state compact-empty"><strong>暂无话题</strong><span>点击“新增话题”建立本地题库。</span></div>') + (ielts.topics.some(topic => topic.archived) ? `<details class="checkpoint-trash"><summary>已归档话题（${ielts.topics.filter(topic => topic.archived).length}）</summary>${ielts.topics.filter(topic => topic.archived).map(topic => `<div class="cet6-material-file"><span>${escapeHtml(topic.name)}</span><button type="button" data-unarchive-ielts-topic="${topic.id}">恢复</button></div>`).join('')}</details>` : '') + (ielts.recordingTrash.length ? `<details class="checkpoint-trash"><summary>口语回收站（${ielts.recordingTrash.length}）</summary>${ielts.recordingTrash.map((item, index) => `<div class="cet6-material-file"><span>${item.type === 'question' ? escapeHtml(item.question.text) : `${item.recordings.length} 条录音`}</span><button type="button" data-restore-ielts-speaking="${index}">恢复</button></div>`).join('')}</details>` : '');
    $$('[data-ielts-topic]', root).forEach(button => button.addEventListener('click', () => { selectedTopicId = button.dataset.ieltsTopic; renderTopics(); renderQuestions(); }));
    $$('[data-edit-ielts-topic]', root).forEach(button => button.addEventListener('click', () => editTopic(button.dataset.editIeltsTopic)));
    $$('[data-archive-ielts-topic]', root).forEach(button => button.addEventListener('click', () => { const topic = topicById(button.dataset.archiveIeltsTopic); if (topic) topic.archived = true; if (selectedTopicId === topic?.id) selectedTopicId = null; saveState(); renderAll(); }));
    $$('[data-unarchive-ielts-topic]', root).forEach(button => button.addEventListener('click', () => { const topic = topicById(button.dataset.unarchiveIeltsTopic); if (topic) topic.archived = false; saveState(); renderAll(); }));
    let draggedTopicId = null; $$('[data-drag-ielts-topic]', root).forEach(row => { row.addEventListener('dragstart', () => { draggedTopicId = row.dataset.dragIeltsTopic; }); row.addEventListener('dragover', event => event.preventDefault()); row.addEventListener('drop', event => { event.preventDefault(); reorderTopic(draggedTopicId, row.dataset.dragIeltsTopic); }); });
    $$('[data-restore-ielts-speaking]', root).forEach(button => button.addEventListener('click', () => restoreSpeakingTrash(Number(button.dataset.restoreIeltsSpeaking))));
    renderQuestions();
  }

  function reorderTopic(sourceId, targetId) { if (!sourceId || sourceId === targetId) return; const from = ielts.topics.findIndex(item => item.id === sourceId), to = ielts.topics.findIndex(item => item.id === targetId); if (from < 0 || to < 0) return; const [topic] = ielts.topics.splice(from, 1); ielts.topics.splice(to, 0, topic); saveState(); renderTopics(); }
  function editTopic(id) { const topic = topicById(id); if (!topic) return; const name = window.prompt('修改话题名称', topic.name); if (!name?.trim()) return; topic.name = name.trim(); const tags = window.prompt('修改标签（可留空）', topic.tags || ''); if (tags !== null) topic.tags = tags.trim(); saveState(); renderAll(); }

  function restoreSpeakingTrash(index) {
    const item = ielts.recordingTrash[index]; if (!item) return;
    if (item.type === 'question') { const topic = topicById(item.topicId); if (!topic) { showToast('原话题已不存在，无法恢复题目'); return; } topic.questions.push(item.question); ielts.recordings.push(...item.recordings); }
    else ielts.recordings.push(...item.recordings);
    ielts.recordingTrash.splice(index, 1); saveState(); renderAll(); showToast('口语内容已恢复');
  }

  function renderQuestions() {
    const topic = topicById(selectedTopicId);
    $('#addIeltsQuestionButton').disabled = !topic;
    $('#clearIeltsTopicRecordingsButton').disabled = !topic || !topic.questions.some(question => recordingsFor(question.id).length);
    $('#ieltsSpeakingPartLabel').textContent = topic?.part || '选择话题';
    $('#ieltsSpeakingTopicTitle').textContent = topic?.name || '口语训练';
    if (!topic) { $('#ieltsQuestionList').innerHTML = '<div class="empty-state"><strong>尚未选择话题</strong><span>创建或选择话题后，可逐题录音或启动完整模拟。</span></div>'; return; }
    $('#ieltsQuestionList').innerHTML = topic.questions.length ? topic.questions.map((question, index) => {
      const preferred = preferredRecording(question.id), count = recordingsFor(question.id).length;
      return `<article class="speaking-question-card" draggable="true" data-drag-ielts-question="${question.id}"><div class="question-index">${index + 1}</div><div><strong>${escapeHtml(question.text)}</strong>${question.cues?.length ? `<small>${question.cues.map(escapeHtml).join(' · ')}</small>` : ''}<span>${count ? `${count} 条录音 · ${preferred?.favorite ? '默认播放最佳录音' : '默认播放最近录音'}` : '尚未录音'}</span></div><div class="record-actions"><button type="button" data-ielts-record-question="${question.id}">录音</button>${preferred ? `<button type="button" data-ielts-play-recording="${preferred.id}">回听</button><button type="button" data-ielts-transcribe="${preferred.id}">转写/分析</button>` : ''}<button type="button" data-edit-ielts-question="${question.id}">编辑</button><button type="button" data-ielts-review-question="${question.id}">安排复习</button><button type="button" data-ielts-delete-question="${question.id}">删除</button></div></article>`;
    }).join('') : '<div class="empty-state"><strong>该话题尚无题目</strong><span>可逐条增加或一次粘贴多行题目。</span></div>';
    $$('[data-ielts-record-question]').forEach(button => button.addEventListener('click', () => openSpeakingRecorder(button.dataset.ieltsRecordQuestion)));
    $$('[data-ielts-play-recording]').forEach(button => button.addEventListener('click', () => playSavedRecording(button.dataset.ieltsPlayRecording)));
    $$('[data-ielts-transcribe]').forEach(button => button.addEventListener('click', () => prepareIeltsAiFromRecording(button.dataset.ieltsTranscribe)));
    $$('[data-edit-ielts-question]').forEach(button => button.addEventListener('click', () => editQuestion(button.dataset.editIeltsQuestion)));
    $$('[data-ielts-review-question]').forEach(button => button.addEventListener('click', () => scheduleQuestionReview(button.dataset.ieltsReviewQuestion)));
    $$('[data-ielts-delete-question]').forEach(button => button.addEventListener('click', () => deleteQuestion(button.dataset.ieltsDeleteQuestion)));
    let draggedQuestionId = null; $$('[data-drag-ielts-question]').forEach(card => { card.addEventListener('dragstart', () => { draggedQuestionId = card.dataset.dragIeltsQuestion; }); card.addEventListener('dragover', event => event.preventDefault()); card.addEventListener('drop', event => { event.preventDefault(); reorderQuestion(topic, draggedQuestionId, card.dataset.dragIeltsQuestion); }); });
  }

  function editQuestion(id) { const found = questionById(id); if (!found) return; const text = window.prompt('修改题目', found.question.text); if (!text?.trim()) return; found.question.text = text.trim(); saveState(); renderQuestions(); }
  function reorderQuestion(topic, sourceId, targetId) { const from = topic.questions.findIndex(item => item.id === sourceId), to = topic.questions.findIndex(item => item.id === targetId); if (from < 0 || to < 0 || from === to) return; const [question] = topic.questions.splice(from, 1); topic.questions.splice(to, 0, question); saveState(); renderQuestions(); }

  function saveTopic(event) {
    event.preventDefault();
    const name = $('#ieltsTopicName').value.trim();
    if (!name) return;
    const topic = { id: uid('ielts-topic'), part: $('#ieltsTopicPart').value, name, tags: $('#ieltsTopicTags').value.trim(), parentPart2Id: $('#ieltsTopicParent')?.value || '', createdAt: new Date().toISOString(), questions: [] };
    $('#ieltsTopicQuestions').value.split(/\r?\n/).map(item => item.trim()).filter(Boolean).forEach(text => topic.questions.push({ id: uid('ielts-question'), text, cues: [], reviewDates: [], createdAt: new Date().toISOString() }));
    ielts.topics.push(topic); selectedTopicId = topic.id; saveState(); $('#ieltsTopicDialog').close('saved'); renderAll();
  }

  function saveQuestions(event) {
    event.preventDefault(); const topic = topicById(selectedTopicId); if (!topic) return;
    const cues = $('#ieltsQuestionCues').value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    $('#ieltsQuestionText').value.split(/\r?\n/).map(item => item.trim()).filter(Boolean).forEach((text, index) => topic.questions.push({ id: uid('ielts-question'), text, cues: index === 0 ? cues : [], reviewDates: [], createdAt: new Date().toISOString() }));
    saveState(); $('#ieltsQuestionDialog').close('saved'); renderAll();
  }

  function deleteQuestion(id) {
    const found = questionById(id); if (!found) return;
    const count = recordingsFor(id).length;
    if (!window.confirm(`删除该题及其 ${count} 条录音？内容会进入30天回收站。`)) return;
    ielts.recordingTrash.push({ type: 'question', topicId: found.topic.id, question: found.question, recordings: recordingsFor(id), deletedAt: new Date().toISOString() });
    found.topic.questions = found.topic.questions.filter(item => item.id !== id);
    ielts.recordings = ielts.recordings.filter(item => item.questionId !== id);
    saveState(); renderAll();
  }

  function scheduleQuestionReview(id) {
    const found = questionById(id); if (!found) return;
    const value = window.prompt('输入复习日期（YYYY-MM-DD）', isoToday());
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    if (!found.question.reviewDates.some(item => item.date === value)) found.question.reviewDates.push({ date: value, done: false });
    saveState(); renderWeaknesses(); showToast('口语复习日期已保存');
  }

  function clearTopicRecordings() {
    const topic = topicById(selectedTopicId); if (!topic) return;
    const ids = new Set(topic.questions.map(item => item.id)); const records = ielts.recordings.filter(item => ids.has(item.questionId));
    if (!records.length || !window.confirm(`清空“${topic.name}”的 ${records.length} 条录音？题目不会删除，录音进入30天回收站。`)) return;
    ielts.recordingTrash.push({ type: 'recordings', topicId: topic.id, recordings: records, deletedAt: new Date().toISOString() });
    ielts.recordings = ielts.recordings.filter(item => !ids.has(item.questionId)); saveState(); renderAll();
  }

  function renderRatings() {
    $('#ieltsSpeakingRatings').innerHTML = ratingNames.map(name => `<label>${name}<select data-speaking-rating="${name}">${[1,2,3,4,5].map(value => `<option value="${value}" ${value === 3 ? 'selected' : ''}>${value}</option>`).join('')}</select></label>`).join('');
  }

  function openSpeakingRecorder(questionId) {
    const found = questionById(questionId); if (!found) return;
    activeQuestionId = questionId; recordingDraft = null;
    $('#ieltsRecordingPart').textContent = `${found.topic.part} · ${ielts.settings.speakingMode === 'simulation' ? '完整模拟' : '逐题练习'}`;
    $('#ieltsRecordingQuestion').textContent = found.question.text;
    $('#ieltsRecordingStatus').textContent = '准备录音'; $('#ieltsRecordingTimer').textContent = '00:00';
    $('#ieltsRecordingResult').hidden = true; $('#startIeltsRecordingButton').disabled = false; $('#pauseIeltsRecordingButton').disabled = true; $('#stopIeltsRecordingButton').disabled = true;
    renderRatings(); $('#ieltsSpeakingDialog').showModal();
  }

  async function beginRecording() {
    const found = questionById(activeQuestionId);
    if (ielts.settings.speakingMode === 'simulation' && ielts.settings.simulationFlow === 'automatic' && found?.topic.part === 'Part 2' && preparedQuestionId !== activeQuestionId) {
      preparedQuestionId = activeQuestionId; let prep = 60; $('#ieltsRecordingCountdown').hidden = false; $('#ieltsRecordingCountdown').textContent = prep; $('#ieltsRecordingStatus').textContent = 'Part 2 准备时间'; $('#startIeltsRecordingButton').disabled = true;
      countdownTimer = setInterval(() => { prep -= 1; $('#ieltsRecordingCountdown').textContent = prep; if (prep <= 0) { clearInterval(countdownTimer); $('#ieltsRecordingCountdown').hidden = true; beginRecording(); } }, 1000); return;
    }
    if (ielts.settings.countdown) {
      let value = 3; $('#ieltsRecordingCountdown').hidden = false; $('#ieltsRecordingCountdown').textContent = value;
      $('#startIeltsRecordingButton').disabled = true;
      countdownTimer = setInterval(() => { value -= 1; if (value > 0) $('#ieltsRecordingCountdown').textContent = value; else { clearInterval(countdownTimer); $('#ieltsRecordingCountdown').hidden = true; startNativeRecording(); } }, 1000);
    } else await startNativeRecording();
  }

  async function startNativeRecording() {
    try {
      const result = await callNative('startIeltsRecording', { microphoneId: ielts.settings.microphoneId, questionId: activeQuestionId, temporary: false });
      recordingDraft = { path: result.path, startedAt: new Date().toISOString(), startedMs: Date.now(), duration: 0 };
      $('#ieltsRecordingStatus').textContent = '正在录音'; $('#ieltsRecordingWave').classList.add('active'); $('#pauseIeltsRecordingButton').disabled = false; $('#stopIeltsRecordingButton').disabled = false;
      recordingTicker = setInterval(() => { recordingDraft.duration = (Date.now() - recordingDraft.startedMs) / 1000; $('#ieltsRecordingTimer').textContent = formatClock(recordingDraft.duration).slice(3); const part = questionById(activeQuestionId)?.topic.part; const limit = part === 'Part 2' ? 120 : part === 'Part 1' ? 30 : 60; if (ielts.settings.speakingMode === 'simulation' && ielts.settings.simulationFlow === 'automatic' && recordingDraft.duration >= limit && !recordingDraft.autoStopping) { recordingDraft.autoStopping = true; stopRecording().then(() => saveRecording(false)); } }, 250);
    } catch (error) { $('#startIeltsRecordingButton').disabled = false; showToast(error.message === 'microphone_permission_denied' ? '未获得麦克风权限，请在系统设置中开启' : '无法开始录音'); }
  }

  async function pauseRecording() {
    if (!recordingDraft) return;
    const pausing = $('#pauseIeltsRecordingButton').textContent === '暂停';
    await callNative(pausing ? 'pauseIeltsRecording' : 'resumeIeltsRecording').catch(() => null);
    $('#pauseIeltsRecordingButton').textContent = pausing ? '继续' : '暂停'; $('#ieltsRecordingStatus').textContent = pausing ? '已暂停' : '正在录音';
  }

  async function stopRecording() {
    if (!recordingDraft) return;
    clearInterval(recordingTicker); $('#ieltsRecordingWave').classList.remove('active');
    try { const result = await callNative('stopIeltsRecording'); recordingDraft.duration = result.duration || recordingDraft.duration; recordingDraft.path = result.path || recordingDraft.path; }
    catch (_) { showToast('录音停止状态未确认，请检查本地文件'); }
    $('#ieltsRecordingStatus').textContent = '录音完成'; $('#ieltsRecordingResult').hidden = false; $('#pauseIeltsRecordingButton').disabled = true; $('#stopIeltsRecordingButton').disabled = true;
  }

  function saveRecording(favorite = false) {
    if (!recordingDraft || !activeQuestionId) return;
    if (favorite) ielts.recordings.filter(item => item.questionId === activeQuestionId).forEach(item => { item.favorite = false; });
    const ratings = {}; $$('[data-speaking-rating]').forEach(input => { ratings[input.dataset.speakingRating] = Number(input.value); });
    const record = { id: uid('ielts-recording'), questionId: activeQuestionId, path: recordingDraft.path, duration: recordingDraft.duration, favorite, note: $('#ieltsRecordingNote').value.trim(), ratings, createdAt: new Date().toISOString(), transcription: '' };
    ielts.recordings.push(record);
    const topicId = questionById(activeQuestionId)?.topic.id;
    if (ielts.settings.speakingMode === 'simulation' && simulationDraft) simulationDraft.recordingIds.push(record.id);
    else ielts.speakingSessions.unshift({ id: uid('ielts-speaking-session'), date: isoToday(), topicId, recordingIds: [record.id], mode: 'questions' });
    saveState(); $('#ieltsSpeakingDialog').close('saved'); recordingDraft = null; renderAll(); showToast(favorite ? '已保存并设为最佳录音' : '口语录音已保存');
    if (simulationDraft) {
      simulationDraft.index += 1;
      const nextId = simulationDraft.questionIds[simulationDraft.index];
      if (nextId) setTimeout(() => { openSpeakingRecorder(nextId); if (ielts.settings.simulationFlow === 'automatic') beginRecording(); }, 180);
      else { ielts.speakingSessions.unshift({ id: uid('ielts-speaking-session'), date: isoToday(), topicId: simulationDraft.topicId, recordingIds: [...simulationDraft.recordingIds], mode: 'simulation' }); simulationDraft = null; preparedQuestionId = null; saveState(); renderAll(); showToast('完整口语模拟已保存'); }
    }
  }

  async function playSavedRecording(id) {
    const record = ielts.recordings.find(item => item.id === id); if (!record) return;
    try { await callNative('loadTrainingAudio', { path: record.path }); await callNative('controlTrainingAudio', { command: 'play' }); showToast(record.favorite ? '正在播放最佳录音' : '正在播放最近录音'); }
    catch (_) { showToast('录音文件失效，请检查本地路径'); }
  }

  async function handleRecordingAudio(action) {
    if (!recordingDraft?.path) return;
    try {
      if (action === 'toggle') { const status = await callNative('getTrainingAudioStatus'); if (!status.loaded) await callNative('loadTrainingAudio', { path: recordingDraft.path }); await callNative('controlTrainingAudio', { command: status.playing ? 'pause' : 'play' }); }
      if (action === 'skip-back') await callNative('controlTrainingAudio', { command: 'skip', seconds: -5 });
      if (action === 'skip-forward') await callNative('controlTrainingAudio', { command: 'skip', seconds: 5 });
    } catch (_) { try { await callNative('loadTrainingAudio', { path: recordingDraft.path }); await callNative('controlTrainingAudio', { command: 'play' }); } catch (_) { showToast('无法回听录音'); } }
  }

  async function setRecordingPlaybackRate(value) {
    try { await callNative('controlTrainingAudio', { command: 'set-rate', rate: Number(value) }); } catch (_) { showToast('当前录音不支持倍速'); }
  }

  async function prepareIeltsAiFromRecording(id) {
    const record = ielts.recordings.find(item => item.id === id), found = record && questionById(record.questionId); if (!record || !found) return;
    switchTab('ai'); setIeltsAiMode('speaking'); $('#ieltsAiQuestion').value = found.question.text; $('#ieltsAiTranscript').value = record.transcription || '';
    if (!record.transcription) {
      $('#ieltsAiStatus').textContent = '正在请求本地/系统英文转写…';
      try { const result = await callNative('transcribeIeltsRecording', { path: record.path }); record.transcription = result.text || ''; $('#ieltsAiTranscript').value = record.transcription; saveState(); $('#ieltsAiStatus').textContent = result.onDevice ? '设备端转写完成，请校对' : '系统转写完成，请校对后再发送'; }
      catch (_) { $('#ieltsAiStatus').textContent = '自动转写不可用，请手动输入并校对英文转写'; }
    }
  }

  function renderSpeakingSessions() {
    $('#ieltsSpeakingSessionList').innerHTML = ielts.speakingSessions.length ? ielts.speakingSessions.slice(0, 30).map(session => { const topic = topicById(session.topicId); return `<article class="exam-record-row"><div class="record-score"><b>口语</b><span>${escapeHtml(session.mode === 'simulation' ? '完整模拟' : '逐题练习')}</span></div><div class="record-main"><strong>${escapeHtml(topic?.name || '已删除话题')}</strong><span>${escapeHtml(session.date)} · ${session.recordingIds.length} 条录音</span></div></article>`; }).join('') : '<div class="empty-state"><strong>暂无口语会话记录</strong><span>口语考试记录与笔试完全分开。</span></div>';
  }

  function renderWeaknesses() {
    const reviews = [];
    ielts.topics.forEach(topic => topic.questions.forEach(question => (question.reviewDates || []).filter(item => !item.done).forEach(item => reviews.push({ topic, question, date: item.date }))));
    const weak = ielts.recordings.filter(record => Math.min(...Object.values(record.ratings || { a: 5 })) <= 2);
    $('#ieltsWeaknessList').innerHTML = reviews.length || weak.length ? [...reviews.map(item => `<article class="exam-record-row"><div class="record-score"><b>${escapeHtml(item.date)}</b><span>口语复习</span></div><div class="record-main"><strong>${escapeHtml(item.topic.name)}</strong><span>${escapeHtml(item.question.text)}</span></div></article>`), ...weak.slice(0, 10).map(record => `<article class="exam-record-row"><div class="record-score"><b>自评偏低</b><span>建议复练</span></div><div class="record-main"><strong>${escapeHtml(questionById(record.questionId)?.question.text || '已删除题目')}</strong><span>录音 ${escapeHtml(record.createdAt.slice(0, 10))}</span></div></article>`)].join('') : '<div class="empty-state"><strong>暂无待复盘项</strong><span>复习日期、自评和重复问题会汇总在这里。</span></div>';
  }

  function openWrittenSetup(kind) {
    $('#ieltsWrittenSetupForm').reset(); $('#ieltsWrittenKind').value = kind; $('#ieltsWrittenDate').value = isoToday(); $('#ieltsWrittenExamType').value = ielts.settings.defaultType;
    $('#ieltsWrittenSetupTitle').textContent = kind === 'full' ? '完整 IELTS 笔试模拟' : kind === 'modules' ? 'IELTS 模块组合训练' : '纸质版/其他平台直接计时';
    writtenOrder = [...modules]; renderWrittenModules(kind === 'full'); renderMaterialOptions(); $('#ieltsWrittenSetupDialog').showModal();
  }

  function renderWrittenModules(selectAll) {
    $('#ieltsWrittenModuleOrder').innerHTML = writtenOrder.map((module, index) => `<div class="cet6-module-row"><input type="checkbox" data-ielts-module-check value="${module}" ${selectAll || index === 0 ? 'checked' : ''}><span>${module}</span><button type="button" data-ielts-module-up="${index}">↑</button><button type="button" data-ielts-module-down="${index}">↓</button></div>`).join('');
    $$('[data-ielts-module-check]').forEach(input => input.addEventListener('change', renderWrittenTimes));
    $$('[data-ielts-module-up]').forEach(button => button.addEventListener('click', () => moveWrittenModule(Number(button.dataset.ieltsModuleUp), -1)));
    $$('[data-ielts-module-down]').forEach(button => button.addEventListener('click', () => moveWrittenModule(Number(button.dataset.ieltsModuleDown), 1)));
    renderWrittenTimes();
  }
  function moveWrittenModule(index, delta) { const target = index + delta; if (target < 0 || target >= writtenOrder.length) return; [writtenOrder[index], writtenOrder[target]] = [writtenOrder[target], writtenOrder[index]]; renderWrittenModules(false); }
  function selectedWrittenModules() { return writtenOrder.filter(module => document.querySelector(`[data-ielts-module-check][value="${module}"]`)?.checked); }
  function renderWrittenTimes() { $('#ieltsWrittenModuleTimes').innerHTML = selectedWrittenModules().map(module => `<label class="cet6-module-time-row">${module}<input type="number" min="1" max="180" value="${defaultMinutes[module]}" data-ielts-module-minutes="${module}"><span>分钟</span></label>`).join(''); }

  function createWrittenSession(event) {
    event.preventDefault(); const selected = selectedWrittenModules(); if (!selected.length) { $('#ieltsWrittenSetupError').textContent = '请至少选择一个笔试模块。'; return; }
    const moduleSeconds = {}; selected.forEach(module => { moduleSeconds[module] = Number(document.querySelector(`[data-ielts-module-minutes="${module}"]`).value) * 60; });
    const material = ielts.materials.find(item => item.id === $('#ieltsWrittenMaterial').value);
    const kind = $('#ieltsWrittenKind').value, delivery = $('#ieltsWrittenDelivery').value;
    ielts.writtenTraining.active = WorkbenchCet6TrainingCore.createSession({ kind, trainingDate: $('#ieltsWrittenDate').value, timerMode: $('#ieltsWrittenTimerMode').value, totalSeconds: Object.values(moduleSeconds).reduce((sum, value) => sum + value, 0), modules: selected, moduleSeconds, materialId: material?.id || '', materialTitle: material?.title || '', audioMode: $('#ieltsWrittenAudioMode').value, delivery, examType: $('#ieltsWrittenExamType').value, strict: kind === 'full' && delivery !== 'free', timingRule: { status: 'pending', label: '官方计时规则待配置' } }, Date.now());
    saveState(); $('#ieltsWrittenSetupDialog').close('created'); openWrittenTraining(); renderWrittenCurrent();
  }

  function renderWrittenCurrent() {
    const session = ielts.writtenTraining.active;
    if (!session) { $('#ieltsCurrentSessionTitle').textContent = ielts.writtenTraining.pendingRecord ? '上次训练待填写记录' : '尚未开始'; $('#ieltsCurrentSessionSummary').innerHTML = ielts.writtenTraining.pendingRecord ? '<strong>计时已经结束</strong><span>完成日期和训练模块为必填。</span>' : '<strong>选择一种训练方式</strong><span>准备完成后仍需点击开始。</span>'; $('#resumeIeltsSessionButton').hidden = !ielts.writtenTraining.pendingRecord; return; }
    $('#ieltsCurrentSessionTitle').textContent = session.materialTitle || '无电子资料训练'; $('#ieltsCurrentSessionSummary').innerHTML = `<strong>${escapeHtml(session.modules.join('、'))}</strong><span>${escapeHtml(session.examType)} · ${escapeHtml(session.delivery)} · ${session.status === 'running' ? '进行中' : session.status === 'paused' ? '已暂停' : '准备开始'}</span>`; $('#resumeIeltsSessionButton').hidden = false;
  }

  async function openWrittenTraining() { const session = ielts.writtenTraining.active; if (!session) { openWrittenRecord(); return; } $('#ieltsWrittenTrainingTitle').textContent = session.materialTitle || 'IELTS 笔试训练'; const material = ielts.materials.find(item => item.id === session.materialId); const files = material ? [...(material.paper || []), ...(session.answerViewedAt ? material.answer || [] : [])] : []; $('#ieltsWrittenFiles').innerHTML = files.length ? files.map(file => `<button type="button" data-open-written-file="${escapeHtml(file.path)}"><span>${escapeHtml(file.fileName)}</span><b>预览</b></button>`).join('') + (!session.answerViewedAt && material?.answer?.length ? '<button type="button" id="unlockIeltsAnswerButton"><span>答案已锁定</span><b>确认查看</b></button>' : '') : '<div class="empty-state compact-empty"><strong>未关联电子资料</strong><span>可以使用纸质试卷或其他平台继续计时。</span></div>'; $$('[data-open-written-file]').forEach(button => button.addEventListener('click', () => callNative('openLocalTrainingFile', { path: button.dataset.openWrittenFile }).catch(() => showToast('文件失效')))); $('#unlockIeltsAnswerButton')?.addEventListener('click', () => { if (!window.confirm('训练尚未结束，确定提前查看答案并记录该行为？')) return; session.answerViewedAt = new Date().toISOString(); saveState(); $('#ieltsWrittenTrainingDialog').close('refresh'); openWrittenTraining(); }); if (session.audioMode === 'workspace' && material?.audio?.[0]) await callNative('loadTrainingAudio', { path: material.audio[0].path }).catch(() => showToast('听力音频加载失败')); $('#ieltsWrittenTrainingMode').textContent = `${session.strict ? '严格模拟' : '自由练习'} · ${session.timingRule.label}`; $('#ieltsWrittenTrainingDialog').showModal(); clearInterval(writtenTicker); writtenTicker = setInterval(renderWrittenTimer, 1000); renderWrittenTimer(); }
  function renderWrittenTimer() { const session = ielts.writtenTraining.active; if (!session) return; $('#ieltsWrittenTimerDisplay').textContent = formatClock(WorkbenchCet6TrainingCore.remainingSeconds(session, Date.now())); $('#ieltsWrittenCurrentModule').textContent = WorkbenchCet6TrainingCore.currentModule(session) || session.modules.join('、'); $('#ieltsWrittenTrainingStatus').textContent = session.status === 'running' ? '计时中' : session.status === 'paused' ? '已暂停' : '准备开始'; $('#ieltsWrittenStartPauseButton').textContent = session.status === 'running' ? '暂停' : session.status === 'paused' ? '继续' : '开始'; $('#ieltsWrittenModuleProgress').innerHTML = session.modules.map((_, index) => `<span class="${index === session.moduleIndex ? 'active' : ''}"></span>`).join(''); }
  async function toggleWrittenTimer() { const session = ielts.writtenTraining.active; if (!session) return; if (session.status === 'running' && session.strict) { showToast('严格模拟不允许暂停，可选择结束训练'); return; } ielts.writtenTraining.active = session.status === 'running' ? WorkbenchCet6TrainingCore.pause(session, Date.now()) : session.status === 'paused' ? WorkbenchCet6TrainingCore.resume(session, Date.now()) : WorkbenchCet6TrainingCore.start(session, Date.now()); if (session.audioMode === 'workspace') await callNative('controlTrainingAudio', { command: ielts.writtenTraining.active.status === 'running' ? 'play' : 'pause' }).catch(() => null); saveState(); renderWrittenTimer(); renderWrittenCurrent(); }
  function nextWrittenModule() { const session = ielts.writtenTraining.active; if (!session) return; if (session.moduleIndex >= session.modules.length - 1) return finishWrittenSession(); ielts.writtenTraining.active = WorkbenchCet6TrainingCore.nextModule(session); saveState(); renderWrittenTimer(); }
  function finishWrittenSession() { const session = ielts.writtenTraining.active; if (!session || !window.confirm('结束本次 IELTS 笔试训练并填写记录？')) return; const stopped = session.status === 'running' ? WorkbenchCet6TrainingCore.pause(session, Date.now()) : session; ielts.writtenTraining.pendingRecord = { session: stopped, completedAt: new Date().toISOString() }; ielts.writtenTraining.active = null; saveState(); clearInterval(writtenTicker); $('#ieltsWrittenTrainingDialog').close('finish'); renderWrittenCurrent(); openWrittenRecord(); }
  function openWrittenRecord() { const pending = ielts.writtenTraining.pendingRecord; if (!pending) return; $('#ieltsWrittenRecordForm').reset(); $('#ieltsWrittenRecordDate').value = pending.completedAt.slice(0, 10); $('#ieltsWrittenRecordModules').value = pending.session.modules.join('、'); $('#ieltsWrittenRecordMaterial').value = pending.session.materialTitle || ''; $('#ieltsWrittenRecordDuration').value = Math.round(WorkbenchCet6TrainingCore.totalElapsedSeconds(pending.session) / 60); $('#ieltsWrittenRecordDialog').showModal(); }
  function saveWrittenRecord(event, draft = false) { event?.preventDefault(); const date = $('#ieltsWrittenRecordDate').value, module = $('#ieltsWrittenRecordModules').value.trim(); if (!draft && (!date || !module)) { $('#ieltsWrittenRecordError').textContent = '完成日期和训练模块为必填项。'; return; } const review = $('#ieltsWrittenRecordReview').value; state.ieltsRecords.unshift({ id: uid('ielts-record'), module, material: $('#ieltsWrittenRecordMaterial').value.trim() || '未填写材料', date: date || isoToday(), duration: Number($('#ieltsWrittenRecordDuration').value || 0), correct: $('#ieltsWrittenRecordCorrect').value === '' ? null : Number($('#ieltsWrittenRecordCorrect').value), total: $('#ieltsWrittenRecordTotal').value === '' ? null : Number($('#ieltsWrittenRecordTotal').value), writingScore: null, notes: $('#ieltsWrittenRecordNotes').value.trim(), status: draft ? '待补记录' : '已完成', reviews: review ? [{ date: review, done: false }] : [], createdAt: new Date().toISOString() }); ielts.writtenTraining.pendingRecord = null; saveState(); $('#ieltsWrittenRecordDialog').close('saved'); renderExamRecords('ielts'); renderAll(); }

  function inferMaterialGroups(files) {
    const map = new Map();
    files.forEach(file => { const name = file.name || file.fileName || ''; const book = name.match(/(?:剑雅|cambridge\s*ielts)\s*(\d+)/i)?.[1] || '未识别'; const test = name.match(/test\s*([1-4])/i)?.[1] || '未识别'; const key = `${book}-${test}`; if (!map.has(key)) map.set(key, { id: uid('ielts-import'), book, test, title: `剑雅${book} Test ${test}`, files: [] }); map.get(key).files.push({ path: file.path, fileName: name, type: /答案|answer/i.test(name) ? 'answer' : /\.m(p3|4a)$|\.wav$|\.aac$/i.test(name) ? 'audio' : /原文|transcript/i.test(name) ? 'transcript' : 'paper' }); });
    return [...map.values()];
  }
  async function chooseMaterials(action) { try { const result = await callNative(action); pendingImport = inferMaterialGroups(result.files || []); $('#ieltsImportGroups').innerHTML = pendingImport.map(group => `<article class="cet6-import-group"><header><strong>${escapeHtml(group.title)}</strong><span>${group.files.length} 个文件</span></header>${group.files.map(file => `<div class="cet6-material-file"><span>${escapeHtml(file.fileName)}</span><b>${escapeHtml(file.type)}</b></div>`).join('')}</article>`).join(''); $('#ieltsImportDialog').showModal(); } catch (error) { if (!/cancel/i.test(error.message)) showToast('无法选择 IELTS 资料'); } }
  async function confirmImport(event) { event.preventDefault(); const copy = document.querySelector('[name="ieltsStorageMode"]:checked').value === 'copy'; try { for (const group of pendingImport) { const material = { id: uid('ielts-material'), title: group.title, book: group.book, test: group.test, examType: ielts.settings.defaultType, paper: [], answer: [], audio: [], transcript: [], createdAt: new Date().toISOString() }; for (const file of group.files) { const result = await callNative('importIeltsAsset', { path: file.path, copy }); material[file.type].push({ path: result.path, fileName: result.fileName, managed: copy }); } ielts.materials.push(material); } pendingImport = []; saveState(); $('#ieltsImportDialog').close('saved'); renderAll(); api.renderLibrary(); } catch (_) { $('#ieltsImportError').textContent = '导入失败，已保留原文件；请检查存储目录后重试。'; } }
  function renderMaterialOptions() { $('#ieltsWrittenMaterial').innerHTML = '<option value="">不关联资料 / 纸质版 / 其他平台</option>' + ielts.materials.map(item => `<option value="${item.id}">${escapeHtml(item.title)}</option>`).join(''); }
  function renderMaterials() { $('#ieltsMaterialList').innerHTML = (ielts.materials.length ? ielts.materials.map(item => `<article class="cet6-material-card"><header><div><strong>${escapeHtml(item.title)}</strong><span class="status-tag">${escapeHtml(item.examType)}</span></div><button type="button" data-delete-ielts-material="${item.id}">删除</button></header>${['paper','answer','audio','transcript'].flatMap(type => (item[type] || []).map(file => `<div class="cet6-material-file"><span>${escapeHtml(file.fileName)}</span><button type="button" data-open-ielts-file="${escapeHtml(file.path)}">预览</button></div>`)).join('')}</article>`).join('') : '<div class="empty-state"><strong>尚未导入 IELTS 资料</strong><span>可以选择文件夹配对，也可以直接使用纸质版计时。</span></div>') + (ielts.materialTrash.length ? `<details class="checkpoint-trash"><summary>资料回收站（${ielts.materialTrash.length}）</summary>${ielts.materialTrash.map((item, index) => `<div class="cet6-material-file"><span>${escapeHtml(item.material.title)}</span><button type="button" data-restore-ielts-material="${index}">恢复</button></div>`).join('')}</details>` : ''); $$('[data-open-ielts-file]').forEach(button => button.addEventListener('click', () => callNative('openLocalTrainingFile', { path: button.dataset.openIeltsFile }).catch(() => showToast('文件失效')))); $$('[data-delete-ielts-material]').forEach(button => button.addEventListener('click', () => { const index = ielts.materials.findIndex(item => item.id === button.dataset.deleteIeltsMaterial); if (index < 0 || !window.confirm('将该资料移入30天回收站？训练历史不会删除。')) return; ielts.materialTrash.push({ material: ielts.materials.splice(index, 1)[0], deletedAt: new Date().toISOString() }); saveState(); renderAll(); })); $$('[data-restore-ielts-material]').forEach(button => button.addEventListener('click', () => { const item = ielts.materialTrash.splice(Number(button.dataset.restoreIeltsMaterial), 1)[0]; if (item) ielts.materials.push(item.material); saveState(); renderAll(); })); renderMaterialOptions(); }

  async function purgeExpiredTrash() {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const expiredMaterials = ielts.materialTrash.filter(item => new Date(item.deletedAt).getTime() <= cutoff);
    for (const item of expiredMaterials) for (const type of ['paper','answer','audio','transcript']) for (const file of item.material[type] || []) if (file.managed) await callNative('deleteManagedIeltsFile', { path: file.path }).catch(() => null);
    const expiredSpeaking = ielts.recordingTrash.filter(item => new Date(item.deletedAt).getTime() <= cutoff);
    for (const item of expiredSpeaking) for (const recording of item.recordings || []) await callNative('deleteIeltsRecordingAsset', { path: recording.path }).catch(() => null);
    ielts.materialTrash = ielts.materialTrash.filter(item => new Date(item.deletedAt).getTime() > cutoff);
    ielts.recordingTrash = ielts.recordingTrash.filter(item => new Date(item.deletedAt).getTime() > cutoff);
    ielts.recordTrash = ielts.recordTrash.filter(item => new Date(item.deletedAt).getTime() > cutoff);
    saveState();
  }

  function setIeltsAiMode(mode) { aiMode = mode; $$('[data-ielts-ai-mode]').forEach(button => button.classList.toggle('active', button.dataset.ieltsAiMode === mode)); $('#ieltsAiSpeakingFields').hidden = mode !== 'speaking'; $('#ieltsAiWritingFields').hidden = mode !== 'writing'; }
  function renderIeltsAiMessages() { $('#ieltsAiMessages').innerHTML = '<div class="ai-message assistant"><b>IELTS AI</b><p>仅处理口语转写和 IELTS 写作。听力、阅读与原始录音不在权限范围内。</p></div>' + ielts.aiChats.slice(-20).map(message => `<div class="ai-message ${message.role}"><b>${message.role === 'user' ? '你' : 'IELTS AI'}</b><p>${escapeHtml(message.content)}</p></div>`).join(''); }
  function ieltsSystemPrompt(mode) { return mode === 'speaking' ? '你是受限的IELTS口语文字反馈助手。只能基于题目和用户确认的英文转写，分析切题、逻辑结构、词汇重复、语法、表达改进和下一次练习建议。不得评价发音或伪造Band分数，不得处理工作台其他任务。' : '你是受限的IELTS写作反馈助手。根据用户提供的考试类型和Task分析任务回应、连贯衔接、词汇和语法。当前工作台没有配置经核验的评分规则来源与版本，因此本次禁止输出Band数字或区间。只给分项文字依据、逐段问题、建议和与原文分开的修订稿，不得处理其他任务。'; }
  async function submitIeltsAi(event, followup = false) { event.preventDefault(); let config; try { config = api.assertAiAvailable('ielts'); } catch (error) { $('#ieltsAiStatus').textContent = error.detail || error.message; return; } const prior = aiMode === 'speaking' && $('#ieltsAiHistoryScope').checked ? ielts.recordings.filter(record => record.transcription).slice(-5).map((record, index) => `历史${index + 1}：${record.transcription}`).join('\n') : ''; const prompt = followup ? $('#ieltsAiFollowup').value.trim() : aiMode === 'speaking' ? `题目：${$('#ieltsAiQuestion').value.trim()}\n确认转写：${$('#ieltsAiTranscript').value.trim()}${prior ? `\n授权比较的同题历史（最多5次）：\n${prior}` : ''}` : `考试类型：${$('#ieltsAiExamType').value}\n任务：${$('#ieltsAiWritingTask').value}\n题目：${$('#ieltsAiWritingQuestion').value.trim()}\n作文：${$('#ieltsAiWritingAnswer').value.trim()}`; if (!prompt) return; if (config.assistant.preview && !window.confirm(`将向 ${config.provider} 发送当前 IELTS ${aiMode === 'speaking' ? '题目和转写' : '写作题目和正文'}。原始录音和附件不会发送。是否继续？`)) return; $('#ieltsAiStatus').textContent = '正在分析…'; try { const result = await callNative('sendAiChat', { prompt: `${ieltsSystemPrompt(aiMode)}\n\n${prompt}`, context: { feature: 'IELTS', mode: aiMode, historyIncluded: Boolean(prior) }, attachments: [], history: ielts.aiChats.slice(-8) }); ielts.aiChats.push({ role: 'user', content: prompt, at: new Date().toISOString() }, { role: 'assistant', content: result.content, at: new Date().toISOString(), mode: aiMode }); saveState(); renderIeltsAiMessages(); $('#ieltsAiFollowup').value = ''; $('#ieltsAiStatus').textContent = '分析完成 · 非官方反馈'; } catch (error) { ielts.aiDrafts.push({ mode: aiMode, prompt, failedAt: new Date().toISOString(), error: error.message }); saveState(); $('#ieltsAiStatus').textContent = `调用失败：${error.detail || error.message}，已保存本地草稿`; } }

  function injectSettings() {
    const dataPanel = $('[data-settings-panel="data"]');
    if (dataPanel && !$('#ieltsStoragePathLabel')) dataPanel.insertAdjacentHTML('beforeend', '<div class="setting-row database-location-row"><div><strong>IELTS 训练资料</strong><span>试卷、答案和听力音频</span></div><code id="ieltsStoragePathLabel">正在读取路径</code></div><div class="database-actions"><button class="button primary" id="changeIeltsStorageButton" type="button">更改 IELTS 存储位置</button></div><div class="setting-row database-location-row"><div><strong>IELTS 口语录音</strong><span>M4A 文件与30天回收站</span></div><code id="ieltsRecordingPathLabel">正在读取路径</code></div><div class="database-actions"><button class="button primary" id="changeIeltsRecordingStorageButton" type="button">更改录音存储位置</button></div>');
    $('#changeIeltsStorageButton')?.addEventListener('click', async () => { try { const result = await callNative('chooseIeltsStorageDirectory'); $('#ieltsStoragePathLabel').textContent = result.path; } catch (_) {} });
    $('#changeIeltsRecordingStorageButton')?.addEventListener('click', async () => { try { const result = await callNative('chooseIeltsRecordingDirectory'); $('#ieltsRecordingPathLabel').textContent = result.path; } catch (_) {} });
    Promise.all([callNative('getIeltsStorageInfo').catch(() => null), callNative('getIeltsRecordingStorageInfo').catch(() => null)]).then(([materials, recordings]) => { if (materials) $('#ieltsStoragePathLabel').textContent = materials.path; if (recordings) $('#ieltsRecordingPathLabel').textContent = recordings.path; });
    injectCet6Ai();
    injectTextExtractionButtons();
  }

  function injectTextExtractionButtons() {
    [{ input: '#ieltsAiWritingFile', target: '#ieltsAiWritingAnswer', id: 'extractIeltsWritingText' }, { input: '#cet6AiFile', target: '#cet6AiAnswer', id: 'extractCet6AnswerText' }].forEach(config => {
      const input = $(config.input); if (!input || $(`#${config.id}`)) return;
      input.hidden = true; input.insertAdjacentHTML('afterend', `<button class="button" id="${config.id}" type="button">选择 Word、PDF 或图片并提取文字</button>`);
      $(`#${config.id}`).addEventListener('click', async event => { event.currentTarget.disabled = true; event.currentTarget.textContent = '正在本地提取…'; try { const result = await callNative('chooseAndExtractEnglishText'); const target = $(config.target); target.value = target.value.trim() ? `${target.value.trim()}\n\n${result.text}` : result.text; event.currentTarget.textContent = `已提取：${result.fileName}`; } catch (error) { event.currentTarget.textContent = error.message === 'cancelled' ? '选择 Word、PDF 或图片并提取文字' : '提取失败，请重试'; } finally { event.currentTarget.disabled = false; } });
    });
  }

  function injectCet6Ai() {
    const tabs = $('.cet6-tabs'); if (!tabs || $('[data-cet6-tab="ai"]')) return;
    tabs.insertAdjacentHTML('beforeend', '<button type="button" data-cet6-tab="ai">CET-6 AI</button>');
    tabs.parentElement.insertAdjacentHTML('beforeend', '<div class="cet6-panel" data-cet6-panel="ai"><div class="ai-scope-banner"><strong>CET-6 AI 功能边界</strong><span>仅批改翻译与作文；两类入口使用独立指令和记录。</span></div><div class="segmented cet6-ai-modes"><button class="active" type="button" data-cet6-ai-mode="translation">翻译</button><button type="button" data-cet6-ai-mode="writing">作文</button></div><section class="panel"><form id="cet6ScopedAiForm" class="scoped-ai-form"><label>题目原文<textarea id="cet6AiQuestion" rows="5"></textarea></label><label>用户答案<textarea id="cet6AiAnswer" rows="10"></textarea></label><label>本地附件<input id="cet6AiFile" type="file" accept="image/*,.pdf,.doc,.docx"></label><div class="dialog-actions"><span id="cet6AiStatus" class="muted-note">有可靠评分规则时才给非官方估分区间</span><button class="button primary" type="submit">开始批改</button></div></form></section><section class="panel"><div id="cet6ScopedAiMessages" class="ai-chat-messages"></div></section></div>');
    $('[data-cet6-tab="ai"]').addEventListener('click', event => { $$('[data-cet6-tab]').forEach(item => item.classList.toggle('active', item === event.currentTarget)); $$('[data-cet6-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.cet6Panel === 'ai')); });
    $$('[data-cet6-ai-mode]').forEach(button => button.addEventListener('click', () => { cet6AiMode = button.dataset.cet6AiMode; $$('[data-cet6-ai-mode]').forEach(item => item.classList.toggle('active', item === button)); }));
    $('#cet6ScopedAiForm').addEventListener('submit', submitCet6Ai);
  }

  async function submitCet6Ai(event) { event.preventDefault(); const question = $('#cet6AiQuestion').value.trim(), answer = $('#cet6AiAnswer').value.trim(); if (!question || !answer) { $('#cet6AiStatus').textContent = '请填写题目原文和用户答案'; return; } let config; try { config = api.assertAiAvailable('cet6'); } catch (error) { $('#cet6AiStatus').textContent = error.detail || error.message; return; } if (config.assistant.preview && !window.confirm(`将发送当前 CET-6 ${cet6AiMode === 'translation' ? '翻译' : '作文'}题目和答案；原附件不会直接上传。是否继续？`)) return; const instruction = cet6AiMode === 'translation' ? '你是受限的CET-6翻译批改助手。只能依据信息覆盖、原意准确、语法词汇、表达和连贯评价。当前工作台未配置经核验的评分规则来源与版本，因此本次禁止输出数字估分或区间，只给依据、问题、建议和修订稿。不得处理其他任务。' : '你是受限的CET-6作文批改助手。只能依据切题、结构论证、语言准确、词汇句式和连贯评价。当前工作台未配置经核验的评分规则来源与版本，因此本次禁止输出数字估分或区间，只给依据、问题、建议和修订稿。不得处理其他任务。'; $('#cet6AiStatus').textContent = '正在批改…'; try { const result = await callNative('sendAiChat', { prompt: `${instruction}\n\n题目：${question}\n用户答案：${answer}`, context: { feature: 'CET-6', mode: cet6AiMode }, attachments: [], history: [] }); $('#cet6ScopedAiMessages').innerHTML = `<div class="ai-message assistant"><b>CET-6 ${cet6AiMode === 'translation' ? '翻译' : '作文'}反馈</b><p>${escapeHtml(result.content)}</p></div>`; $('#cet6AiStatus').textContent = '批改完成 · 非官方反馈'; } catch (error) { $('#cet6AiStatus').textContent = `批改失败：${error.detail || error.message}`; } }

  async function openMicrophoneDialog() { $('#ieltsCountdownSetting').checked = ielts.settings.countdown; try { const result = await callNative('listAudioInputDevices'); $('#ieltsMicrophoneSelect').innerHTML = '<option value="">跟随 macOS 默认输入</option>' + (result.devices || []).map(device => `<option value="${escapeHtml(device.id)}" ${device.id === ielts.settings.microphoneId ? 'selected' : ''}>${escapeHtml(device.name)}</option>`).join(''); } catch (_) { $('#ieltsMicrophoneStatus').textContent = '仅桌面版支持麦克风设备检测'; } $('#ieltsMicrophoneDialog').showModal(); }
  async function testMicrophone() { $('#ieltsMicrophoneStatus').textContent = '正在录制10秒测试…'; try { const result = await callNative('startIeltsRecording', { microphoneId: $('#ieltsMicrophoneSelect').value, temporary: true }); setTimeout(async () => { try { const stopped = await callNative('stopIeltsRecording'); await callNative('loadTrainingAudio', { path: stopped.path || result.path }); await callNative('controlTrainingAudio', { command: 'play' }); $('#ieltsMicrophoneStatus').textContent = '测试完成并正在回听；临时文件关闭后清理'; setTimeout(() => callNative('deleteIeltsRecordingAsset', { path: stopped.path || result.path }).catch(() => null), 12000); } catch (_) { $('#ieltsMicrophoneStatus').textContent = '无法结束测试录音'; } }, 10000); } catch (error) { $('#ieltsMicrophoneStatus').textContent = error.message === 'microphone_permission_denied' ? '麦克风权限未开启' : '无法开始测试'; } }

  function renderAll() { renderOverview(); renderTopics(); renderMaterials(); renderWrittenCurrent(); renderSpeakingSessions(); renderWeaknesses(); renderIeltsAiMessages(); renderExamRecords('ielts'); }
  function bind() {
    const policyDialog = $('#privacyPolicyDialog');
    if (policyDialog) { policyDialog.querySelector('.section-kicker').textContent = '版本 2026-08-04'; policyDialog.querySelector('.policy-content').insertAdjacentHTML('beforeend', '<h3>IELTS 与考试 AI 补充</h3><p>口语录音保存在用户配置的本地目录，原始录音不会发送给 DeepSeek。Word、PDF和图片只在本地提取或OCR，用户确认后仅发送文字。IELTS AI仅处理口语与写作，CET-6 AI仅处理翻译与作文；没有核验评分规则时禁止数字估分。</p>'); }
    $('#startIeltsFullButton').querySelector('small').textContent = '机考/纸笔计时配置；官方规则版本未配置前使用可编辑建议时长';
    const modeGroup = $('[aria-label="口语练习模式"]');
    modeGroup.insertAdjacentHTML('afterend', `<label class="speaking-flow-select">完整模拟推进<select id="ieltsSimulationFlow"><option value="manual">手动推进（默认）</option><option value="automatic">自动模拟</option></select></label>`);
    $('#ieltsSimulationFlow').value = ielts.settings.simulationFlow || 'manual'; $('#ieltsSimulationFlow').addEventListener('change', event => { ielts.settings.simulationFlow = event.target.value; saveState(); });
    $$('[data-ielts-tab]').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.ieltsTab)));
    $$('[data-open-ielts-tab]').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.openIeltsTab)));
    $$('[data-speaking-mode]').forEach(button => button.addEventListener('click', () => { ielts.settings.speakingMode = button.dataset.speakingMode; saveState(); $$('[data-speaking-mode]').forEach(item => item.classList.toggle('active', item === button)); if (button.dataset.speakingMode === 'simulation') { const partOrder = { 'Part 1': 1, 'Part 2': 2, 'Part 3': 3, '自定义': 4 }; const queue = ielts.topics.filter(topic => !topic.archived).sort((a, b) => partOrder[a.part] - partOrder[b.part]).flatMap(topic => topic.questions); if (!queue.length) showToast('请先创建口语题目'); else { simulationDraft = { topicId: selectedTopicId, questionIds: queue.map(item => item.id), index: 0, recordingIds: [] }; openSpeakingRecorder(queue[0].id); if (ielts.settings.simulationFlow === 'automatic') beginRecording(); } } }));
    const part2Options = () => '<option value="">不关联 Part 2</option>' + ielts.topics.filter(topic => topic.part === 'Part 2').map(topic => `<option value="${topic.id}">${escapeHtml(topic.name)}</option>`).join('');
    $('#ieltsTopicPart').closest('label').insertAdjacentHTML('afterend', `<label id="ieltsTopicParentField">关联 Part 2（仅 Part 3）<select id="ieltsTopicParent">${part2Options()}</select></label>`); $('#ieltsTopicPart').addEventListener('change', event => { $('#ieltsTopicParentField').hidden = event.target.value !== 'Part 3'; }); $('#ieltsTopicParentField').hidden = true;
    $('#addIeltsTopicButton').addEventListener('click', () => { $('#ieltsTopicForm').reset(); $('#ieltsTopicDialog').showModal(); });
    $('#ieltsTopicForm').addEventListener('submit', saveTopic); $('#addIeltsQuestionButton').addEventListener('click', () => { $('#ieltsQuestionForm').reset(); $('#ieltsQuestionDialog').showModal(); }); $('#ieltsQuestionForm').addEventListener('submit', saveQuestions); $('#clearIeltsTopicRecordingsButton').addEventListener('click', clearTopicRecordings);
    $('#startIeltsRecordingButton').addEventListener('click', beginRecording); $('#pauseIeltsRecordingButton').addEventListener('click', pauseRecording); $('#stopIeltsRecordingButton').addEventListener('click', stopRecording); $('#saveIeltsRecordingButton').addEventListener('click', () => saveRecording(false)); $('#favoriteIeltsRecordingButton').addEventListener('click', () => saveRecording(true)); $('#closeIeltsSpeakingButton').addEventListener('click', () => { if (recordingDraft && !$('#ieltsRecordingResult').hidden && window.confirm('关闭前保存本次录音？')) saveRecording(false); else if (!recordingDraft || window.confirm('当前录音尚未保存，确定关闭？')) { simulationDraft = null; $('#ieltsSpeakingDialog').close('cancel'); } }); $$('[data-ielts-recording-audio]').forEach(button => button.addEventListener('click', () => handleRecordingAudio(button.dataset.ieltsRecordingAudio))); $('#ieltsRecordingRate').addEventListener('change', event => setRecordingPlaybackRate(event.target.value));
    $('#testIeltsMicrophoneButton').addEventListener('click', openMicrophoneDialog); $('#startIeltsMicTestButton').addEventListener('click', testMicrophone); $('#ieltsMicrophoneSelect').addEventListener('change', event => { ielts.settings.microphoneId = event.target.value; saveState(); }); $('#ieltsCountdownSetting').addEventListener('change', event => { ielts.settings.countdown = event.target.checked; saveState(); });
    $('#startIeltsFullButton').addEventListener('click', () => openWrittenSetup('full')); $('#startIeltsModulesButton').addEventListener('click', () => openWrittenSetup('modules')); $('#startIeltsDirectTimerButton').addEventListener('click', () => openWrittenSetup('direct')); $('#ieltsWrittenSetupForm').addEventListener('submit', createWrittenSession); $('#resumeIeltsSessionButton').addEventListener('click', openWrittenTraining); $('#ieltsWrittenStartPauseButton').addEventListener('click', toggleWrittenTimer); $('#ieltsWrittenNextButton').addEventListener('click', nextWrittenModule); $('#ieltsWrittenEndButton').addEventListener('click', finishWrittenSession); $('#ieltsWrittenRecordForm').addEventListener('submit', event => saveWrittenRecord(event, false)); $('#saveIeltsWrittenDraftButton').addEventListener('click', event => saveWrittenRecord(event, true));
    $('#chooseIeltsFilesButton').addEventListener('click', () => chooseMaterials('chooseIeltsMaterialFiles')); $('#chooseIeltsFolderButton').addEventListener('click', () => chooseMaterials('chooseIeltsMaterialFolder')); $('#ieltsImportForm').addEventListener('submit', confirmImport);
    $$('[data-ielts-ai-mode]').forEach(button => button.addEventListener('click', () => setIeltsAiMode(button.dataset.ieltsAiMode))); $('#ieltsAiForm').addEventListener('submit', event => submitIeltsAi(event, false)); $('#ieltsAiFollowupForm').addEventListener('submit', event => submitIeltsAi(event, true));
  }

  injectSettings(); bind(); renderAll(); purgeExpiredTrash(); window.setInterval(purgeExpiredTrash, 24 * 60 * 60 * 1000);
}());
