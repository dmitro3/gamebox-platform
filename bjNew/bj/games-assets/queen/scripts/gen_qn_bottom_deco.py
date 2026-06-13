# -*- coding: utf-8
"""赏金女王 · 程序化绘制底部装饰条"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from qn_draw_common import W, draw_rope, wood_gradient

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
DECO_W, DECO_H = 1536, 360


def draw_knot(d: ImageDraw.ImageDraw, cx: int, cy: int):
    r = 14
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(210, 170, 90), width=2)
    d.arc((cx - r - 3, cy - 5, cx - 2, cy + 7), 200, 340, fill=(210, 170, 90), width=2)
    d.arc((cx + 2, cy - 5, cx + r + 3, cy + 7), 200, 340, fill=(210, 170, 90), width=2)


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    wood = wood_gradient(DECO_W, DECO_H, (88, 48, 28), (72, 38, 22), (58, 30, 18))
    d = ImageDraw.Draw(wood)
    d.line([(0, 0), (DECO_W, 0)], fill=(180, 140, 80), width=3)

    # 消息条区域
    mx = 80
    d.rounded_rectangle((mx, 28, DECO_W - mx, 130), radius=10, fill=(48, 18, 38), outline=(180, 140, 70), width=3)
    draw_knot(d, mx + 24, 78)
    draw_knot(d, DECO_W - mx - 24, 78)

    # 三统计槽
    sy0, sy1 = 168, 320
    sw = (DECO_W - 120) // 3
    for i in range(3):
        x0 = 60 + i * sw
        d.rounded_rectangle((x0 + 8, sy0, x0 + sw - 8, sy1), radius=999,
                            fill=(32, 18, 12), outline=(110, 75, 42), width=2)
        d.rounded_rectangle((x0 + 14, sy0 + 6, x0 + sw - 14, sy1 - 6), radius=999,
                            outline=(180, 140, 80), width=1)

    draw_rope(d, 40, 150, DECO_W - 40, 150, width=4)
    wood = wood.filter(ImageFilter.GaussianBlur(0.4))
    wood.save(ASSETS / 'bottom-deco.png', 'PNG', optimize=True)
    print('OK bottom-deco', wood.size)


if __name__ == '__main__':
    main()
