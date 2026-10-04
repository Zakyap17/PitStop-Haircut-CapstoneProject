import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const [, , url, outputPath, waitSelector] = process.argv;

if (!url || !outputPath) {
  console.error('Usage: node scripts/screenshot.mjs <url> <outputPath.png> [waitForSelector]');
  process.exit(1);
}

await mkdir(path.dirname(outputPath), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(url, { waitUntil: 'networkidle' });

if (waitSelector) {
  await page.waitForSelector(waitSelector, { timeout: 10_000 }).catch(() => {});
}

await page.screenshot({ path: outputPath, fullPage: true });
await browser.close();

console.log(`Saved: ${outputPath}`);
