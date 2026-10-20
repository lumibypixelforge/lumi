import { chromium } from 'playwright-core';

async function testGL() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle'],
  });
  const page = await browser.newPage();
  
  page.on('console', (msg) => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('BROWSER ERROR:', err.message));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const state = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const container = document.querySelector('.canvas-container');
    return {
      hasCanvas: !!canvas,
      containerHtml: container ? container.outerHTML : 'none',
      width: canvas ? canvas.width : 0,
      height: canvas ? canvas.height : 0,
    };
  });
  console.log('Browser State:', JSON.stringify(state, null, 2));
  await browser.close();
}

testGL().catch(console.error);
