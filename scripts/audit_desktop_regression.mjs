import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ritik\\.gemini\\antigravity-ide\\brain\\54978495-dd9d-4a80-8bbd-33d3c8b9213f';
const DESKTOP_DIR = path.join(ARTIFACT_DIR, 'screenshots', 'desktop_regression');

if (!fs.existsSync(DESKTOP_DIR)) {
  fs.mkdirSync(DESKTOP_DIR, { recursive: true });
}

async function run() {
  console.log('Launching Chrome for Desktop Regression Test...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  });

  const page = await context.newPage();
  
  // 1. Audit Home Page
  console.log('Navigating to http://localhost:3000/ on Desktop...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check horizontal overflow
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
  }));
  console.log('Desktop home page overflow check:', overflow);

  // Capture Hero
  await page.screenshot({ path: path.join(DESKTOP_DIR, 'desktop_01_hero.png'), fullPage: false });

  // Scroll through chapters and screenshot each
  const chapterIds = ['meet', 'see', 'talk', 'express', 'drive', 'power', 'specs', 'preorder'];
  for (const id of chapterIds) {
    const el = await page.$(`#${id}`);
    if (el) {
      await page.evaluate((chapterId) => {
        const target = document.getElementById(chapterId);
        if (target) {
          target.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      }, id);
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(DESKTOP_DIR, `desktop_02_${id}.png`), fullPage: false });
    }
  }

  // 2. Audit Preorder Page
  console.log('Navigating to http://localhost:3000/preorder on Desktop...');
  await page.goto('http://localhost:3000/preorder', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(DESKTOP_DIR, 'desktop_03_preorder.png'), fullPage: false });

  await browser.close();
  console.log('Desktop audit complete! Screenshots saved in:', DESKTOP_DIR);
}

run().catch(console.error);
