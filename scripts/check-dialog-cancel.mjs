import fs from 'node:fs';

const html = fs.readFileSync(new URL('../workbench-prototype/index.html', import.meta.url), 'utf8');
const dialogs = [...html.matchAll(/<dialog\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/dialog>/g)];
const failures = [];

for (const [, id, body] of dialogs) {
  const cancelButtons = [...body.matchAll(/<button\b([^>]*(?:value="cancel"|aria-label="关闭")[^>]*)>/g)];
  for (const [, attributes] of cancelButtons) {
    if (/\bid="closeIeltsSpeakingButton"/.test(attributes)) continue;
    if (!/\btype="button"/.test(attributes) || !/\bdata-dialog-close\b/.test(attributes)) {
      failures.push(`${id}: cancel/close button lacks explicit non-submit close behavior`);
    }
  }
}

if (!dialogs.length) failures.push('No dialogs found');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`PASS: ${dialogs.length} dialogs use explicit cancel behavior`);
