import fs from 'node:fs';

const html = fs.readFileSync('workbench-prototype/index.html', 'utf8');
const js = fs.readFileSync('workbench-prototype/app.js', 'utf8');
const expected = ['tasks', 'calendar', 'goals', 'reports', 'english', 'ielts', 'cet6', 'research', 'news', 'papers', 'library', 'health', 'review', 'ai'];

const failures = [];
for (const id of expected) {
  if (!new RegExp(`\\['${id}',`).test(js)) failures.push(`缺少一级模块定义: ${id}`);
  if (!new RegExp(`data-view="${id}"`).test(html)) failures.push(`缺少侧栏入口: ${id}`);
}

const requirements = [
  ['首次选择对话框', html.includes('id="moduleSetupDialog"')],
  ['设置模块列表', html.includes('id="moduleSettingsList"')],
  ['不可取消首次对话框', js.includes("moduleSetupDialog').addEventListener('cancel',")],
  ['关闭确认', js.includes('本地数据不会删除。是否继续？')],
  ['禁用页面保护', js.includes('if (!isModuleEnabled(view))')],
  ['热点停用后不补更', js.includes("isModuleEnabled('news') &&")],
  ['论文停用后不补更', js.includes("isModuleEnabled('papers') &&")],
  ['SQLite状态持久化字段', js.includes('modulePreferencesConfigured')],
  ['总览始终保留', js.includes("['overview', 'settings'].includes(view)")]
];
for (const [name, passed] of requirements) if (!passed) failures.push(name);

if (failures.length) {
  console.error(`FAIL: ${failures.join('；')}`);
  process.exit(1);
}

console.log(`PASS: ${expected.length} 个一级模块具备首启选择、设置开关、导航保护和持久化规则`);
