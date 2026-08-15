import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const whitelist = require('../workbench-prototype/journal-whitelist.js');
const app = fs.readFileSync(new URL('../workbench-prototype/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../workbench-prototype/index.html', import.meta.url), 'utf8');

assert.equal(whitelist.entries.length, 72);
assert.deepEqual(whitelist.counts, { original: 522, retained: 72, excluded: 450 });

const journal = whitelist.entries[0];
assert.equal(whitelist.qualify({ display_name: 'Unrelated alias', issn: ['0000-0000', journal.issn] }).ok, true);
assert.equal(whitelist.qualify({ display_name: `The ${journal.title.toUpperCase()}` }).ok, true);
assert.equal(whitelist.qualify({ display_name: 'IEEE Transactions on Anything', issn: [journal.issn] }).reason, 'IEEE系统硬排除');
assert.equal(whitelist.qualify({ display_name: 'MDPI Example', issn: [journal.issn] }).reason, 'MDPI系统硬排除');
assert.equal(whitelist.qualify({ display_name: journal.title }, [journal.title]).reason, '用户黑名单');
assert.equal(whitelist.qualify({ display_name: 'Unknown Q2 Journal', issn: ['1234-5678'] }).ok, false);

const filterPosition = app.indexOf('qualification: qualifyPaperSource');
const aiPosition = app.indexOf("enrichRecommendationsWithAi('papers'");
assert.ok(filterPosition > -1 && aiPosition > filterPosition, 'strict qualification must occur before AI enrichment');
assert.match(app, /state\.paperHistory = \(state\.paperHistory \|\| \[\]\)\.map\(requalifySavedPaper\)\.filter\(Boolean\)/);
assert.match(app, /严格白名单匹配/);
assert.match(html, /journal-whitelist\.js/);
assert.match(html, /IEEE、MDPI 与自定义黑名单已过滤/);
assert.doesNotMatch(html, /JCR Q1 已核验/);

console.log('PASS: 72-journal whitelist, ISSN/title matching, immutable exclusions, pre-AI filtering, history requalification and UI status');
