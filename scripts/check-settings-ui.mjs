import fs from 'node:fs';
const app = fs.readFileSync(new URL('../workbench-prototype/app.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../workbench-prototype/styles.css', import.meta.url), 'utf8');
const assistants = ['成长规划 AI 助手','英语学习 AI 助手','IELTS 训练 AI 助手','CET-6 训练 AI 助手','论文项目 AI 助手','今日热点 AI 助手','每周论文 AI 助手','运动健康 AI 助手','今日复盘 AI 助手','周月总结 AI 助手'];
const core = fs.readFileSync(new URL('../workbench-prototype/settings-core.js', import.meta.url), 'utf8');
for (const label of assistants) if (!core.includes(label)) throw new Error(`missing assistant: ${label}`);
for (const marker of ['aiAssistantSettings','saveAiAssistantsButton','data-assistant-profile','data-assistant-budget','data-test-assistant','aiInputPriceSetting','aiOutputPriceSetting','recordAiUsage','helpSearchInput','githubRepoSetting']) if (!app.includes(marker)) throw new Error(`missing settings marker: ${marker}`);
if (!/grid-template-columns\s*:\s*minmax\(0,\s*3fr\)\s+minmax\(250px,\s*1fr\)/.test(styles)) throw new Error('review form ratio missing');
console.log('PASS: settings center, ten assistants, help/about, and review layout verified.');
