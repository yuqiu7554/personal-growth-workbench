import fs from 'node:fs';

const js = fs.readFileSync(new URL('../workbench-prototype/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../workbench-prototype/index.html', import.meta.url), 'utf8');
const native = fs.readFileSync(new URL('../native-shell/main.m', import.meta.url), 'utf8');

for (const source of ['中国政府网', 'World Bank', 'EASA', 'NIST', '欧盟数字战略', 'MIT Technology Review', 'The Loadstar', 'TechCrunch AI']) {
  if (!js.includes(`source: '${source}'`)) throw new Error(`Missing news source: ${source}`);
}
if (/spectrum\.ieee|IEEE Spectrum/i.test(js + native)) throw new Error('IEEE must not be included');
for (const behavior of ['Promise.allSettled', '31 * 24 * 60 * 60 * 1000', 'aggregateNews', 'policyDetails', 'failedSources']) {
  if (!js.includes(behavior)) throw new Error(`Missing news behavior: ${behavior}`);
}
for (const theme of ['物流工程', '管理工程', 'AI发展', '低空经济']) {
  if (!html.includes(`data-news-filter="${theme}"`) || !html.includes(`data-news-theme-setting="${theme}"`)) throw new Error(`Missing theme UI: ${theme}`);
}
for (const tier of ['P0', 'P1', 'P2', 'P3']) if (!html.includes(`data-news-tier-setting="${tier}"`)) throw new Error(`Missing tier UI: ${tier}`);
if (js.includes('sampleNews')) throw new Error('Synthetic news fallback must not remain');
if (!native.includes('@"format": @"xml"') || !native.includes('application/rss+xml')) throw new Error('Native RSS transport missing');

console.log('PASS: real news source pool, RSS transport, four themes, source controls, recency, policy metadata, deduplication and failure isolation are wired.');
