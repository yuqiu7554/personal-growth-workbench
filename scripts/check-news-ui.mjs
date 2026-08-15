const playwrightModule = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = await import(playwrightModule);
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(pathToFileURL(path.resolve('workbench-prototype/index.html')).href);
await page.click('[data-view="news"]');
for (const theme of ['物流工程', '管理工程', 'AI发展', '低空经济']) await page.locator(`[data-news-filter="${theme}"]`).waitFor();
await page.screenshot({ path: 'output/playwright/news-page.png', fullPage: true });
await page.click('[data-view="settings"]');
await page.click('[data-settings-tab="recommendations"]');
for (const tier of ['P0', 'P1', 'P2', 'P3']) await page.locator(`[data-news-tier-setting="${tier}"]`).waitFor();
const overflow = await page.evaluate(() => [...document.querySelectorAll('[data-settings-panel="recommendations"] *')].filter(node => node.scrollWidth > node.clientWidth + 2 && getComputedStyle(node).overflowX === 'visible').map(node => node.tagName));
if (overflow.length) throw new Error(`Recommendation settings overflow: ${overflow.join(', ')}`);
await page.screenshot({ path: 'output/playwright/news-settings.png', fullPage: true });
await browser.close();
console.log('PASS: news page filters and recommendation settings render without visible horizontal overflow.');
