import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../workbench-prototype/library-core.js');

const folders = core.normalizeFolders([{ id: 'custom-a', name: '阅读', parentId: 'system-ielts' }, { id: 'custom-b', name: '精听', parentId: 'custom-a' }]);
assert.equal(folders.filter(folder => folder.system).length, 6);
assert.equal(core.folderForSource('cet6'), 'system-cet6');
assert.equal(core.folderForSource('unknown'), 'system-other');
assert.equal(core.fileType('test.mp3'), '听力音频');
assert.equal(core.fileType('paper.pdf'), 'PDF');
assert.deepEqual(core.descendants(folders, 'system-ielts'), ['custom-a', 'custom-b']);
assert.equal(core.folderContents([{ id: 1, folderId: 'custom-b' }], folders, 'system-ielts').length, 1);
assert.equal(core.canNest(folders, 'custom-a', 'custom-b'), false);
assert.equal(core.duplicateByFingerprint([{ id: 1, fingerprint: 'abc' }], 'abc').id, 1);

console.log('PASS: library folders, source classification, file types, descendants and fingerprint duplicate rules');
