const fs = require('fs');
const path = require('path');

const htmlPath = process.argv[2] || 'C:/Users/pc/Desktop/1/index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const match = html.match(/<script id="main-script"[^>]*>([\s\S]*?)<\/script>/);
if (!match) {
  console.error('main-script not found');
  process.exit(1);
}

const { JSDOM } = require('jsdom');
const dom = new JSDOM(
  `<!DOCTYPE html><html><body>
    <div id="initial-loader">
      <div class="circle-loading"></div>
      <div class="svg-loading"></div>
    </div>
    <div id="svg-loading-container" class="svg-loading"></div>
  </body></html>`,
  { url: 'http://localhost/', pretendToBeVisual: true },
);

const { window } = dom;
global.window = window;
global.document = window.document;
global.navigator = window.navigator;
global.location = window.location;
global.confirm = () => false;
global.gtag = () => {};
global.dataLayer = [];
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = clearTimeout;

try {
  eval(match[1]);
} catch (e) {
  console.error('eval error:', e.message);
  process.exit(1);
}

setTimeout(() => {
  const container = document.getElementById('svg-loading-container');
  const svg = document.querySelector('svg');
  const outDir = path.join(__dirname, '../client-app/public/images/games/mahjong/pg/ui');
  fs.mkdirSync(outDir, { recursive: true });
  if (svg) {
    fs.writeFileSync(path.join(outDir, 'pg-initial-loader.svg'), svg.outerHTML);
    console.log('wrote svg', svg.outerHTML.length, 'bytes');
  } else {
    console.log('no svg, container html:', container ? container.innerHTML.slice(0, 300) : 'null');
  }
  process.exit(0);
}, 800);
