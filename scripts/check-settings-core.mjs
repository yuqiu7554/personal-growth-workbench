import assert from 'node:assert/strict'; import { createRequire } from 'node:module'; const require = createRequire(import.meta.url); const core = require('../workbench-prototype/settings-core.js');
const model = core.normalize({ aiProfile: 'deepseek-official', aiProvider: 'DeepSeek官方API', aiBaseUrl: 'https://api.deepseek.com', aiModel: 'deepseek-chat', aiBudget: 100 });
assert.equal(Object.keys(model.assistants).length, 10); assert.equal(model.profiles['deepseek-official'].baseUrl, 'https://api.deepseek.com'); assert.equal(core.resolve(model, 'ielts').account, 'deepseek-official');
model.assistants.review.budget = 5; model.assistants.review.spent = 5; assert.equal(core.budgetStatus(model, 'review').reason, 'assistant_budget_reached');
assert.throws(() => core.addProfile(model, { id: 'bad id' }), /invalid_profile_id/); console.log('settings-core: ok');
