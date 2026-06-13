# -*- coding: utf-8
"""赏金女王 · 程序化绘制顶栏（海盗女王 + 四门炮筒倍数槽）"""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from qn_draw_common import W, load_font, lerp_rgb, mult_overlay_layout, sunset_gradient

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
HEADER_H = 520


def draw_pirate_queen(d: ImageDraw.ImageDraw, cx: int, cy: int):
    # 船舵
    r = 78
    d.ellipse((cx - r, cy - r + 20, cx + r, cy + r + 20), fill=(120, 75, 40), outline=(200, 160, 80), width=4)
    for ang in range(0, 360, 45):
        rad = math.radians(ang)
        x2 = cx + math.cos(rad) * (r - 12)
        y2 = cy + 20 + math.sin(rad) * (r - 12)
        d.line([(cx, cy + 20), (x2, y2)], fill=(180, 130, 70), width=8)
    d.ellipse((cx - 18, cy + 2, cx + 18, cy + 38), fill=(90, 55, 30), outline=(160, 120, 60), width=2)
    # 身体
    d.rounded_rectangle((cx - 55, cy - 60, cx + 55, cy + 30), radius=20, fill=(60, 30, 80), outline=(120, 80, 140), width=2)
    # 头
    d.ellipse((cx - 42, cy - 130, cx + 42, cy - 46), fill=(240, 190, 155))
    # 红发
    d.arc((cx - 50, cy - 120, cx + 50, cy - 40), 200, 340, fill=(190, 45, 35), width=16)
    # 海盗帽
    d.polygon([(cx, cy - 168), (cx - 48, cy - 118), (cx + 48, cy - 118)], fill=(35, 22, 15))
    d.ellipse((cx - 32, cy - 138, cx + 32, cy - 108), fill=(45, 28, 18))
    d.ellipse((cx - 10, cy - 128, cx + 10, cy - 108), fill=(220, 185, 60))
    # 眼罩
    d.arc((cx - 28, cy - 108, cx + 8, cy - 82), 200, 340, fill=(25, 15, 10), width=7)
    d.line([(cx + 8, cy - 95), (cx + 32, cy - 102)], fill=(25, 15, 10), width=4)
    # 枪
    d.polygon([(cx + 50, cy - 70), (cx + 110, cy - 50), (cx + 100, cy - 38), (cx + 48, cy - 52)], fill=(210, 170, 55))


def draw_cannon(d: ImageDraw.ImageDraw, cx: int, cy: int, w: int, h: int):
    d.rounded_rectangle((cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2), radius=12,
                        fill=(55, 35, 25), outline=(100, 65, 40), width=3)
    d.rounded_rectangle((cx - w // 2 + 6, cy - h // 2 + 6, cx + w // 2 - 6, cy + h // 2 - 6), radius=8,
                        outline=(180, 140, 70), width=2)
    d.ellipse((cx - 22, cy - 8, cx + 22, cy + 28), fill=(70, 45, 30), outline=(110, 75, 45), width=2)
    font = load_font(26, True)
    for label in ('x1', 'x2', 'x3', 'x5'):
        pass  # labels drawn by UI overlay


def build_header() -> Image.Image:
    img = sunset_gradient(W, HEADER_H).convert('RGBA')
    d = ImageDraw.Draw(img)
    draw_pirate_queen(d, W // 2, HEADER_H // 2 + 40)

    slot_w, slot_h = 118, 72
    gap = (W - slot_w * 4) // 5
    x = gap + slot_w // 2
    cy = HEADER_H - 58
    for _ in range(4):
        draw_cannon(d, x, cy, slot_w, slot_h)
        x += slot_w + gap

    return img.convert('RGB').filter(ImageFilter.GaussianBlur(0.3))


def export_slots():
    layouts = mult_overlay_layout()
    slots = []
    for i, label in enumerate(('x1', 'x2', 'x3', 'x5')):
        lay = layouts[i]
        slots.append({'label': label, 'goldOverlay': lay})
    data = {'size': [W, HEADER_H], 'slots': slots}
    (ASSETS / 'top-header-slots.json').write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8'
    )


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    build_header().save(ASSETS / 'top-header.png', 'PNG', optimize=True)
    export_slots()
    print('OK top-header', (W, HEADER_H))


if __name__ == '__main__':
    main()
