import { chromium } from 'playwright-core';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ritik\\.gemini\\antigravity-ide\\brain\\54978495-dd9d-4a80-8bbd-33d3c8b9213f';
const MOBILE_DIR = path.join(ARTIFACT_DIR, 'screenshots', 'mobile_audit');

async function testMobileMenu() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click hamburger button
  const menuBtn = await page.$('button[aria-label="Open menu"]');
  if (menuBtn) {
    await menuBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(MOBILE_DIR, '05_mobile_menu_open.png') });
    console.log('Captured 05_mobile_menu_open.png');
  } else {
    console.log('Mobile menu button not found');
  }

  await browser.close();
}

testMobileMenu().catch(console.error);
