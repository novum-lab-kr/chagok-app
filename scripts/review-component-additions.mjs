import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const {chromium} = await import(process.argv[2] ?? '/opt/homebrew/lib/node_modules/playwright/index.mjs');
const base = 'http://127.0.0.1:6006';
const out = path.resolve('docs/design/retro-pocket-v1/component-additions-review');
const index = await fetch(`${base}/index.json`).then(response => response.json());
const stories = Object.values(index.entries).filter(entry => entry.type === 'story' && (
  entry.title === 'Components/Setting row' || entry.title === 'Components/Feedback' ||
  entry.id.startsWith('components-screen-building-blocks--photo') ||
  entry.id === 'components-stickers--recorded-slots'
));
if (stories.length !== 13) throw new Error(`Expected 13 component stories, found ${stories.length}`);
await mkdir(out, {recursive: true});
const browser = await chromium.launch({headless: true});
const results = [];
try {
  for (const width of [390, 320]) {
    const page = await browser.newPage({viewport: {width, height: 844}, deviceScaleFactor: 1});
    for (const entry of stories) {
      const errors = [];
      const onError = error => errors.push(error.message);
      page.on('pageerror', onError);
      await page.goto(`${base}/iframe.html?id=${encodeURIComponent(entry.id)}&viewMode=story`, {waitUntil: 'networkidle'});
      await page.evaluate(() => document.fonts.ready);
      const state = await page.evaluate(() => ({
        text: document.querySelector('#storybook-root')?.textContent?.trim() ?? '',
        visualLoading: Boolean(document.querySelector('#storybook-root [role="progressbar"]')),
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      }));
      const file = `${entry.name.replace(/[^a-zA-Z0-9가-힣]+/g, '-').replace(/^-|-$/g, '')}-${width}.png`;
      await page.screenshot({path: path.join(out, file)});
      results.push({id: entry.id, name: entry.name, width, file, ...state, errors});
      page.off('pageerror', onError);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(path.join(out, 'verification.json'), JSON.stringify(results, null, 2));
const failed = results.filter(result => result.errors.length || result.overflow || (!result.text && !result.visualLoading));
process.stdout.write(JSON.stringify({stories: stories.length, screenshots: results.length, failed}, null, 2));
if (failed.length) process.exitCode = 1;
