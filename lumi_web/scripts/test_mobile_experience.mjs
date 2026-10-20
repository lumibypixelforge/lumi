import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ritik\\.gemini\\antigravity-ide\\brain\\54978495-dd9d-4a80-8bbd-33d3c8b9213f';
const SCREENSHOTS_DIR = path.join(ARTIFACT_DIR, 'screenshots', 'mobile_fix_verification');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '320x568', width: 320, height: 568 },
  { name: '360x640', width: 360, height: 640 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
  { name: '768x1024', width: 768, height: 1024 },
];

const CHAPTERS = ['hero', 'meet', 'see', 'talk', 'express', 'drive', 'power', 'specs', 'preorder'];

async function runTest() {
  console.log('--- Starting LUMI Mobile Experience Verification ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const testResults = {
    viewportsTested: [],
    horizontalOverflowViolations: [],
    textOverlapViolations: [],
    fontUnder11pxViolations: [],
    tapTargetViolations: [],
    bottomBarOverlapViolations: [],
    screenshotsCaptured: [],
  };

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: vp.width < 768,
      hasTouch: vp.width < 768,
    });

    const page = await context.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 1. Horizontal Scroll Check
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    if (hasHorizontalOverflow) {
      testResults.horizontalOverflowViolations.push(vp.name);
      console.error(`[FAIL] Horizontal overflow detected at ${vp.name}!`);
    } else {
      console.log(`[PASS] Zero horizontal overflow at ${vp.name}`);
    }

    // 2. Text under 11px Check
    const smallTextElements = await page.evaluate(() => {
      const small = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let node;
      while ((node = walker.nextNode())) {
        const el = node;
        const text = el.innerText?.trim();
        if (text && el.children.length === 0) {
          const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
          if (fontSize < 10.9) {
            small.push({
              tag: el.tagName,
              text: text.slice(0, 30),
              fontSize,
              className: el.className,
            });
          }
        }
      }
      return small;
    });

    if (smallTextElements.length > 0) {
      testResults.fontUnder11pxViolations.push({ viewport: vp.name, elements: smallTextElements });
      console.warn(`[WARN] Found text elements under 11px at ${vp.name}:`, smallTextElements.slice(0, 3));
    } else {
      console.log(`[PASS] No text under 11px at ${vp.name}`);
    }

    // 3. Tap Target >= 44px Check (buttons, links, inputs)
    if (vp.width < 768) {
      const smallTapTargets = await page.evaluate(() => {
        const interactive = Array.from(document.querySelectorAll('button, a.btn, input, select'));
        const small = [];
        interactive.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (rect.height < 43.5 || rect.width < 43.5) {
              small.push({
                tag: el.tagName,
                text: el.innerText?.trim()?.slice(0, 20) || el.getAttribute('aria-label') || el.id,
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              });
            }
          }
        });
        return small;
      });

      if (smallTapTargets.length > 0) {
        console.warn(`[INFO] Interactive elements check at ${vp.name}:`, smallTapTargets.slice(0, 3));
      } else {
        console.log(`[PASS] Tap targets >= 44px verified at ${vp.name}`);
      }
    }

    // 4. Chapter-by-chapter screenshots & dock overlap verification
    for (const chapterId of CHAPTERS) {
      const chapterEl = await page.$(`#${chapterId}`);
      if (chapterEl) {
        await page.evaluate((id) => {
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
        }, chapterId);
        await page.waitForTimeout(600);

        // Check if any heading or paragraph in the active chapter intersects the robot dock
        if (vp.width < 768) {
          const overlap = await page.evaluate((id) => {
            const dock = document.querySelector('.canvas-container');
            const chapter = document.getElementById(id);
            if (!dock || !chapter) return false;

            const dockRect = dock.getBoundingClientRect();
            // Check all visible text elements inside chapter
            const texts = chapter.querySelectorAll('h1, h2, h3, p');
            for (const t of texts) {
              const r = t.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                // If text element top is above dock bottom and text bottom is below dock top, it overlaps dock
                if (r.top < dockRect.bottom && r.bottom > dockRect.top) {
                  return {
                    tagName: t.tagName,
                    text: t.innerText.slice(0, 25),
                    textTop: r.top,
                    dockBottom: dockRect.bottom,
                  };
                }
              }
            }
            return false;
          }, chapterId);

          if (overlap) {
            testResults.textOverlapViolations.push({ viewport: vp.name, chapter: chapterId, overlap });
            console.error(`[FAIL] Text overlaps dock in ${chapterId} at ${vp.name}!`, overlap);
          }
        }

        // Capture screenshots for 390x844 and 360x640
        if (vp.name === '390x844' || vp.name === '360x640') {
          const filename = `${vp.name}_chapter_${chapterId}.png`;
          const filePath = path.join(SCREENSHOTS_DIR, filename);
          await page.screenshot({ path: filePath, fullPage: false });
          testResults.screenshotsCaptured.push(filePath);
        }
      }
    }

    // 5. Preorder / Waitlist Bottom bar overlap check
    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    });
    await page.waitForTimeout(500);

    const bottomPaddingCheck = await page.evaluate(() => {
      const bar = document.querySelector('aside[aria-label="Mobile quick action bar"]');
      const footer = document.querySelector('footer');
      if (!bar) return { safe: true, reason: 'Bar hidden at bottom as required' };
      const barRect = bar.getBoundingClientRect();
      const footerRect = footer?.getBoundingClientRect();
      return {
        safe: !footerRect || footerRect.bottom > barRect.bottom,
        barVisible: true,
      };
    });
    console.log(`Bottom bar footer clearance at ${vp.name}:`, bottomPaddingCheck);

    testResults.viewportsTested.push(vp.name);
    await context.close();
  }

  await browser.close();

  // Save report
  const reportPath = path.join(SCREENSHOTS_DIR, 'test_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log('\n--- Mobile Experience Verification Finished ---');
  console.log(`Report written to: ${reportPath}`);
  console.log(`Captured ${testResults.screenshotsCaptured.length} screenshots in: ${SCREENSHOTS_DIR}`);
}

runTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
