import crypto from 'node:crypto';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const appPath = new URL('workbench-prototype/app.js', root);
const indexPath = new URL('workbench-prototype/index.html', root);
const purifierPath = new URL('workbench-prototype/vendor/dompurify/purify.min.js', root);
const app = fs.readFileSync(appPath, 'utf8');
const index = fs.readFileSync(indexPath, 'utf8');
const purifier = fs.readFileSync(purifierPath);

const expectedSha256 = '9ab3d44d73c3e3947f9ab72e0f0bc15c7f1931d60b365ba261fc85fe59013c56';
const actualSha256 = crypto.createHash('sha256').update(purifier).digest('hex');
if (actualSha256 !== expectedSha256) throw new Error(`DOMPurify SHA-256 mismatch: ${actualSha256}`);

const purifierIndex = index.indexOf('vendor/dompurify/purify.min.js?v=3.4.13');
const appIndex = index.indexOf('app.js');
if (purifierIndex < 0 || appIndex < 0 || purifierIndex > appIndex) throw new Error('DOMPurify must load before app.js');

for (const required of ['RETURN_DOM_FRAGMENT: true', 'target.replaceChildren(fragment)', "FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base']", "FORBID_ATTR: ['srcdoc']"]) {
  if (!app.includes(required)) throw new Error(`sanitizer guard missing: ${required}`);
}

const forbidden = [
  [/\.innerHTML\s*=/, 'direct innerHTML assignment'],
  [/document\.write\s*\(/, 'document.write'],
  [/\beval\s*\(/, 'eval'],
  [/new\s+Function\s*\(/, 'new Function']
];
for (const [pattern, label] of forbidden) if (pattern.test(app)) throw new Error(`forbidden DOM/code sink found: ${label}`);

const adversarialCases = [
  '<img src=x onerror=alert(1)>',
  '\"><svg onload=alert(1)>',
  '<a href="javascript:alert(1)">x</a>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>'
];
if (new Set(adversarialCases).size !== 4) throw new Error('adversarial security corpus is incomplete');

console.log('PASS: DOM rendering uses the pinned sanitizer and contains no direct dangerous sinks.');
