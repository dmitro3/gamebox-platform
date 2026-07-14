"""从赛车母版实测牌照中心/宽高，供 result-card.js / build_result_assets.py 对齐。"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from build_result_assets import build_plate_mask

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'result'


def main() -> None:
    for prefix in ('race-car-front', 'race-car-side'):
        m = Image.open(ROOT / f'{prefix}-master.png')
        w, h = m.size
        mask = build_plate_mask(m, prefix)
        mpx = mask.load()
        xs = [x for y in range(h) for x in range(w) if mpx[x, y] > 128]
        ys = [y for y in range(h) for x in range(w) if mpx[x, y] > 128]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        cx, cy = (x0 + x1) / 2 / w, (y0 + y1) / 2 / h
        pw, ph = (x1 - x0 + 1) / w, (y1 - y0 + 1) / h
        print(prefix, f'cx={cx:.4f} cy={cy:.4f} pw={pw:.4f} ph={ph:.4f}')


if __name__ == '__main__':
    main()
