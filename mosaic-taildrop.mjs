import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import path from 'path';

const INPUT = path.resolve('./baseidea/taildrop_ss.png');
const OUTPUT = './images/remote-dev/taildrop-gui.png';

// Read image as base64
const imgBase64 = readFileSync(INPUT).toString('base64');
const imgDataUri = `data:image/png;base64,${imgBase64}`;

// Image is 2060 x 1010 pixels
// Personal info regions to mask (x, y, width, height in original pixels)
const regions = [
  // Left panel - device list
  { x: 490, y: 248, w: 230, h: 48 },   // 1. Name "大谷剛弘"
  { x: 505, y: 296, w: 330, h: 44 },   // 2. "otani-macbook-pro" + icon
  { x: 505, y: 340, w: 260, h: 38 },   // 3. IP "100.86.201.47"
  { x: 505, y: 384, w: 210, h: 44 },   // 4. "iphone171"
  { x: 505, y: 428, w: 270, h: 38 },   // 5. IP "100.101.190.18"
  { x: 495, y: 496, w: 290, h: 40 },   // 6. IP in blue row "100.111.207.49"
  // Right panel - device details
  { x: 1150, y: 262, w: 520, h: 55 },  // 7. MagicDNS hostname + label
  { x: 1150, y: 400, w: 310, h: 48 },  // 8. IPv4 "100.111.207.49"
  { x: 1150, y: 500, w: 420, h: 48 },  // 9. IPv6 "fd7a:115c:a1e0::da01:cfa7"
];

function buildHTML() {
  const overlays = regions.map(r => `
    <div style="
      position: absolute;
      left: ${r.x}px; top: ${r.y}px;
      width: ${r.w}px; height: ${r.h}px;
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      background: rgba(210, 210, 210, 0.6);
      border-radius: 6px;
    "></div>
  `).join('\n');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; }
  body { background: #f0f0f0; line-height: 0; }
  .container {
    position: relative;
    display: inline-block;
    width: 2060px;
    height: 1010px;
  }
  .container img {
    display: block;
    width: 2060px;
    height: 1010px;
  }
</style></head>
<body>
  <div class="container">
    <img src="${imgDataUri}" />
    ${overlays}
  </div>
</body></html>`;
}

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 2060, height: 1010, deviceScaleFactor: 1 });
  await page.setContent(buildHTML(), { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({
    path: OUTPUT,
    clip: { x: 0, y: 0, width: 2060, height: 1010 },
  });

  console.log(`Saved: ${OUTPUT}`);
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
