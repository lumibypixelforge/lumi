import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('public', 'lite-robot');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function renderLiteImages() {
  console.log('Rendering 3D model snapshots for Lite Mode into:', OUT_DIR);

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--no-sandbox'],
  });

  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Wait for 3D model and textures to load

  // Helper to capture stage cropped from WebGL canvas as webp
  async function captureStageAsWebP(selector, outputPath) {
    const el = await page.$(selector);
    if (!el) {
      console.warn(`Element ${selector} not found`);
      return;
    }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600); // Allow scissor render to draw into stage

    const rect = await el.boundingBox();
    if (!rect) return;

    // Use page screenshot clipped to stage bounding box
    const pngBuffer = await page.screenshot({
      clip: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      omitBackground: true,
    });

    // Convert to webp via in-browser canvas
    const webpBase64 = await page.evaluate(async (base64Png) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/webp', 0.85).split(',')[1]);
        };
        img.src = 'data:image/png;base64,' + base64Png;
      });
    }, pngBuffer.toString('base64'));

    fs.writeFileSync(outputPath, Buffer.from(webpBase64, 'base64'));
    const stats = fs.statSync(outputPath);
    console.log(`Saved ${path.basename(outputPath)} (${Math.round(stats.size / 1024)} KB)`);
  }

  // 1. Capture chapters 1 through 9
  for (let ch = 1; ch <= 9; ch++) {
    const selector = `.robot-stage[data-chapter="${ch}"]`;
    const outPath = path.join(OUT_DIR, `ch${ch}.webp`);
    await captureStageAsWebP(selector, outPath);
  }

  // 2. Capture Chapter 05 seven moods
  const moods = ['happy', 'neutral', 'sleep', 'angry', 'upset', 'sad', 'love'];
  for (const mood of moods) {
    const moodBtn = await page.$(`button[data-mood="${mood}"]`);
    if (moodBtn) {
      await moodBtn.click();
      await page.waitForTimeout(400);
      const outPath = path.join(OUT_DIR, `mood-${mood}.webp`);
      await captureStageAsWebP('.robot-stage[data-chapter="5"]', outPath);
    }
  }

  await browser.close();
  console.log('All lite robot images successfully rendered!');
}

renderLiteImages().catch(console.error);
