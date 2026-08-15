import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../workbench-prototype/cet6-training-core.js');

const files = [
  { path: '/试卷/2019.06六级真题第3套【可复制可搜索，打印首选】.pdf', name: '2019.06六级真题第3套【可复制可搜索，打印首选】.pdf' },
  { path: '/答案/2019年06月真题解析第3套.pdf', name: '2019年06月真题解析第3套.pdf' },
  { path: '/音频/2019年6月第3套听力.mp3', name: '2019年6月第3套听力.mp3' }
];
const grouped = core.proposeMaterialGroups(files);
assert.equal(grouped.length, 1);
assert.deepEqual({ year: grouped[0].year, month: grouped[0].month, set: grouped[0].set }, { year: 2019, month: 6, set: 3 });
assert.equal(grouped[0].paper.length, 1);
assert.equal(grouped[0].answer.length, 1);
assert.equal(grouped[0].audio.length, 1);

const positive = core.createSession({ kind: 'paper', timerMode: 'clock', totalSeconds: 8700, modules: ['写作', '听力'], audioMode: 'external' }, 1000);
assert.equal(core.displayTime(positive, 1000), '15:00');
assert.equal(core.displayTime(core.start(positive, 1000), 46000), '15:00');
assert.equal(core.displayTime(core.start(positive, 1000), 61000), '15:01');

const countdown = core.start(core.createSession({ kind: 'paper', timerMode: 'countdown', totalSeconds: 8700, modules: [] }, 0), 1000);
assert.equal(core.remainingSeconds(countdown, 6000), 8695);
const paused = core.pause(countdown, 6000);
assert.equal(core.remainingSeconds(paused, 26000), 8695);
assert.equal(core.remainingSeconds(core.resume(paused, 26000), 31000), 8690);
assert.equal(core.remainingSeconds(core.extendCurrent(paused, 300), 26000), 8995);

const modular = core.createSession({ kind: 'modules', timerMode: 'modules', modules: ['听力', '仔细阅读'], moduleSeconds: { 听力: 1800, 仔细阅读: 2400 } }, 0);
assert.equal(core.currentModule(modular), '听力');
assert.equal(core.currentLimit(modular), 1800);
assert.equal(core.currentModule(core.nextModule(modular)), '仔细阅读');
assert.equal(core.currentLimit(core.extendCurrent(modular, 300)), 2100);
const firstFinished = core.pause(core.start(modular, 0), 600000);
const secondStarted = core.start(core.nextModule(firstFinished), 600000);
assert.equal(core.totalElapsedSeconds(secondStarted, 900000), 900);

console.log('PASS: CET-6 material pairing and public timer session behavior.');
