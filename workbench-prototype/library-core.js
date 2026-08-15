(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkbenchLibraryCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SYSTEM_FOLDERS = [
    ['ielts', 'IELTS'], ['cet6', 'CET-6'], ['research', '论文项目'],
    ['papers', '每周论文'], ['favorites', '收藏'], ['other', '其他资料']
  ].map(([id, name], index) => ({ id: `system-${id}`, name, parentId: null, system: true, order: index }));

  function normalizeFolders(folders) {
    const custom = Array.isArray(folders) ? folders.filter(folder => folder && !String(folder.id).startsWith('system-')) : [];
    return [...SYSTEM_FOLDERS.map(folder => ({ ...folder })), ...custom.map((folder, index) => ({ id: String(folder.id), name: String(folder.name || '未命名文件夹'), parentId: folder.parentId || null, system: false, order: Number.isFinite(folder.order) ? folder.order : SYSTEM_FOLDERS.length + index }))];
  }

  function folderForSource(sourceModule) {
    const map = { ielts: 'system-ielts', cet6: 'system-cet6', research: 'system-research', papers: 'system-papers', favorites: 'system-favorites' };
    return map[sourceModule] || 'system-other';
  }

  function fileType(name, mime = '') {
    const extension = String(name || '').split('.').pop().toLowerCase();
    if (extension === 'pdf') return 'PDF';
    if (['mp3', 'm4a', 'wav', 'aac'].includes(extension) || String(mime).startsWith('audio/')) return '听力音频';
    if (['png', 'jpg', 'jpeg', 'heic', 'webp', 'tiff'].includes(extension) || String(mime).startsWith('image/')) return '图片';
    if (['doc', 'docx'].includes(extension)) return 'Word';
    if (['ppt', 'pptx'].includes(extension)) return 'PPT';
    if (['xls', 'xlsx', 'csv'].includes(extension)) return '表格';
    if (['txt', 'md', 'bib', 'ris'].includes(extension) || String(mime).startsWith('text/')) return '文本';
    if (extension === 'zip') return '压缩包';
    return '其他文件';
  }

  function duplicateByFingerprint(items, fingerprint) {
    if (!fingerprint) return null;
    return (items || []).find(item => item.fingerprint && item.fingerprint === fingerprint) || null;
  }

  function descendants(folders, folderId) {
    const result = [];
    const visit = id => (folders || []).filter(folder => folder.parentId === id).forEach(folder => { result.push(folder.id); visit(folder.id); });
    visit(folderId);
    return result;
  }

  function folderContents(items, folders, folderId) {
    const ids = new Set([folderId, ...descendants(folders, folderId)]);
    return (items || []).filter(item => ids.has(item.folderId));
  }

  function canNest(folders, folderId, parentId) {
    if (!parentId) return true;
    if (folderId === parentId) return false;
    return !descendants(folders, folderId).includes(parentId);
  }

  return Object.freeze({ SYSTEM_FOLDERS, normalizeFolders, folderForSource, fileType, duplicateByFingerprint, descendants, folderContents, canNest });
}));
