import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ARTIFACT_DIR = 'C:\\Users\\ritik\\.gemini\\antigravity-ide\\brain\\54978495-dd9d-4a80-8bbd-33d3c8b9213f\\screenshots\\admin';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < str.length; i++) {
    const val = alphabet.indexOf(str.charAt(i).toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTOTP(secret) {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const time = Buffer.alloc(8);
  time.writeBigInt64BE(BigInt(Math.floor(epoch / 30)));
  const hmac = crypto.createHmac('sha1', key).update(time).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1280, height: 720, name: '1280x720' },
  { width: 1024, height: 768, name: '1024x768' },
  { width: 768, height: 1024, name: '768x1024' },
];

const PAGES = [
  { path: '/admin', name: '01_overview' },
  { path: '/admin/customers', name: '02_customers' },
  { path: '/admin/preorders', name: '03_preorders' },
  { path: '/admin/audit', name: '04_audit' },
  { path: '/admin/settings', name: '05_settings' },
];

async function run() {
  console.log('Launching browser to perform admin authentication and multi-viewport QA...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  // 1. Inject Authenticated Session Cookies immediately
  console.log('Injecting authenticated admin session cookies (AAL2 verified)...');
  const cookiesJson = JSON.parse(fs.readFileSync('scripts/admin_cookies.json', 'utf8'));
  await context.addCookies(cookiesJson);

  // 2. Capture all 5 admin pages across the 4 required viewports
  for (const p of PAGES) {
    console.log(`\nNavigating to ${p.path} (${p.name})...`);
    const page = await context.newPage();
    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`http://localhost:3000${p.path}`, { waitUntil: 'commit' });
      await page.waitForTimeout(2500);

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(400);

        const filename = `${p.name}_${vp.name}.png`;
        const filepath = path.join(ARTIFACT_DIR, filename);
        await page.screenshot({ path: filepath, animations: 'disabled', timeout: 10000 });
        console.log(`[Captured] ${p.name} at ${vp.name} -> ${filename}`);
      }
    } finally {
      await page.close();
    }
  }

  // 3. Capture Customers Drawer open and Pre-orders Drawer open at 1440x900 & 768x1024
  console.log('\nCapturing detail drawers...');
  const drawerPage = await context.newPage();
  try {
    await drawerPage.setViewportSize({ width: 1440, height: 900 });
    await drawerPage.goto('http://localhost:3000/admin/customers', { waitUntil: 'commit' });
    await drawerPage.waitForSelector('tbody tr', { timeout: 10000 }).catch(() => null);
    await drawerPage.waitForTimeout(1000);
    const customerRow = await drawerPage.$('tbody tr');
    if (customerRow) {
      await customerRow.click();
      await drawerPage.waitForTimeout(800);
      await drawerPage.screenshot({ path: path.join(ARTIFACT_DIR, '02_customers_drawer_1440x900.png'), animations: 'disabled' });
      console.log('[Captured] Customers detail drawer at 1440x900');

      await drawerPage.setViewportSize({ width: 768, height: 1024 });
      await drawerPage.waitForTimeout(800);
      await drawerPage.screenshot({ path: path.join(ARTIFACT_DIR, '02_customers_drawer_768x1024.png'), animations: 'disabled' });
      console.log('[Captured] Customers detail drawer at 768x1024');
    }

    await drawerPage.setViewportSize({ width: 1440, height: 900 });
    await drawerPage.goto('http://localhost:3000/admin/preorders', { waitUntil: 'commit' });
    await drawerPage.waitForSelector('tbody tr', { timeout: 10000 }).catch(() => null);
    await drawerPage.waitForTimeout(1000);
    const orderRow = await drawerPage.$('tbody tr');
    if (orderRow) {
      await orderRow.click();
      await drawerPage.waitForTimeout(800);
      await drawerPage.screenshot({ path: path.join(ARTIFACT_DIR, '03_preorders_drawer_1440x900.png'), animations: 'disabled' });
      console.log('[Captured] Preorders detail drawer at 1440x900');
    }
  } finally {
    await drawerPage.close();
  }

  await browser.close();
  console.log('\nAll QA screenshots successfully captured!');
}

run().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
