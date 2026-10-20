import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ritik\\.gemini\\antigravity-ide\\brain\\54978495-dd9d-4a80-8bbd-33d3c8b9213f\\screenshots';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const CHAPTERS = [
  { id: 'hero', num: '01', name: 'hero' },
  { id: 'meet', num: '02', name: 'meet' },
  { id: 'see', num: '03', name: 'see' },
  { id: 'talk', num: '04', name: 'talk' },
  { id: 'express', num: '05', name: 'express' },
  { id: 'drive', num: '06', name: 'drive' },
  { id: 'power', num: '07', name: 'power' },
  { id: 'specs', num: '08', name: 'specs' },
  { id: 'preorder', num: '09', name: 'order' },
];

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1280, height: 720, name: '1280x720' },
  { width: 1024, height: 768, name: '1024x768' },
  { width: 768, height: 1024, name: '768x1024' },
  { width: 390, height: 844, name: '390x844' },
];

async function capture() {
  console.log('Starting screenshot captures across all 5 acceptance viewports...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Capturing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(800);

    for (const ch of CHAPTERS) {
      console.log(`Capturing Chapter ${ch.num} (${ch.id}) at ${vp.name}...`);

      // Scroll to chapter element
      await page.evaluate((targetId) => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }, ch.id);

      // Wait for Three.js position lerp and intersection observer to settle
      await page.waitForTimeout(700);

      const filename = `chapter_${ch.num}_${ch.name}_${vp.name}.png`;
      const filepath = path.join(ARTIFACT_DIR, filename);

      await page.screenshot({ path: filepath, fullPage: false });
      console.log(`Saved: ${filename}`);
    }
  }

  // Also capture Chapter 05 with a different mood clicked (e.g. 'love' mood)
  console.log('\n=== Testing Mood button interaction on 3D face in Chapter 05 ===');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    const el = document.getElementById('express');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(800);

  // Click 'love' mood button
  const loveBtn = page.locator('button:has-text("love")');
  if (await loveBtn.isVisible()) {
    await loveBtn.click();
    await page.waitForTimeout(1000);
    const lovePath = path.join(ARTIFACT_DIR, 'chapter_05_express_love_mood_1440x900.png');
    await page.screenshot({ path: lovePath });
    console.log(`Saved: chapter_05_express_love_mood_1440x900.png`);
  }

  // Also test FAQ open in Chapter 09
  console.log('\n=== Testing FAQ Accordion interaction in Chapter 09 ===');
  await page.evaluate(() => {
    const el = document.getElementById('preorder');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(800);

  const faqBtn = page.locator('button:has-text("What is a pre-order?")');
  if (await faqBtn.isVisible()) {
    await faqBtn.click();
    await page.waitForTimeout(600);
    const faqPath = path.join(ARTIFACT_DIR, 'chapter_09_faq_expanded_1440x900.png');
    await page.screenshot({ path: faqPath });
    console.log(`Saved: chapter_09_faq_expanded_1440x900.png`);
  }

  // Capture Footer clearance
  console.log('\n=== Testing Footer clearance ===');
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
  });
  await page.waitForTimeout(800);
  const footerPath = path.join(ARTIFACT_DIR, 'footer_clearance_1440x900.png');
  await page.screenshot({ path: footerPath });
  console.log(`Saved: footer_clearance_1440x900.png`);

  await page.close();
  await browser.close();
  console.log('\nAll test screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
