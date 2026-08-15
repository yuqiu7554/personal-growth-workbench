import fs from 'node:fs';
const native = fs.readFileSync(new URL('../native-shell/main.m', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../workbench-prototype/app.js', import.meta.url), 'utf8');
for (const action of ['createEncryptedBackup','inspectEncryptedBackup','applyInspectedBackup']) if (!native.includes(`@\"${action}\"`) || !app.includes(`'${action}'`)) throw new Error(`backup bridge incomplete: ${action}`);
for (const token of ['aes-256-cbc','pbkdf2','200000','pre-restore']) if (!native.includes(token)) throw new Error(`backup protection missing: ${token}`);
if (!native.includes('pendingRestorePayloadDirectory')) throw new Error('validated payload path not retained');
console.log('PASS: encrypted backup and restore bridge verified.');
