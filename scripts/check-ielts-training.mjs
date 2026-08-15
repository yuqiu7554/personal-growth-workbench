import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../workbench-prototype/cet6-training-core.js');
const html = fs.readFileSync(new URL('../workbench-prototype/index.html', import.meta.url), 'utf8');
const moduleCode = fs.readFileSync(new URL('../workbench-prototype/ielts-module.js', import.meta.url), 'utf8');
const nativeCode = fs.readFileSync(new URL('../native-shell/main.m', import.meta.url), 'utf8');

for (const label of ['总览', '笔试训练', '口语训练', '真题资料库', '训练记录', '错题与薄弱项', 'IELTS AI']) assert.match(html, new RegExp(`data-ielts-tab="[^"]+"[^>]*>${label}<`));
for (const id of ['startIeltsFullButton', 'startIeltsModulesButton', 'startIeltsDirectTimerButton', 'addIeltsTopicButton', 'testIeltsMicrophoneButton', 'ieltsAiForm']) assert.match(html, new RegExp(`id="${id}"`));
for (const phrase of ['不关联资料 / 纸质版 / 其他平台', 'Academic', 'General Training', 'Part 1', 'Part 2', 'Part 3', '自定义']) assert.ok(html.includes(phrase), `missing IELTS choice: ${phrase}`);

const written = core.createSession({ kind: 'full', timerMode: 'modules', modules: ['听力', '阅读', 'Writing Task 1', 'Writing Task 2'], moduleSeconds: { 听力: 2400, 阅读: 3600, 'Writing Task 1': 1200, 'Writing Task 2': 2400 }, materialId: '', examType: 'Academic' }, 1000);
assert.equal(core.currentModule(written), '听力');
assert.equal(core.currentLimit(written), 2400);
assert.equal(core.currentModule(core.nextModule(written)), '阅读');
assert.equal(written.materialId, '');

for (const action of ['chooseIeltsMaterialFiles', 'chooseIeltsMaterialFolder', 'importIeltsAsset', 'startIeltsRecording', 'pauseIeltsRecording', 'resumeIeltsRecording', 'stopIeltsRecording', 'transcribeIeltsRecording', 'chooseAndExtractEnglishText']) assert.ok(nativeCode.includes(`@"${action}"`), `missing native action ${action}`);
assert.ok(moduleCode.includes("feature: 'IELTS'"));
assert.ok(moduleCode.includes("feature: 'CET-6'"));
assert.ok(moduleCode.includes("cet6AiMode = 'translation'"));
assert.match(moduleCode, /IELTS AI[^\n]+仅处理口语转写和 IELTS 写作/);
assert.match(moduleCode, /原始录音和附件不会发送/);
assert.match(moduleCode, /完整口语模拟已保存/);
assert.match(moduleCode, /recordingTrash/);

console.log('PASS: IELTS written/speaking separation, direct timing, local recording, recycle bins, and scoped AI bindings.');
