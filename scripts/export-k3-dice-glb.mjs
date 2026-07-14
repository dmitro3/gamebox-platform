/**
 * 导出 kuai3 标准骰子 GLB 模型（六面 AI 贴图）
 * 用法: node scripts/export-k3-dice-glb.mjs
 * 输出: games-assets/kuai3/assets/dice/kuai3-dice.glb
 */
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FACES = join(ROOT, 'games-assets/kuai3/assets/dice/faces');
const OUT = join(ROOT, 'games-assets/kuai3/assets/dice/kuai3-dice.glb');

async function main() {
  const { default: THREE } = await import('three');
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const { TextureLoader } = THREE;

  const loader = new TextureLoader();
  const faceOrder = [3, 4, 1, 6, 2, 5];
  const materials = await Promise.all(faceOrder.map(async (n) => {
    const path = join(FACES, `face-${String(n).padStart(2, '0')}.png`);
    if (!existsSync(path)) throw new Error('missing ' + path);
    const buf = readFileSync(path);
    const blob = new Blob([buf]);
    const url = URL.createObjectURL(blob);
    const tex = await new Promise((res, rej) => loader.load(url, res, undefined, rej));
    tex.encoding = THREE.sRGBEncoding;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.12 });
  }));

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1, 8, 8, 8), materials);
  mesh.name = 'Kuai3Dice';
  const scene = new THREE.Scene();
  scene.add(mesh);

  const exporter = new GLTFExporter();
  const arrayBuffer = await new Promise((resolve, reject) => {
    exporter.parse(scene, resolve, reject, { binary: true });
  });

  mkdirSync(dirname(OUT), { recursive: true });
  await import('node:fs/promises').then(fs => fs.writeFile(OUT, Buffer.from(arrayBuffer)));
  console.log('wrote', OUT);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
