import fs from 'node:fs';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../workbench-prototype/index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../workbench-prototype/app.js', import.meta.url), 'utf8');
for (const id of ['reviewEntryState','reviewResultState','reviewDate','editReviewHeadline','saveReviewDraft','editSubmittedReview','openReviewHistory','reviewVisualSummary','reviewEvidenceGallery','retryReviewAi','writeReviewActions','exportReview']) assert.match(html, new RegExp(`id="${id}"`));
for (const behavior of ['WorkbenchReviewCore.submit','renderReviewResult','generateReviewAi','writeReviewActions','actionWrites','sourceId']) assert.ok(js.includes(behavior), `missing review behavior: ${behavior}`);
assert.ok(html.indexOf('reviewResultState') > html.indexOf('reviewEntryState'));
console.log('review-ui: ok');
