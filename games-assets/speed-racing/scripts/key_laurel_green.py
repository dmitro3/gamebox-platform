"""绿幕桂冠 PNG 自动抠图 — 比 PS 手动选色更干净。

用法:
  python key_laurel_green.py

输入: assets/result/laurel-*-green.png
输出: assets/result/laurel-gold.png / laurel-silver.png / laurel-bronze.png
"""
from __future__ import annotations

import math
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'result'
PAIRS = (
    ('laurel-gold-green.png', 'laurel-gold.png'),
    ('laurel-silver-green.png', 'laurel-silver.png'),
    ('laurel-bronze-green.png', 'laurel-bronze.png'),
)

# 从绿幕图四角采样得到的典型背景色
SCREEN = (16, 242, 14)


def greenness(r: int, g: int, b: int) -> float:
    """越大越像绿幕。"""
    return g - max(r, b)


def screen_dist(r: int, g: int, b: int) -> float:
    dr, dg, db = r - SCREEN[0], g - SCREEN[1], b - SCREEN[2]
    return math.sqrt(dr * dr + dg * dg + db * db)


def key_green(im: Image.Image) -> Image.Image:
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    out = Image.new('RGBA', (w, h))
    opx = out.load()

    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            gn = greenness(r, g, b)
            dist = screen_dist(r, g, b)

            # 硬绿幕：直接透明
            if gn >= 48 or (gn >= 32 and dist <= 90):
                opx[x, y] = (0, 0, 0, 0)
                continue

            # 软边缘：按绿度渐变 alpha
            if gn >= 18 or dist <= 130:
                t = min(1.0, max(gn / 48.0, 1.0 - dist / 130.0))
                alpha = int(255 * (1.0 - t))
                if alpha <= 8:
                    opx[x, y] = (0, 0, 0, 0)
                    continue
                # 绿边溢色：压绿、略提 R/B
                spill = max(0, g - max(r, b) - 8)
                r = max(0, min(255, r + spill // 3))
                b = max(0, min(255, b + spill // 4))
                g = max(r, min(g, g - spill // 2))
                opx[x, y] = (r, g, b, alpha)
                continue

            opx[x, y] = (r, g, b, 255)

    return out


def flood_clean_green(im: Image.Image) -> Image.Image:
    """从四边 flood 剩余绿幕孤岛（如文字内小孔误留）。"""
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    bg = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def is_bg(r: int, g: int, b: int, a: int) -> bool:
        if a < 20:
            return True
        return greenness(r, g, b) >= 28 or screen_dist(r, g, b) <= 70

    def push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h or bg[y][x]:
            return
        r, g, b, a = px[x, y]
        if is_bg(r, g, b, a):
            bg[y][x] = True
            q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)
    while q:
        x, y = q.popleft()
        push(x - 1, y)
        push(x + 1, y)
        push(x, y - 1)
        push(x, y + 1)
    for y in range(h):
        for x in range(w):
            if bg[y][x]:
                px[x, y] = (0, 0, 0, 0)
    return im


def defringe_green(im: Image.Image, passes: int = 5) -> Image.Image:
    """去掉贴边残留绿/灰像素。"""
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    for _ in range(passes):
        kill: list[tuple[int, int]] = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a < 16:
                    continue
                if greenness(r, g, b) >= 22:
                    kill.append((x, y))
                    continue
                if abs(r - g) <= 8 and abs(g - b) <= 8 and 160 <= r <= 245:
                    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] < 16:
                            kill.append((x, y))
                            break
        for x, y in kill:
            px[x, y] = (0, 0, 0, 0)
    return im


def trim(im: Image.Image, pad: int = 6) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def process(im: Image.Image) -> Image.Image:
    im = key_green(im)
    im = flood_clean_green(im)
    im = defringe_green(im)
    return trim(im)


def main() -> None:
    for src_name, dst_name in PAIRS:
        src = ROOT / src_name
        if not src.exists():
            print('skip (missing)', src_name)
            continue
        out = process(Image.open(src))
        out.save(ROOT / dst_name, 'PNG', optimize=True)
        print('OK', dst_name, out.size)


if __name__ == '__main__':
    main()
