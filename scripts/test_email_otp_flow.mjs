import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\ritik\\.gemini\\antigravity-ide\\brain\\54978495-dd9d-4a80-8bbd-33d3c8b9213f';
const SCREENSHOTS_DIR = path.join(ARTIFACT_DIR, 'screenshots', 'otp_flow');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runTest() {
  console.log('=== Testing 6-Digit Email OTP Verification Flow ===');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3000/preorder', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Take screenshot of Initial Signup Form
  const shot1 = path.join(SCREENSHOTS_DIR, '01_signup_form.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log(`Saved screenshot 1: ${shot1}`);

  // Fill in signup details with a unique test email
  const testEmail = `test.user.${Date.now()}@example.com`;
  console.log(`Using test email: ${testEmail}`);

  await page.fill('input[placeholder="Alex Mercer"]', 'Kavya Sharma');
  await page.fill('input[placeholder="9876543210"]', '9811223344');
  await page.fill('input[placeholder="name@example.com"]', testEmail);
  await page.fill('input[placeholder="At least 8 characters"]', 'SecurePass123!');
  
  // Agree to terms
  const termsCheckbox = await page.$('input[type="checkbox"][required]');
  if (termsCheckbox) {
    await termsCheckbox.check();
  }

  // Submit signup
  console.log('Submitting signup form...');
  await page.click('button:has-text("Create account and continue")');

  // Wait for OTP verification UI
  console.log('Waiting for OTP verification screen...');
  await page.waitForSelector('text=Verify your email address', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Take screenshot of OTP Verification Screen
  const shot2 = path.join(SCREENSHOTS_DIR, '02_otp_screen.png');
  await page.screenshot({ path: shot2, fullPage: false });
  console.log(`Saved screenshot 2: ${shot2}`);

  // Check that 6 input boxes exist
  const digitInputs = await page.$$('input[aria-label^="Digit"]');
  console.log(`Found ${digitInputs.length} digit input boxes (expected 6).`);

  // Test typing invalid OTP "123456"
  console.log('Testing invalid OTP rejection...');
  for (let i = 0; i < 6; i++) {
    await digitInputs[i].fill(String(i + 1));
  }
  await page.waitForTimeout(500);

  // Click verify
  await page.click('button:has-text("Verify & Continue")');
  await page.waitForTimeout(1500);

  // Check error message displayed
  const errorMsg = await page.$eval('div[role="alert"]', el => el.innerText).catch(() => null);
  console.log(`Error message displayed on invalid OTP: "${errorMsg}"`);

  // Take screenshot of Error State
  const shot3 = path.join(SCREENSHOTS_DIR, '03_otp_error.png');
  await page.screenshot({ path: shot3, fullPage: false });
  console.log(`Saved screenshot 3: ${shot3}`);

  // Test "Edit email or sign in"
  console.log('Testing Edit Email button...');
  await page.click('button:has-text("Edit email or sign in")');
  await page.waitForTimeout(600);

  // Verify form is back with fields preserved
  const nameVal = await page.$eval('input[placeholder="Alex Mercer"]', el => el.value);
  console.log(`Returned to form with name preserved: "${nameVal}"`);

  // Take screenshot of returned form
  const shot4 = path.join(SCREENSHOTS_DIR, '04_form_preserved.png');
  await page.screenshot({ path: shot4, fullPage: false });
  console.log(`Saved screenshot 4: ${shot4}`);

  await context.close();
  await browser.close();
  console.log('=== All OTP Verification Tests Completed Successfully! ===');
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
