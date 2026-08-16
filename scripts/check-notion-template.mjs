import fs from 'node:fs';
import path from 'node:path';

const root = new URL('..', import.meta.url);
const notionRoot = new URL('notion-template/', root);
const blankRoot = new URL('个人成长工作台-Notion模板-空白版/', notionRoot);
const sampleRoot = new URL('个人成长工作台-Notion模板-示例版/', notionRoot);
const databaseNames = [
  '01-目标与里程碑.csv', '02-任务与日程.csv', '03-论文项目.csv', '04-资料库.csv',
  '05-每周论文.csv', '06-学习记录.csv', '07-健康记录.csv', '08-今日复盘.csv'
];

for (const base of [blankRoot, sampleRoot]) {
  for (const required of ['个人成长工作台.md', '导入与配置说明.md', 'LICENSE']) {
    if (!fs.existsSync(new URL(required, base))) throw new Error(`Notion package missing ${required}`);
  }
}

let sampleRows = 0;
for (const name of databaseNames) {
  const blankLines = fs.readFileSync(new URL(`数据库/${name}`, blankRoot), 'utf8').split(/\r?\n/).filter(Boolean);
  const sampleLines = fs.readFileSync(new URL(`数据库/${name}`, sampleRoot), 'utf8').split(/\r?\n/).filter(Boolean);
  if (blankLines.length !== 1) throw new Error(`blank Notion database contains records: ${name}`);
  if (blankLines[0] !== sampleLines[0]) throw new Error(`Notion schema mismatch: ${name}`);
  sampleRows += Math.max(0, sampleLines.length - 1);
}
if (!sampleRows) throw new Error('sample Notion package contains no synthetic records');

for (const archive of ['个人成长工作台-Notion模板-空白版-0.1.0.zip', '个人成长工作台-Notion模板-示例版-0.1.0.zip']) {
  const stat = fs.statSync(new URL(archive, notionRoot));
  if (!stat.isFile() || stat.size < 1000) throw new Error(`Notion archive is missing or incomplete: ${archive}`);
}

function textFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? textFiles(target) : /\.(?:md|csv)$/.test(entry.name) ? [target] : [];
  });
}

const prohibited = [/\/Users\//, /sk-[A-Za-z0-9_-]{16,}/, /\.sqlite3?\b/i, /\.(?:pdf|mp3|m4a|wav)\b/i];
for (const file of textFiles(notionRoot.pathname)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of prohibited) if (pattern.test(text)) throw new Error(`private or copyrighted artifact reference in ${file}: ${pattern}`);
}

console.log(`PASS: Notion blank/sample schemas, ${sampleRows} synthetic rows, archives and privacy boundaries verified.`);
