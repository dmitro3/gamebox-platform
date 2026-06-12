# -*- coding: utf-8 -*-
"""赏金女王 · 程序化绘制竖屏背景"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from qn_draw_common import (
    W, H, ZONE,
    add_vignette, draw_coin_icon, draw_rope, export_layout_css,
    load_font, lerp_rgb, sunset_gradient, wood_gradient,
)

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'


def draw_top_banner(base: Image.Image):
    y0, h = ZONE['banner_y'], ZONE['banner_h']
    strip = Image.new('RGBA', (W, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(strip)
    for y in range(h):
        t = y / max(h - 1, 1)
        c = lerp_rgb((72, 28, 68), (48, 18, 42), t)
        d.line([(0, y), (W, y)], fill=(*c, 255))
    d.rounded_rectangle((10, 6, W - 10, h - 6), radius=8, outline=(200, 150, 80), width=2)
    font = load_font(34, True)
    text = '8888 路赏金组合'
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (W - tw) // 2
    ty = (h - th) // 2 - 2
    draw_coin_icon(d, tx - 38, ty + th // 2 + 1, 14)
    draw_coin_icon(d, tx + tw + 38, ty + th // 2 + 1, 14)
    d.text((tx + 1, ty + 1), text, fill=(30, 8, 20), font=font)
    d.text((tx, ty), text, fill=(255, 210, 120), font=font)
    base.paste(strip, (0, y0), strip)


def draw_sky_header(base: Image.Image):
    y0, h = ZONE['head_y'], ZONE['head_h']
    sky = sunset_gradient(W, h)
    d = ImageDraw.Draw(sky)
    # 海平线
    d.rectangle((0, h - 80, W, h), fill=(40, 60, 100))
    for i in range(5):
        y = h - 75 + i * 8
        d.arc((-80 + i * 30, y - 20, W + 80 - i * 30, y + 40), 0, 180, fill=(55 + i * 8, 75 + i * 6, 115), width=2)
    # 船帆剪影
    d.polygon([(W - 120, h - 200), (W - 40, h - 200), (W - 80, h - 60)], fill=(30, 18, 12))
    d.rectangle((W - 86, h - 60, W - 74, h - 20), fill=(50, 32, 20))
    base.paste(sky, (0, y0))


def draw_reel_frame(base: Image.Image):
    y0 = ZONE['body_y']
    h = ZONE['mid_h']
    deck = wood_gradient(W, h, (98, 58, 38), (78, 44, 28), (62, 34, 22))
    d = ImageDraw.Draw(deck)
    mx, my = 48, 36
    fw, fh = W - mx * 2, h - my * 2
    d.rounded_rectangle((mx, my, mx + fw, my + fh), radius=16, fill=(42, 24, 16), outline=(140, 95, 50), width=4)
    d.rounded_rectangle((mx + 8, my + 8, mx + fw - 8, my + fh - 8), radius=12, outline=(200, 160, 90), width=2)
    draw_rope(d, mx + 4, my + 4, mx + fw - 4, my + 4)
    draw_rope(d, mx + 4, my + fh - 4, mx + fw - 4, my + fh - 4)
    draw_rope(d, mx + 4, my + 4, mx + 4, my + fh - 4)
    draw_rope(d, mx + fw - 4, my + 4, mx + fw - 4, my + fh - 4)
    # 5 列分隔
    col_w = (fw - 16) / 5
    for i in range(1, 5):
        x = mx + 8 + col_w * i
        d.line([(x, my + 12), (x, my + fh - 12)], fill=(30, 18, 10), width=2)
    deck = add_vignette(deck, 0.18)
    base.paste(deck, (0, y0))


def draw_foot_zone(base: Image.Image):
    y0 = ZONE['foot_y']
    h = ZONE['foot_h']
    wood = wood_gradient(W, h, (68, 36, 22), (52, 28, 16), (38, 20, 12))
    d = ImageDraw.Draw(wood)
    rng = random.Random(7)
    for _ in range(14):
        r = rng.randint(10, 18)
        x = rng.randint(40, W - 40)
        y = rng.randint(h - 80, h - 20)
        d.ellipse((x - r, y - r, x + r, y + r), fill=(210, 165, 55), outline=(150, 110, 35))
    glow = Image.new('RGBA', (W, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((W // 2 - 160, h - 100, W // 2 + 160, h + 30), fill=(255, 160, 60, 35))
    wood = Image.alpha_composite(wood.convert('RGBA'), glow.filter(ImageFilter.GaussianBlur(10))).convert('RGB')
    base.paste(wood, (0, y0))


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    base = wood_gradient(W, H, (58, 32, 22), (48, 26, 16), (38, 20, 12))
    draw_top_banner(base)
    draw_sky_header(base)
    draw_reel_frame(base)
    draw_foot_zone(base)
    base.save(ASSETS / 'room-bg.png', 'PNG', optimize=True)
    base.save(ASSETS / 'room-bg.jpg', 'JPEG', quality=90, optimize=True, progressive=True)
    (ASSETS / 'room-bg-layout.txt').write_text(export_layout_css(), encoding='utf-8')
    print('OK room-bg', base.size)
    print(export_layout_css())


if __name__ == '__main__':
    main()
