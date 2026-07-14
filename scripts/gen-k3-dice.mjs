/**
 * 1分快三 · 俯视立体骰子 SVG
 * 顶面占主体，侧面仅露出约一半厚度（ steep top-down ）
 * 用法: node scripts/gen-k3-dice.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../games-assets/kuai3/assets/dice');

const ISO_SIDES = {
  1: { left: 4, right: 2 },
  2: { left: 1, right: 3 },
  3: { left: 2, right: 6 },
  4: { left: 5, right: 1 },
  5: { left: 4, right: 3 },
  6: { left: 2, right: 5 },
};

const PIP = {
  1: [[0.5, 0.5]],
  2: [[0.32, 0.32], [0.68, 0.68]],
  3: [[0.32, 0.32], [0.5, 0.5], [0.68, 0.68]],
  4: [[0.32, 0.32], [0.68, 0.32], [0.32, 0.68], [0.68, 0.68]],
  5: [[0.32, 0.32], [0.68, 0.32], [0.5, 0.5], [0.32, 0.68], [0.68, 0.68]],
  6: [[0.32, 0.28], [0.32, 0.5], [0.32, 0.72], [0.68, 0.28], [0.68, 0.5], [0.68, 0.72]],
};

/*  steep top-down：顶面占 ~88%，侧面仅露出约半条边  */
const TOP = [[64, 6], [116, 44], [64, 86], [12, 44]];
const LEFT = [[12, 44], [64, 86], [64, 98], [12, 56]];
const RIGHT = [[64, 86], [116, 44], [116, 56], [64, 98]];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function quadMap(u, v, quad) {
  const [p0, p1, p2, p3] = quad;
  const x = lerp(lerp(p0[0], p1[0], u), lerp(p3[0], p2[0], u), v);
  const y = lerp(lerp(p0[1], p1[1], u), lerp(p3[1], p2[1], u), v);
  return [x, y];
}

function pipRed(n) {
  return n === 1 || n === 4;
}

function pipDot(x, y, r, red, uid) {
  const fill = red ? '#c41e3a' : '#1a1410';
  return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}" fill="${fill}" filter="url(#pip${uid})"/>`;
}

function sidePips(n, quad, r, uid) {
  return PIP[n]
    .filter(([, v]) => v <= 0.58)
    .map(([u, v]) => {
      const vv = v / 0.58;
      const [x, y] = quadMap(u, vv, quad);
      return pipDot(x, y, r * 0.88, pipRed(n), uid);
    }).join('\n    ');
}

function topPips(n, quad, r, uid) {
  return PIP[n].map(([u, v]) => {
    const [x, y] = quadMap(u, v, quad);
    return pipDot(x, y, r, pipRed(n), uid);
  }).join('\n    ');
}

function poly(gradKey, points, strokeColor, uid, sw) {
  const pts = points.map(p => p.join(',')).join(' ');
  return `<polygon points="${pts}" fill="url(#${gradKey}${uid})" stroke="${strokeColor}" stroke-width="${sw || 1}" stroke-linejoin="round"/>`;
}

function isoDiceSvg(topN) {
  const sides = ISO_SIDES[topN];
  const uid = topN;
  const topPts = TOP.map(p => p.join(',')).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 112" width="128" height="112">
  <defs>
    <linearGradient id="top${uid}" x1="20%" y1="8%" x2="85%" y2="92%">
      <stop offset="0%" stop-color="#fffdf8"/>
      <stop offset="35%" stop-color="#faf0dc"/>
      <stop offset="100%" stop-color="#e6d4ae"/>
    </linearGradient>
    <linearGradient id="left${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#efe3c8"/>
      <stop offset="100%" stop-color="#b8944a"/>
    </linearGradient>
    <linearGradient id="right${uid}" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e8d8b4"/>
      <stop offset="100%" stop-color="#9a7428"/>
    </linearGradient>
    <filter id="pip${uid}" x="-100%" y="-100%" width="300%" height="300%">
      <feDropShadow dx="0" dy="1" stdDeviation="0.7" flood-color="#000" flood-opacity="0.4"/>
    </filter>
    <filter id="drop${uid}" x="-20%" y="-15%" width="140%" height="145%">
      <feDropShadow dx="0" dy="4" stdDeviation="3.5" flood-color="#000" flood-opacity="0.45"/>
    </filter>
    <radialGradient id="glint${uid}" cx="42%" cy="32%" r="48%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="#fff" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="clipTop${uid}"><polygon points="${topPts}"/></clipPath>
  </defs>
  <ellipse cx="64" cy="106" rx="38" ry="5.5" fill="rgba(0,0,0,0.22)"/>
  <g filter="url(#drop${uid})">
    ${poly('left', LEFT, 'rgba(90,62,22,0.5)', uid)}
    ${poly('right', RIGHT, 'rgba(75,52,18,0.55)', uid)}
    ${poly('top', TOP, 'rgba(210,175,70,0.7)', uid, 1.2)}
    <polygon points="${topPts}" fill="url(#glint${uid})" stroke="none"/>
    ${sidePips(sides.left, LEFT, 4.5, uid)}
    ${sidePips(sides.right, RIGHT, 4.5, uid)}
    <g clip-path="url(#clipTop${uid})">
      ${topPips(topN, TOP, 6.2, uid)}
    </g>
  </g>
</svg>`;
}

function flatDiceSvg(n) {
  const edgeH = 7;
  const pips = PIP[n].map(([u, v]) => {
    const x = 14 + u * 72;
    const y = 10 + v * 68;
    const fill = pipRed(n) ? '#c41e3a' : '#1a1410';
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.8" fill="${fill}"/>`;
  }).join('\n    ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="ft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffaf0"/><stop offset="100%" stop-color="#e8d8b8"/>
    </linearGradient>
    <linearGradient id="fe" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#dcc9a0"/><stop offset="100%" stop-color="#a8842a"/>
    </linearGradient>
    <filter id="fd"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.42"/></filter>
  </defs>
  <g filter="url(#fd)">
    <rect x="8" y="${86 - edgeH}" width="84" height="${edgeH + 4}" rx="4" fill="url(#fe)"/>
    <rect x="8" y="8" width="84" height="78" rx="13" fill="url(#ft)" stroke="#d4af37" stroke-width="1.1"/>
    ${pips}
  </g>
</svg>`;
}

mkdirSync(OUT, { recursive: true });
for (let n = 1; n <= 6; n++) {
  const pad = String(n).padStart(2, '0');
  writeFileSync(join(OUT, `dice-${pad}.svg`), isoDiceSvg(n), 'utf8');
  writeFileSync(join(OUT, `dice-flat-${pad}.svg`), flatDiceSvg(n), 'utf8');
  console.log('wrote dice-' + pad + '.svg');
}
