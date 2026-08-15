import fs from 'node:fs';

const html = fs.readFileSync('workbench-prototype/index.html', 'utf8');
const app = fs.readFileSync('workbench-prototype/app.js', 'utf8');
const native = fs.readFileSync('native-shell/main.m', 'utf8');
const ielts = fs.readFileSync('workbench-prototype/ielts-module.js', 'utf8');
const research = fs.readFileSync('workbench-prototype/research-module.js', 'utf8');

const checks = [
  ['文件夹树', html.includes('id="libraryFolderTree"') && app.includes('renderLibraryFolders')],
  ['多级文件夹', app.includes('WorkbenchLibraryCore.descendants') && app.includes('libraryFolderParent')],
  ['上传文件', html.includes('id="uploadLibraryFilesButton"') && native.includes('chooseLibraryFiles')],
  ['音频上传白名单', native.includes('@"mp3", @"m4a", @"wav", @"aac"')],
  ['扫描文件夹', html.includes('id="uploadLibraryFolderButton"') && native.includes('chooseLibraryFolder')],
  ['复制或引用', html.includes('id="libraryImportMode"') && native.includes('importLibraryAsset')],
  ['指纹查重', app.includes('duplicateByFingerprint') && native.includes('sha256FileAtPath')],
  ['本地预览', native.includes('openLibraryFile') && native.includes('QLPreviewPanel')],
  ['Office默认应用', native.includes('@"docx"') && native.includes('NSWorkspace.sharedWorkspace openURL')],
  ['CET-6统一索引', app.includes("addFiles(material[type], 'cet6'")],
  ['IELTS统一索引', app.includes("addFiles(material[type], 'ielts'") && ielts.includes('api.renderLibrary()')],
  ['论文项目统一索引', app.includes("], 'research',") && research.includes('api.renderLibrary()')],
  ['每周论文分组', app.includes("folderId: 'system-papers'")],
  ['存储位置迁移', native.includes('migrateLibraryFilesFrom') && app.includes('pathMap')],
  ['回收站永久删除保护', app.includes("deleteManagedResearchFile")],
  ['关闭模块仍保留索引', app.includes('function moduleLibraryItems()')]
];

const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) { console.error(`FAIL: ${failed.join('；')}`); process.exit(1); }
console.log(`PASS: ${checks.length} library upload, folder, module-index, preview, migration and deletion checks`);
