import puppeteer from 'puppeteer';
import { readFileSync, mkdirSync } from 'fs';

mkdirSync('./images/remote-control-fix', { recursive: true });

const imgPath = './baseidea/discordsetup/claude_error.png';
const imgBase64 = readFileSync(imgPath).toString('base64');
const dataUri = `data:image/png;base64,${imgBase64}`;

const W = 587;
const H = 791;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #000; }
  .container { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }
  .container img { display: block; width: 100%; height: 100%; }
  .mask {
    position: absolute;
    background: #1e1e2e;
    z-index: 10;
  }
</style></head><body>
  <div class="container">
    <img src="${dataUri}" />
    <!-- Token line 1: cover from "MTQ4" to right edge -->
    <div class="mask" style="left: 210px; top: 272px; width: 500px; height: 32px;"></div>
    <!-- Token line 2: "vnOZUG3v-1PWY_91BjrfvVHnBc9s1LuYUwk8M" -->
    <div class="mask" style="left: 14px; top: 296px; width: 500px; height: 30px;"></div>
  </div>
</body></html>`;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 500));
await page.screenshot({
  path: './images/remote-control-fix/claude_error_masked.png',
  fullPage: true,
});
console.log('Captured: claude_error_masked.png');
await browser.close();
