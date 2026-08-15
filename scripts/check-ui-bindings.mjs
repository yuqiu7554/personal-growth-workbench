import fs from 'node:fs';

const html = fs.readFileSync(new URL('../workbench-prototype/index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../workbench-prototype/app.js', import.meta.url), 'utf8');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
for (const match of js.matchAll(/\bid=\\?"([A-Za-z][\w-]*)\\?"/g)) ids.add(match[1]);
const boundIds = new Set([...js.matchAll(/\bel\(['"]#([A-Za-z][\w-]*)['"]\)/g)].map(match => match[1]));
const missing = [...boundIds].filter(id => !ids.has(id)).sort();

if (missing.length) {
  console.error(`FAIL: JavaScript binds missing HTML IDs: ${missing.join(', ')}`);
  process.exit(1);
}

for (const required of ['aiView', 'aiChatForm', 'aiChatInput', 'aiChatFiles', 'sendAiChat', 'aiChatSendStatus']) {
  if (!ids.has(required)) {
    console.error(`FAIL: AI assistant control is missing: ${required}`);
    process.exit(1);
  }
}

for (const required of ['youdaoLookupForm', 'youdaoLookupInput', 'youdaoLookupButton', 'saveYoudaoButton', 'testYoudaoButton']) {
  if (!ids.has(required)) {
    console.error(`FAIL: Youdao control is missing: ${required}`);
    process.exit(1);
  }
}

for (const required of ['databaseStorageStatus', 'databasePathLabel', 'changeDatabaseLocationButton', 'openDatabaseFolderButton']) {
  if (!ids.has(required)) {
    console.error(`FAIL: SQLite setting control is missing: ${required}`);
    process.exit(1);
  }
}

if (!js.includes("el('#aiChatForm').addEventListener('submit', sendAiChatMessage)")) {
  console.error('FAIL: AI assistant form is not bound to the send handler');
  process.exit(1);
}

if (!js.includes("callNative('sendAiChat'")) {
  console.error('FAIL: AI assistant handler does not call the native API bridge');
  process.exit(1);
}

if (!js.includes("callNative('lookupYoudao'") || !js.includes("callNative('testYoudaoConnection'")) {
  console.error('FAIL: Youdao lookup/test does not call the native API bridge');
  process.exit(1);
}

if (!js.includes("callNative('loadWorkbenchState'") || !js.includes("callNative('saveWorkbenchState'") || !js.includes("callNative('chooseDatabaseDirectory'")) {
  console.error('FAIL: SQLite load/save/migration does not call the native bridge');
  process.exit(1);
}

console.log(`PASS: ${boundIds.size} UI bindings resolved; AI submit reaches native sendAiChat.`);
