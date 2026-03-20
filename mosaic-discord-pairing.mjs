import puppeteer from 'puppeteer';
import { readFileSync, mkdirSync } from 'fs';

mkdirSync('./images/discord-channels', { recursive: true });

const imgPath = './baseidea/discordsetup/スクリーンショット 2026-03-20 13.14.12.png';
const imgBase64 = readFileSync(imgPath).toString('base64');
const dataUri = `data:image/png;base64,${imgBase64}`;

// Regions to blur (security-sensitive info)
const regions = [
  // Pairing code "c0116f" in bot message
  { x: 200, y: 1040, w: 280, h: 50 },
];

const overlays = regions.map(r => `
  <div style="
    position: absolute;
    left: ${r.x}px; top: ${r.y}px;
    width: ${r.w}px; height: ${r.h}px;
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    background: rgba(80, 80, 80, 0.6);
    border-radius: 4px;
  "></div>
`).join('\n');

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; }
  body { background: #000; }
  .container { position: relative; display: inline-block; }
  .container img { display: block; width: 2102px; height: 1692px; }
</style></head><body>
  <div class="container">
    <img src="${dataUri}" />
    ${overlays}
  </div>
</body></html>`;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 2102, height: 1692, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 500));
await page.screenshot({
  path: './images/discord-channels/discord-pairing.png',
  fullPage: true,
});
console.log('Captured: discord-pairing.png');
await browser.close();
