import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const require = createRequire(path.join(rootDir, 'apps', 'web', 'package.json'));
const { chromium } = require('@playwright/test');
const webPublicDir = path.join(rootDir, 'apps', 'web', 'public');
const iconsDir = path.join(webPublicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Definition of Variation 3.B Sovereign Shield Icon (512x512)
const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1e40af" />
    </linearGradient>
    <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="shieldShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#1e40af" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Outer Squircle Shield with Rich Royal Gradient -->
  <rect x="40" y="40" width="432" height="432" rx="122" fill="url(#shieldGrad)" filter="url(#shieldShadow)" />
  <!-- Subtle inner border highlight -->
  <rect x="42" y="42" width="428" height="428" rx="120" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="0.18" />

  <!-- Mortarboard Diamond Top in Pure Crisp White -->
  <path d="M256 128 L102 205 L256 282 L410 205 Z" fill="#ffffff" />

  <!-- Mortarboard Lower Neck & Arch -->
  <path d="M154 240 V318 C154 343 197 369 256 369 C315 369 358 343 358 318 V240"
        stroke="#ffffff"
        stroke-width="26"
        stroke-linecap="round"
        fill="none" />

  <!-- Tassel with Soft Blue Drape & Golden Droplet -->
  <path d="M400 210 V307 C400 315 392 323 384 323"
        stroke="#93c5fd"
        stroke-width="15"
        stroke-linecap="round"
        fill="none" />
  <circle cx="384" cy="323" r="18" fill="url(#sparkGrad)" />

  <!-- Golden Guidance Star / Spark on Top Cap -->
  <path d="M256 179 L269 202 L292 207 L274 223 L279 246 L256 233 L233 246 L238 223 L220 207 L243 202 Z"
        fill="url(#sparkGrad)" />
</svg>`;

// 2. Definition of Maskable SVG (Full-bleed royal blue background with centered emblem)
const iconMaskableSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="maskableBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1e40af" />
    </linearGradient>
    <linearGradient id="sparkGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>

  <!-- Full-bleed background for adaptive Android launcher cropping -->
  <rect width="512" height="512" fill="url(#maskableBg)" />

  <!-- Centered Emblem (scaled 0.78x inside safe zone) -->
  <g transform="translate(56, 56) scale(0.78)">
    <!-- Mortarboard Diamond Top -->
    <path d="M256 128 L102 205 L256 282 L410 205 Z" fill="#ffffff" />

    <!-- Mortarboard Lower Neck & Arch -->
    <path d="M154 240 V318 C154 343 197 369 256 369 C315 369 358 343 358 318 V240"
          stroke="#ffffff"
          stroke-width="26"
          stroke-linecap="round"
          fill="none" />

    <!-- Tassel with Soft Blue Drape & Golden Droplet -->
    <path d="M400 210 V307 C400 315 392 323 384 323"
          stroke="#93c5fd"
          stroke-width="15"
          stroke-linecap="round"
          fill="none" />
    <circle cx="384" cy="323" r="18" fill="url(#sparkGradM)" />

    <!-- Golden Guidance Star / Spark -->
    <path d="M256 179 L269 202 L292 207 L274 223 L279 246 L256 233 L233 246 L238 223 L220 207 L243 202 Z"
          fill="url(#sparkGradM)" />
  </g>
</svg>`;

// 3. Definition of Favicon SVG (Scales down seamlessly from 16px to 64px)
const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <linearGradient id="favShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1e40af" />
    </linearGradient>
    <linearGradient id="favSparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>

  <rect x="8" y="8" width="84" height="84" rx="24" fill="url(#favShieldGrad)" />
  <path d="M50 25L20 40L50 55L80 40L50 25Z" fill="#ffffff" />
  <path d="M30 47V62C30 67 38.5 72 50 72C61.5 72 70 67 70 62V47" stroke="#ffffff" stroke-width="5" stroke-linecap="round" fill="none" />
  <path d="M78 41V60C78 61.5 76.5 63 75 63" stroke="#93c5fd" stroke-width="3" stroke-linecap="round" fill="none" />
  <circle cx="75" cy="63" r="3.5" fill="url(#favSparkGrad)" />
  <path d="M50 35L52.5 39.5L57 40.5L53.5 43.5L54.5 48L50 45.5L45.5 48L46.5 43.5L43 40.5L47.5 39.5L50 35Z" fill="url(#favSparkGrad)" />
</svg>`;

// 4. Definition of Full Horizontal Vector Logo ("Ogroni" ONLY - no "Edu")
const logoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80">
  <defs>
    <linearGradient id="logoShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1e40af" />
    </linearGradient>
    <linearGradient id="logoSparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>

  <!-- Left Sovereign Shield Emblem (64x64 at x=8, y=8) -->
  <g transform="translate(8, 8)">
    <rect x="0" y="0" width="64" height="64" rx="18" fill="url(#logoShieldGrad)" />
    <path d="M32 16L12 26L32 36L52 26L32 16Z" fill="#ffffff" />
    <path d="M19 30V40C19 43.5 24.5 47 32 47C39.5 47 45 43.5 45 40V30" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" fill="none" />
    <path d="M50 26.5V39C50 40 49 41 48 41" stroke="#93c5fd" stroke-width="2" stroke-linecap="round" fill="none" />
    <circle cx="48" cy="41" r="2.2" fill="url(#logoSparkGrad)" />
    <path d="M32 23L33.5 25.8L36.5 26.5L34.2 28.5L34.8 31.5L32 30L29.2 31.5L29.8 28.5L27.5 26.5L30.5 25.8L32 23Z" fill="url(#logoSparkGrad)" />
  </g>

  <!-- Typography: "Ogroni" ONLY -->
  <text x="88" y="52"
        font-family="'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="40"
        font-weight="900"
        letter-spacing="-1.5"
        fill="#0f172a">Ogroni</text>
</svg>`;

// Helper to create a binary .ico file containing PNG buffer(s)
function createIco(images) {
  // images: array of { width, height, buffer }
  const count = images.length;
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + count * entrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4); // number of images

  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // image size in bytes
    entry.writeUInt32LE(offset, 12); // image offset from beginning
    entries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((img) => img.buffer)]);
}

async function main() {
  console.log('Writing vector SVGs...');
  // 1. Write SVGs
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), iconSvg, 'utf8');
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable.svg'), iconMaskableSvg, 'utf8');
  fs.writeFileSync(path.join(iconsDir, 'logo.svg'), logoSvg, 'utf8');
  fs.writeFileSync(path.join(webPublicDir, 'favicon.svg'), faviconSvg, 'utf8');

  console.log('Launching Playwright Chromium for PNG rasterization...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Helper to render an SVG string at specific dimensions
  async function renderSvgToPng(svgContent, width, height) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: ${width}px; height: ${height}px; background: transparent; overflow: hidden; }
          svg { width: 100%; height: 100%; display: block; }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
      </html>
    `;
    await page.setViewportSize({ width, height });
    await page.setContent(html, { waitUntil: 'networkidle' });
    return await page.screenshot({ omitBackground: true, type: 'png' });
  }

  console.log('Rendering icon-512.png (512x512)...');
  const png512 = await renderSvgToPng(iconSvg, 512, 512);
  fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);

  console.log('Rendering icon-maskable-512.png (512x512)...');
  const pngMaskable512 = await renderSvgToPng(iconMaskableSvg, 512, 512);
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), pngMaskable512);

  console.log('Rendering icon-192.png (192x192)...');
  const png192 = await renderSvgToPng(iconSvg, 192, 192);
  fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);

  console.log('Rendering apple-touch-icon.png (180x180)...');
  const png180 = await renderSvgToPng(iconSvg, 180, 180);
  fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), png180);

  console.log('Rendering favicon-32.png (32x32)...');
  const png32 = await renderSvgToPng(faviconSvg, 32, 32);
  fs.writeFileSync(path.join(iconsDir, 'favicon-32.png'), png32);

  console.log('Rendering favicon-16.png (16x16)...');
  const png16 = await renderSvgToPng(faviconSvg, 16, 16);
  fs.writeFileSync(path.join(iconsDir, 'favicon-16.png'), png16);

  console.log('Creating multi-resolution favicon.ico...');
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
  ]);
  fs.writeFileSync(path.join(webPublicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(iconsDir, 'favicon.ico'), icoBuffer);

  await browser.close();
  console.log('✅ All Ogroni brand assets generated successfully!');
}

main().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
