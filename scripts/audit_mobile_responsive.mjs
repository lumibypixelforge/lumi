import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ritik\\.gemini\\antigravity-ide\\brain\\54978495-dd9d-4a80-8bbd-33d3c8b9213f';
const MOBILE_DIR = path.join(ARTIFACT_DIR, 'screenshots', 'mobile_audit');

if (!fs.existsSync(MOBILE_DIR)) {
  fs.mkdirSync(MOBILE_DIR, { recursive: true });
}

async function run() {
  console.log('Launching Chrome for Mobile Responsiveness Audit...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  
  // 1. Audit Home Page
  console.log('Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Check horizontal overflow
  const overflow = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
      chapters: Array.from(document.querySelectorAll('section')).map(s => ({
        id: s.id,
        height: s.offsetHeight,
        top: s.offsetTop,
      }))
    };
  });
  console.log('Home page overflow check:', overflow);

  // Capture Hero
  await page.screenshot({ path: path.join(MOBILE_DIR, '01_home_hero.png'), fullPage: false });

  // Scroll through chapters and screenshot each
  const chapterIds = ['meet', 'see', 'talk', 'express', 'drive', 'power', 'specs', 'preorder'];
  for (const id of chapterIds) {
    const el = await page.$(`#${id}`);
    if (el) {
      await page.evaluate((chapterId) => {
        const target = document.getElementById(chapterId);
        if (target) {
          window.scrollTo({ top: target.offsetTop, behavior: 'instant' });
        }
      }, id);
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(MOBILE_DIR, `02_chapter_${id}.png`), fullPage: false });
    }
  }

  // 2. Audit Preorder Page
  console.log('Navigating to http://localhost:3000/preorder ...');
  await page.goto('http://localhost:3000/preorder', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const preorderOverflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
  }));
  console.log('Preorder page overflow check:', preorderOverflow);
  await page.screenshot({ path: path.join(MOBILE_DIR, '03_preorder_mobile.png'), fullPage: false });

  // 3. Audit Account Page
  console.log('Navigating to http://localhost:3000/account ...');
  await page.goto('http://localhost:3000/account', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const accountOverflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
  }));
  console.log('Account page overflow check:', accountOverflow);
  await page.screenshot({ path: path.join(MOBILE_DIR, '04_account_mobile.png'), fullPage: false });

  await browser.close();
  console.log('Mobile audit complete! Screenshots saved in:', MOBILE_DIR);
}

run().catch(console.error);
