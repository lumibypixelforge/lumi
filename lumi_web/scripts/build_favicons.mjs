import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';

// 1. Read clean SVG path
const rawSvg = fs.readFileSync('public/lumi-logo.svg', 'utf8');
const match = rawSvg.match(/d="([^"]+)"/);
if (!match) {
  console.error('Could not find path data in public/lumi-logo.svg');
  process.exit(1);
}
const pathD = match[1];

// Maximize size within 512x512
// Original logo bounds: width 513, height 191
const targetW = 496;
const scale = targetW / 513; // ~0.9668
const targetH = 191 * scale; // ~184.6
const offsetX = (512 - targetW) / 2; // ~8
const offsetY = (512 - targetH) / 2; // ~163.7

// SVG for browser tab: adaptive to light & dark mode
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <style>
    .lumi-logo-path {
      fill: #110F1A;
    }
    @media (prefers-color-scheme: dark) {
      .lumi-logo-path {
        fill: #FFFFFF;
      }
    }
  </style>
  <g transform="translate(${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}) scale(${scale.toFixed(4)})">
    <path class="lumi-logo-path" fill-rule="evenodd" clip-rule="evenodd" d="${pathD}" />
  </g>
</svg>`;

// Write SVG icons
fs.writeFileSync('src/app/icon.svg', svgContent);
fs.writeFileSync('public/icon.svg', svgContent);
fs.writeFileSync('public/favicon.svg', svgContent);
console.log('✓ Written src/app/icon.svg, public/icon.svg, public/favicon.svg');

async function generatePngAndIco() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });

  // HTML page to render the SVG cleanly onto transparent background
  const renderHtml = (color = '#110F1A') => `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;overflow:hidden;background:transparent;">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" style="display:block;">
    <g transform="translate(${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}) scale(${scale.toFixed(4)})">
      <path fill="${color}" fill-rule="evenodd" clip-rule="evenodd" d="${pathD}" />
    </g>
  </svg>
</body>
</html>`;

  // Render 32x32 PNG
  const page32 = await browser.newPage({ viewport: { width: 32, height: 32 } });
  await page32.setContent(renderHtml('#110F1A'));
  const png32Buffer = await page32.screenshot({ omitBackground: true, type: 'png' });
  await page32.close();

  // Render 48x48 PNG
  const page48 = await browser.newPage({ viewport: { width: 48, height: 48 } });
  await page48.setContent(renderHtml('#110F1A'));
  const png48Buffer = await page48.screenshot({ omitBackground: true, type: 'png' });
  await page48.close();

  // Render 180x180 Apple touch icon
  const page180 = await browser.newPage({ viewport: { width: 180, height: 180 } });
  await page180.setContent(renderHtml('#110F1A'));
  const png180Buffer = await page180.screenshot({ omitBackground: true, type: 'png' });
  await page180.close();

  fs.writeFileSync('src/app/apple-icon.png', png180Buffer);
  fs.writeFileSync('public/apple-touch-icon.png', png180Buffer);
  console.log('✓ Written Apple touch icons (180x180)');

  // Build multi-res ICO file containing 32x32 and 48x48 PNGs
  // ICO header: 2 bytes reserved (0), 2 bytes type (1=icon), 2 bytes image count (2)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon type
  header.writeUInt16LE(2, 4); // 2 images

  const dirEntrySize = 16;
  const imageOffset1 = 6 + dirEntrySize * 2;
  const imageOffset2 = imageOffset1 + png32Buffer.length;

  const dir1 = Buffer.alloc(16);
  dir1.writeUInt8(32, 0); // width
  dir1.writeUInt8(32, 1); // height
  dir1.writeUInt8(0, 2);  // color palette
  dir1.writeUInt8(0, 3);  // reserved
  dir1.writeUInt16LE(1, 4); // color planes
  dir1.writeUInt16LE(32, 6); // bpp
  dir1.writeUInt32LE(png32Buffer.length, 8); // size
  dir1.writeUInt32LE(imageOffset1, 12); // offset

  const dir2 = Buffer.alloc(16);
  dir2.writeUInt8(48, 0); // width
  dir2.writeUInt8(48, 1); // height
  dir2.writeUInt8(0, 2);  // color palette
  dir2.writeUInt8(0, 3);  // reserved
  dir2.writeUInt16LE(1, 4); // color planes
  dir2.writeUInt16LE(32, 6); // bpp
  dir2.writeUInt32LE(png48Buffer.length, 8); // size
  dir2.writeUInt32LE(imageOffset2, 12); // offset

  const icoBuffer = Buffer.concat([header, dir1, dir2, png32Buffer, png48Buffer]);
  fs.writeFileSync('src/app/favicon.ico', icoBuffer);
  fs.writeFileSync('public/favicon.ico', icoBuffer);
  console.log('✓ Written src/app/favicon.ico and public/favicon.ico');

  await browser.close();
}

generatePngAndIco().catch(console.error);
