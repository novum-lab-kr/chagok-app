import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const {chromium} = await import(process.argv[2] ?? '/opt/homebrew/lib/node_modules/playwright/index.mjs');
const out = path.resolve('docs/design/retro-pocket-v1/basic-dialog-review');
await mkdir(out, {recursive: true});
const browser = await chromium.launch({headless: true});
try {
  for (const width of [390, 320]) {
    const page = await browser.newPage({viewport: {width, height: 844}, deviceScaleFactor: 1});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:6006/iframe.html?id=components-dialog--basic&viewMode=story', {waitUntil: 'networkidle'});
    await page.evaluate(() => document.fonts.ready);
    const title = page.getByText('목표를 삭제할까요?');
    await title.waitFor();
    const frame = await title.locator('xpath=../..').boundingBox();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const file = path.join(out, `basic-dialog-${width}.png`);
    await page.screenshot({path: file});
    if (!frame || Math.abs(frame.y + frame.height / 2 - 422) > 2 || overflow || errors.length) {
      throw new Error(JSON.stringify({width, frame, overflow, errors}));
    }
    process.stdout.write(`${width}px: centered, no overflow or render errors — ${file}\n`);
    await page.close();
  }
} finally {
  await browser.close();
}
