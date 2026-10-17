import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ritik\\.gemini\\antigravity-ide\\brain\\54978495-dd9d-4a80-8bbd-33d3c8b9213f';
const PREORDER_DIR = path.join(ARTIFACT_DIR, 'screenshots', 'preorder');

if (!fs.existsSync(PREORDER_DIR)) {
  fs.mkdirSync(PREORDER_DIR, { recursive: true });
}

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1280, height: 720, name: '1280x720' },
  { width: 1024, height: 768, name: '1024x768' },
  { width: 768, height: 1024, name: '768x1024' },
  { width: 390, height: 844, name: '390x844' },
];

const STEPS = [
  { step: 1, query: '', name: 'step1_account' },
  { step: 2, query: '?step=2', name: 'step2_delivery' },
  { step: 3, query: '?step=3', name: 'step3_confirmation' },
];

async function run() {
  console.log('Launching Playwright with Microsoft Edge...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const vp of VIEWPORTS) {
    console.log(`\n========================================`);
    console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`========================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    for (const st of STEPS) {
      const url = `http://localhost:3000/preorder${st.query}`;
      console.log(`Navigating to ${url} ...`);
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);

      const filename = `preorder_${vp.name}_${st.name}.png`;
      const filepath = path.join(PREORDER_DIR, filename);
      const rootFilepath = path.join(ARTIFACT_DIR, filename);

      await page.screenshot({ path: filepath, fullPage: false });
      fs.copyFileSync(filepath, rootFilepath);
      console.log(`✓ Saved: ${filename}`);

      // If mobile/tablet (768 or 390) and step 1, also capture accordion expanded
      if (vp.width <= 768 && st.step === 1) {
        console.log(`Testing accordion expand on ${vp.name}...`);
        const accordionBtn = await page.$('#order-summary-accordion-toggle');
        if (accordionBtn) {
          await accordionBtn.click();
          await page.waitForTimeout(400);
          const accFilename = `preorder_${vp.name}_step1_accordion_open.png`;
          const accFilepath = path.join(PREORDER_DIR, accFilename);
          const accRootFilepath = path.join(ARTIFACT_DIR, accFilename);
          await page.screenshot({ path: accFilepath, fullPage: false });
          fs.copyFileSync(accFilepath, accRootFilepath);
          console.log(`✓ Saved: ${accFilename}`);
        }
      }
    }

    await page.close();
    await context.close();
  }

  await browser.close();
  console.log('\nAll preorder screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
