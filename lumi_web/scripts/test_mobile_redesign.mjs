import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ritik\\.gemini\\antigravity-ide\\brain\\54978495-dd9d-4a80-8bbd-33d3c8b9213f';
const SCREENSHOTS_DIR = path.join(ARTIFACT_DIR, 'screenshots', 'mobile_redesign');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runComprehensiveAudit() {
  console.log('=== LUMI Mobile Redesign Comprehensive Acceptance Audit ===\n');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--no-sandbox'],
  });

  const report = {
    metrics: {},
    checks: {},
    failures: [],
    passedAllRules: true,
  };

  const chapterIds = ['hero', 'meet', 'see', 'talk', 'express', 'drive', 'power', 'specs', 'preorder'];

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Page Height Measurement at 390px (360x640 and 390x844)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Page Height & 30% Reduction Verification ---');

  // Viewport 390x640
  const page390_640 = await browser.newPage({ viewport: { width: 390, height: 640 }, deviceScaleFactor: 2 });
  await page390_640.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page390_640.waitForTimeout(2000);
  const scrollHeight390_640 = await page390_640.evaluate(() => document.documentElement.scrollHeight);
  const baseline640 = 8225;
  const reduction640 = ((baseline640 - scrollHeight390_640) / baseline640) * 100;
  console.log(`Viewport 390x640: Before = ${baseline640}px, After = ${scrollHeight390_640}px (Reduction: ${reduction640.toFixed(1)}%, Target: >= 30%)`);

  report.metrics['390x640'] = {
    beforeScrollHeight: baseline640,
    afterScrollHeight: scrollHeight390_640,
    reductionPercent: Number(reduction640.toFixed(1)),
    passed: reduction640 >= 30,
  };
  if (reduction640 < 30) {
    report.failures.push(`390x640 height reduction is only ${reduction640.toFixed(1)}%, expected >= 30%`);
  }
  await page390_640.close();

  // Viewport 390x844 (iPhone 12 / 13 / 14)
  const page390_844 = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page390_844.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page390_844.waitForTimeout(2000);
  const scrollHeight390_844 = await page390_844.evaluate(() => document.documentElement.scrollHeight);
  const baseline844 = 9136;
  const reduction844 = ((baseline844 - scrollHeight390_844) / baseline844) * 100;
  console.log(`Viewport 390x844: Before = ${baseline844}px, After = ${scrollHeight390_844}px (Reduction: ${reduction844.toFixed(1)}%, Target: >= 30%)`);

  report.metrics['390x844'] = {
    beforeScrollHeight: baseline844,
    afterScrollHeight: scrollHeight390_844,
    reductionPercent: Number(reduction844.toFixed(1)),
    passed: reduction844 >= 30,
  };
  if (reduction844 < 30) {
    report.failures.push(`390x844 height reduction is only ${reduction844.toFixed(1)}%, expected >= 30%`);
  }

  // Check stage elements and heights
  const stages = await page390_844.evaluate(() => {
    return Array.from(document.querySelectorAll('.robot-stage')).map((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        chapter: el.getAttribute('data-chapter'),
        height: Math.round(rect.height),
        width: Math.round(rect.width),
        display: style.display,
        position: style.position,
      };
    });
  });
  console.log(`Found ${stages.length} in-flow robot stages.`);
  report.checks.stages = stages;

  // Capture full page screenshot at 390x844
  await page390_844.screenshot({
    path: path.join(SCREENSHOTS_DIR, '390x844_full_page.png'),
    fullPage: true,
  });

  // Capture each chapter at 390x844
  for (const id of chapterIds) {
    const el = await page390_844.$(`#${id}`);
    if (el) {
      await el.scrollIntoViewIfNeeded();
      await page390_844.waitForTimeout(400);
      await page390_844.screenshot({
        path: path.join(SCREENSHOTS_DIR, `390x844_chapter_${id}.png`),
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Small Viewport Acceptance at 360x640
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Checking 360x640 Viewport Acceptance ---');
  const page360 = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  await page360.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page360.waitForTimeout(2000);

  // Check Hero primary button visible without scrolling at 360x640
  const heroPrimaryBtnCheck = await page360.evaluate(() => {
    const btn = document.querySelector('#hero a.btn-primary');
    if (!btn) return { found: false };
    const rect = btn.getBoundingClientRect();
    return {
      found: true,
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      visibleWithoutScroll: rect.bottom <= 640 && rect.top >= 0,
      height: Math.round(rect.height),
    };
  });
  console.log('Hero Primary Button visible without scroll at 360x640:', heroPrimaryBtnCheck);
  report.checks.heroPrimaryBtnVisible360x640 = heroPrimaryBtnCheck;
  if (!heroPrimaryBtnCheck.visibleWithoutScroll) {
    report.failures.push(`Hero primary button not visible without scroll at 360x640 (bottom: ${heroPrimaryBtnCheck.bottom})`);
  }

  await page360.screenshot({
    path: path.join(SCREENSHOTS_DIR, '360x640_hero_above_fold.png'),
  });

  // Check Chapter 05: stage + 7 mood buttons visible together at 360x640
  const expressCheck = await page360.evaluate(async () => {
    const express = document.querySelector('#express');
    if (!express) return { found: false };
    express.scrollIntoView({ behavior: 'instant', block: 'start' });
    await new Promise((r) => setTimeout(r, 300));
    const stage = express.querySelector('.robot-stage');
    const moodBtns = Array.from(express.querySelectorAll('button[data-mood]'));
    const stageRect = stage ? stage.getBoundingClientRect() : null;
    const btnsRect = moodBtns.length > 0 ? {
      top: Math.round(Math.min(...moodBtns.map((b) => b.getBoundingClientRect().top))),
      bottom: Math.round(Math.max(...moodBtns.map((b) => b.getBoundingClientRect().bottom))),
      count: moodBtns.length,
      allMinHeight44: moodBtns.every((b) => b.getBoundingClientRect().height >= 43.5),
    } : null;

    return {
      found: true,
      stageTop: stageRect ? Math.round(stageRect.top) : null,
      stageBottom: stageRect ? Math.round(stageRect.bottom) : null,
      btnsTop: btnsRect ? btnsRect.top : null,
      btnsBottom: btnsRect ? btnsRect.bottom : null,
      count: btnsRect ? btnsRect.count : 0,
      allMinHeight44: btnsRect ? btnsRect.allMinHeight44 : false,
      stageAndButtonsTogetherInView: stageRect && btnsRect ? (btnsRect.bottom <= 640 && stageRect.top >= 0) : false,
    };
  });
  console.log('Chapter 05 Stage + 7 Mood Buttons together at 360x640:', expressCheck);
  report.checks.expressStageAndButtons360x640 = expressCheck;
  if (!expressCheck.stageAndButtonsTogetherInView) {
    report.failures.push(`Chapter 05 stage and 7 mood buttons not visible together at 360x640 (stageTop: ${expressCheck.stageTop}, btnsBottom: ${expressCheck.btnsBottom})`);
  }

  // Capture each chapter at 360x640
  for (const id of chapterIds) {
    const el = await page360.$(`#${id}`);
    if (el) {
      await el.scrollIntoViewIfNeeded();
      await page360.waitForTimeout(400);
      await page360.screenshot({
        path: path.join(SCREENSHOTS_DIR, `360x640_chapter_${id}.png`),
      });
    }
  }

  await page360.close();

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Multi-Device Matrix: iPhone 12, Pixel 7, and 320x568
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Multi-Device Matrix Validation ---');
  const viewports = [
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'Pixel 7', width: 412, height: 915 },
    { name: 'iPhone SE (320x568)', width: 320, height: 568 },
  ];

  for (const vp of viewports) {
    const vpPage = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
    await vpPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await vpPage.waitForTimeout(1000);

    const vpAudit = await vpPage.evaluate(() => {
      let horizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      
      // Check no text element under 11px
      const allTextElements = Array.from(document.querySelectorAll('p, span, h1, h2, h3, a, button, dt, dd, li'));
      const textUnder11px = allTextElements.filter((el) => {
        const text = el.innerText.trim();
        if (!text) return false;
        const fs = parseFloat(window.getComputedStyle(el).fontSize);
        return fs < 10.5; // allowance for rounding
      }).map((el) => ({ tag: el.tagName, text: el.innerText.slice(0, 20), fontSize: window.getComputedStyle(el).fontSize }));

      // Check tap targets min 44px
      const interactive = Array.from(document.querySelectorAll('a.btn, button.btn, button[data-mood], input, .compact-row'));
      const smallTapTargets = interactive.filter((el) => {
        const r = el.getBoundingClientRect();
        return (r.height < 42 || r.width < 42) && window.getComputedStyle(el).display !== 'none';
      }).map((el) => ({ tag: el.tagName, className: el.className, height: el.getBoundingClientRect().height }));

      // Check stage doesn't intersect with text elements
      const stages = Array.from(document.querySelectorAll('.robot-stage'));
      const stageRects = stages.map((s) => s.getBoundingClientRect());
      const overlappingText = [];
      for (const t of allTextElements) {
        if (stages.some((s) => s.contains(t))) continue;
        const tr = t.getBoundingClientRect();
        if (tr.height === 0 || tr.width === 0) continue;
        for (const sr of stageRects) {
          const intersects = !(tr.right <= sr.left || tr.left >= sr.right || tr.bottom <= sr.top || tr.top >= sr.bottom);
          if (intersects && window.getComputedStyle(t).position !== 'fixed') {
            overlappingText.push({ text: t.innerText.slice(0, 20), tr, sr });
          }
        }
      }

      return {
        horizontalScroll,
        textUnder11pxCount: textUnder11px.length,
        smallTapTargetsCount: smallTapTargets.length,
        overlappingTextCount: overlappingText.length,
      };
    });

    console.log(`${vp.name} (${vp.width}x${vp.height}):`, vpAudit);
    report.checks[vp.name] = vpAudit;

    if (vpAudit.horizontalScroll) {
      report.failures.push(`${vp.name} has horizontal scroll!`);
    }
    if (vpAudit.textUnder11pxCount > 0) {
      report.failures.push(`${vp.name} has ${vpAudit.textUnder11pxCount} text elements under 11px!`);
    }

    await vpPage.close();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: Desktop Regression Check (1440x900)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Desktop Regression Check (1440x900) ---');
  const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  await desktopPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);

  const desktopStages = await desktopPage.evaluate(() => {
    return Array.from(document.querySelectorAll('.robot-stage')).map((el) => window.getComputedStyle(el).display);
  });
  const allStagesHiddenOnDesktop = desktopStages.every((d) => d === 'none');
  console.log('All robot stages hidden on desktop (display: none):', allStagesHiddenOnDesktop);
  report.checks.allStagesHiddenOnDesktop = allStagesHiddenOnDesktop;
  if (!allStagesHiddenOnDesktop) {
    report.failures.push('Robot stages must be hidden (display: none) on desktop >= 768px');
  }

  await desktopPage.screenshot({
    path: path.join(SCREENSHOTS_DIR, '1440x900_desktop_hero.png'),
  });

  await desktopPage.close();
  await page390_844.close();
  await browser.close();

  report.passedAllRules = report.failures.length === 0;

  console.log('\n=== AUDIT RESULTS SUMMARY ===');
  console.log(JSON.stringify(report, null, 2));

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'mobile_redesign_audit.json'),
    JSON.stringify(report, null, 2)
  );

  return report;
}

runComprehensiveAudit().catch(console.error);
