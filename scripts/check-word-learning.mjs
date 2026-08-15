import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../workbench-prototype/word-learning-core.js');

assert.deepEqual(core.parseEntry('amazing/惊喜的；令人惊讶的'), { display: 'amazing', normalized: 'amazing', definitions: ['惊喜的', '令人惊讶的'] });
assert.deepEqual(core.parseEntry('amazing / 惊喜的;令人惊讶的'), { display: 'amazing', normalized: 'amazing', definitions: ['惊喜的', '令人惊讶的'] });
assert.deepEqual(core.parseEntry('amazing'), { display: 'amazing', normalized: 'amazing', definitions: [] });
assert.equal(core.evaluate(['惊喜的', '令人惊讶的'], '').result, 'unknown');
assert.equal(core.evaluate(['惊喜的', '令人惊讶的'], '完全不同').result, 'wrong');
assert.equal(core.evaluate(['惊喜的', '令人惊讶的'], '惊喜的').result, 'partial');
assert.equal(core.evaluate(['惊喜的', '令人惊讶的'], '惊喜的；令人惊讶的').result, 'correct');
assert.deepEqual(core.evaluate(['惊喜的', '令人惊讶的'], '惊喜的；错误释义').extra, ['错误释义']);
assert.equal(core.evaluate(['令人惊讶的'], '令人惊讶').result, 'correct');

console.log('PASS: word parsing, multi-meaning grading, blank answers, partial matches, and wrong-content detection.');
