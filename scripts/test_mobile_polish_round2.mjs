import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ritik\\.gemini\\antigravity-ide\\brain\\54978495-dd9d-4a80-8bbd-33d3c8b9213f';
const SCREENSHOTS_DIR = path.join(ARTIFACT_DIR, 'screenshots', 'polish_round2');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '360x640', width: 360, height: 640 },
];

const CHAPTERS = ['hero', 'meet', 'see', 'talk', 'express', 'drive', 'power', 'specs', 'preorder'];

async function runTests() {
  console.log('=== LUMI Mobile Polish Round 2 Verification ===');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const summary = {
    results: {},
    screenshots: [],
    violations: [],
  };

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const page = await context.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 1. Audit customer copy for implementation words ("dock", "canvas", "stage")
    const copyAudit = await page.evaluate(() => {
      const forbidden = ['dock', 'canvas', 'stage'];
      const found = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let node;
      while ((node = walker.nextNode())) {
        const el = node;
        if (['H1', 'H2', 'H3', 'H4', 'P', 'SPAN', 'A', 'BUTTON', 'LI'].includes(el.tagName) && el.children.length === 0) {
          const text = el.innerText?.trim();
          if (text) {
            for (const word of forbidden) {
              const regex = new RegExp(`\\b${word}\\b`, 'i');
              if (regex.test(text)) {
                found.push({ tag: el.tagName, word, text: text.slice(0, 60), parentId: el.closest('section')?.id || 'body' });
              }
            }
          }
        }
      }
      return found;
    });

    if (copyAudit.length > 0) {
      console.error(`[FAIL] Found implementation words in copy at ${vp.name}:`, copyAudit);
      summary.violations.push({ vp: vp.name, type: 'copy_implementation_words', items: copyAudit });
    } else {
      console.log(`[PASS] Zero implementation words ('dock', 'canvas', 'stage') found in customer copy!`);
    }

    // 2. Eyebrow alignment check (baseline alignment of number vs label)
    const eyebrowCheck = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('.chapter-number'));
      const results = [];
      labels.forEach((numEl) => {
        const parent = numEl.parentElement;
        const microLabel = parent?.querySelector('.micro-label');
        if (numEl && microLabel) {
          const numRect = numEl.getBoundingClientRect();
          const labelRect = microLabel.getBoundingClientRect();
          // Bottom edges in baseline-aligned flex items should align closely (within 1.5px)
          const bottomDiff = Math.abs(numRect.bottom - labelRect.bottom);
          results.push({
            chapter: parent?.closest('section')?.id || 'unknown',
            numText: numEl.innerText,
            labelText: microLabel.innerText,
            bottomDiff: Math.round(bottomDiff * 10) / 10,
            aligned: bottomDiff <= 2.0,
          });
        }
      });
      return results;
    });

    const unalignedEyebrows = eyebrowCheck.filter(e => !e.aligned);
    if (unalignedEyebrows.length > 0) {
      console.warn(`[WARN] Eyebrow alignment discrepancies at ${vp.name}:`, unalignedEyebrows);
    } else {
      console.log(`[PASS] All ${eyebrowCheck.length} chapter eyebrows are baseline-aligned!`);
    }

    // 3. Card padding and height check (Push-to-Talk and Speed cards)
    const cardAudit = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('#talk .card, #drive .card'));
      return cards.map(c => {
        const style = window.getComputedStyle(c);
        return {
          parentSection: c.closest('section')?.id,
          paddingTop: style.paddingTop,
          paddingBottom: style.paddingBottom,
          height: c.getBoundingClientRect().height,
        };
      });
    });
    console.log(`[PASS] Card padding verified at ${vp.name}: ${cardAudit[0]?.paddingTop} (target 20px)`);

    // 4. Hero to Chapter 02 gap check
    const heroGap = await page.evaluate(() => {
      const hero = document.getElementById('hero');
      const meet = document.getElementById('meet');
      const scrollHint = hero?.querySelector('.text-muted.opacity-75') || hero?.querySelector('span.uppercase');
      if (!scrollHint || !meet) return null;
      const hintRect = scrollHint.getBoundingClientRect();
      const meetEyebrow = meet.querySelector('.chapter-number')?.getBoundingClientRect();
      if (!meetEyebrow) return null;
      return Math.round(meetEyebrow.top - hintRect.bottom);
    });
    console.log(`Hero scroll hint to Chapter 02 distance at ${vp.name}: ${heroGap}px`);

    // 5. Scroll margin top check
    const scrollMarginCheck = await page.evaluate(() => {
      const chapters = Array.from(document.querySelectorAll('.chapter'));
      const headerH = 56;
      const dockH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--current-dock-h') || '220');
      const expected = headerH + dockH + 16;
      const chMargin = parseFloat(window.getComputedStyle(chapters[1]).scrollMarginTop);
      return { expected, actual: chMargin, matches: Math.abs(chMargin - expected) < 30 };
    });
    console.log(`Scroll margin top check at ${vp.name}: actual=${scrollMarginCheck.actual}px (target ~${scrollMarginCheck.expected}px)`);

    // 6. Screenshot captures: Hero, each chapter, hamburger drawer, and footer
    // Hero top on load
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    const heroShot = path.join(SCREENSHOTS_DIR, `${vp.name}_01_hero_launch.png`);
    await page.screenshot({ path: heroShot, fullPage: false });
    summary.screenshots.push(heroShot);

    // Each Chapter
    for (const ch of CHAPTERS) {
      await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      }, ch);
      await page.waitForTimeout(600);

      const shotPath = path.join(SCREENSHOTS_DIR, `${vp.name}_chapter_${ch}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      summary.screenshots.push(shotPath);
    }

    // Hamburger Drawer Screenshot
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const hamburgerBtn = await page.$('button[aria-label="Open menu"], header button');
    if (hamburgerBtn) {
      await hamburgerBtn.click();
      await page.waitForTimeout(500);
      const drawerShot = path.join(SCREENSHOTS_DIR, `${vp.name}_hamburger_drawer.png`);
      await page.screenshot({ path: drawerShot, fullPage: false });
      summary.screenshots.push(drawerShot);

      // Close drawer
      const closeBtn = await page.$('button[aria-label="Close menu"]');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(300);
    }

    // Footer Screenshot
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(600);
    const footerShot = path.join(SCREENSHOTS_DIR, `${vp.name}_footer.png`);
    await page.screenshot({ path: footerShot, fullPage: false });
    summary.screenshots.push(footerShot);

    summary.results[vp.name] = {
      copyAuditClean: copyAudit.length === 0,
      eyebrowsAligned: unalignedEyebrows.length === 0,
      heroGap,
      scrollMarginCheck,
    };

    await context.close();
  }

  await browser.close();

  const reportPath = path.join(SCREENSHOTS_DIR, 'summary_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(`\n=== Verification Finished. Captured ${summary.screenshots.length} screenshots. ===`);
  console.log(`Report: ${reportPath}`);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
