/**
 * SVG 骰子 → result 目录 PNG（透明底）
 * 用法: node scripts/rasterize-k3-dice.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DICE = join(ROOT, 'games-assets/kuai3/assets/dice');
const OUT = join(ROOT, 'games-assets/kuai3/assets/result');

function resvg(svg, png, w, h) {
  const args = [svg, '-o', png, '-w', String(w)];
  if (h) args.push('-h', String(h));
  execFileSync('npx', ['--yes', '@resvg/resvg-js-cli', ...args], {
    stdio: 'inherit',
    shell: true,
  });
}

for (let n = 1; n <= 6; n++) {
  const pad = String(n).padStart(2, '0');
  const iso = join(DICE, `dice-${pad}.svg`);
  const flat = join(DICE, `dice-flat-${pad}.svg`);
  if (!existsSync(iso) || !existsSync(flat)) {
    throw new Error(`missing ${iso} — run node scripts/gen-k3-dice.mjs first`);
  }
  resvg(iso, join(OUT, `dice-${pad}.png`), 512);
  resvg(flat, join(OUT, `icon-${pad}.png`), 256, 256);
  console.log(`exported dice-${pad}.png + icon-${pad}.png`);
}
