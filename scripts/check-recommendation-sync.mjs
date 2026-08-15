import fs from 'node:fs';

const html = fs.readFileSync(new URL('../workbench-prototype/index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../workbench-prototype/app.js', import.meta.url), 'utf8');
const native = fs.readFileSync(new URL('../native-shell/main.m', import.meta.url), 'utf8');

for (const id of ['refreshNewsButton', 'refreshPapersButton', 'newsSyncStatus', 'paperSyncStatus', 'recommendationTopicsSetting', 'recommendationExclusionsSetting']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing recommendation UI: ${id}`);
}
for (const symbol of ['fetchRecommendationSource', 'verifyPaperDois', 'enrichRecommendationsWithAi', 'runRecommendationCatchUp', 'saveRecommendationSettings']) {
  if (!js.includes(symbol)) throw new Error(`Missing recommendation logic: ${symbol}`);
}
for (const host of ['www.gov.cn', 'search.worldbank.org', 'api.openalex.org', 'api.crossref.org']) {
  if (!native.includes(`@"${host}"`)) throw new Error(`Missing native allowlist host: ${host}`);
}
if (native.includes('@"api.gdeltproject.org"')) throw new Error('Rate-limited GDELT must not remain in the runtime allowlist');
if (!html.includes('完全退出后当前版本不会联网')) throw new Error('Privacy disclosure must describe the background limitation');

console.log('PASS: recommendation sources, DOI verification, AI fallback, scheduling, preferences and privacy disclosure are wired.');
