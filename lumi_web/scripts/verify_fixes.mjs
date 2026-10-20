import { chromium } from 'playwright-core';

async function testFixes() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--no-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Mockup width check
  const mockupWidth = await page.evaluate(() => {
    const img = document.querySelector('.phone-mockup-wrapper img');
    return img ? Math.round(img.getBoundingClientRect().width) : null;
  });
  console.log('Phone Mockup Width at 390px viewport:', mockupWidth, 'px (Target: generous, ~240px)');

  // 2. Stage intersections check
  const checkIntersections = await page.evaluate(() => {
    const stages = Array.from(document.querySelectorAll('.robot-stage'));
    const stageRects = stages.map((s) => s.getBoundingClientRect());
    const texts = Array.from(document.querySelectorAll('h1, h2, p, .compact-row'));
    const overlaps = [];
    for (const t of texts) {
      if (stages.some((s) => s.contains(t))) continue;
      const tr = t.getBoundingClientRect();
      if (tr.height === 0 || tr.width === 0) continue;
      for (const sr of stageRects) {
        if (!(tr.right <= sr.left || tr.left >= sr.right || tr.bottom <= sr.top || tr.top >= sr.bottom)) {
          overlaps.push({ text: t.innerText.slice(0, 30), tr, sr });
        }
      }
    }
    return { overlapsCount: overlaps.length, overlaps };
  });
  console.log('Stage intersections with text:', checkIntersections.overlapsCount);

  // 3. Mood button reactivity check
  const moodResult = await page.evaluate(async () => {
    const express = document.getElementById('express');
    if (!express) return { error: 'no express' };
    express.scrollIntoView();
    await new Promise((r) => setTimeout(r, 400));

    const moodsToTest = ['angry', 'sleep', 'love', 'happy'];
    const results = [];
    for (const m of moodsToTest) {
      const btn = express.querySelector(`button[data-mood="${m}"]`);
      if (btn) {
        btn.click();
        await new Promise((r) => setTimeout(r, 200));
        const caption = express.querySelector('p.font-mono');
        results.push({
          mood: m,
          captionText: caption ? caption.innerText : '',
          btnClasses: btn.className,
        });
      }
    }
    return results;
  });
  console.log('Mood button selection test:', JSON.stringify(moodResult, null, 2));

  await browser.close();
}

testFixes().catch(console.error);
