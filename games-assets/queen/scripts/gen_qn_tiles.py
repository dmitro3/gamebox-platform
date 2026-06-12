# -*- coding: utf-8 -*-
"""赏金女王 · 程序化绘制转轴符号"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from qn_draw_common import load_font

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'tiles'
OUT.mkdir(parents=True, exist_ok=True)

W, H = 192, 220


def _bg(draw, dark=False):
    if dark:
        draw.rounded_rectangle((4, 4, W - 5, H - 5), radius=14, fill=(32, 18, 48))
        draw.rounded_rectangle((4, 4, W - 5, H - 5), radius=14, outline=(120, 80, 160), width=2)
    else:
        draw.rounded_rectangle((4, 4, W - 5, H - 5), radius=14, fill=(48, 28, 18))
        draw.rounded_rectangle((4, 4, W - 5, H - 5), radius=14, outline=(160, 110, 55), width=2)


def _glow_ellipse(d, box, color, blur=6):
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.ellipse(box, fill=color)
    return Image.alpha_composite(Image.new('RGBA', (W, H), (0, 0, 0, 0)), layer.filter(ImageFilter.GaussianBlur(blur)))


def draw_queen():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    _bg(draw, dark=True)
    glow = _glow_ellipse(draw, (40, 50, 152, 170), (180, 60, 220, 90))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)
    # 海盗帽
    draw.polygon([(96, 42), (58, 78), (134, 78)], fill=(28, 18, 12))
    draw.ellipse((72, 34, 120, 62), fill=(38, 24, 16))
    draw.ellipse((88, 48, 104, 64), fill=(220, 180, 60), outline=(180, 140, 40))
    # 红发
    draw.arc((52, 68, 140, 150), 200, 340, fill=(180, 40, 30), width=18)
    # 脸
    draw.ellipse((68, 82, 124, 138), fill=(240, 190, 150))
    draw.ellipse((82, 102, 92, 112), fill=(40, 24, 16))
    draw.ellipse((100, 102, 110, 112), fill=(40, 24, 16))
    # 眼罩
    draw.arc((78, 94, 114, 118), 200, 340, fill=(20, 12, 8), width=8)
    draw.line([(114, 106), (132, 98)], fill=(20, 12, 8), width=4)
    img.save(OUT / 'queen.png', 'PNG', optimize=True)


def draw_map():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    _bg(draw)
    draw.rounded_rectangle((36, 48, 156, 168), radius=8, fill=(220, 195, 140), outline=(160, 120, 70), width=2)
    draw.line([(52, 68), (140, 148)], fill=(180, 50, 40), width=3)
    draw.line([(140, 68), (52, 148)], fill=(180, 50, 40), width=3)
    draw.text((78, 98), 'X', fill=(160, 40, 30), font=load_font(36, True))
    draw.ellipse((118, 58, 148, 88), fill=(200, 170, 110), outline=(140, 100, 50))
    img.save(OUT / 'map.png', 'PNG', optimize=True)


def draw_pistol():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    _bg(draw)
    for ox, flip in ((0, 1), (0, -1)):
        pts = [(60 + ox, 130), (100, 90), (130, 100), (110, 120), (90, 150)]
        if flip < 0:
            pts = [(W - x, y) for x, y in pts]
        draw.polygon(pts, fill=(220, 180, 60), outline=(160, 120, 40))
        draw.rectangle((88, 118, 108, 138), fill=(120, 80, 30))
    img.save(OUT / 'pistol.png', 'PNG', optimize=True)


def draw_compass():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    _bg(draw)
    cx, cy, r = W // 2, H // 2 + 8, 52
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(240, 210, 120), outline=(180, 140, 50), width=3)
    for ang in range(0, 360, 90):
        rad = math.radians(ang - 90)
        x2 = cx + math.cos(rad) * (r - 8)
        y2 = cy + math.sin(rad) * (r - 8)
        draw.line([(cx, cy), (x2, y2)], fill=(160, 100, 30), width=3)
    draw.polygon([(cx, cy - 36), (cx - 14, cy + 20), (cx + 14, cy + 20)], fill=(200, 60, 50))
    draw.polygon([(cx, cy + 36), (cx - 14, cy - 20), (cx + 14, cy - 20)], fill=(180, 180, 190))
    img.save(OUT / 'compass.png', 'PNG', optimize=True)


def draw_letter(ch: str, name: str):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    _bg(draw)
    f = load_font(88, True)
    bbox = draw.textbbox((0, 0), ch, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((W - tw) // 2, (H - th) // 2 - 6), ch, fill=(220, 195, 120), font=f)
    draw.text(((W - tw) // 2 + 2, (H - th) // 2 - 4), ch, fill=(140, 110, 60), font=f)
    img.save(OUT / f'{name}.png', 'PNG', optimize=True)


def draw_wild():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    _bg(draw, dark=True)
    draw.rounded_rectangle((44, 88, 148, 168), radius=6, fill=(160, 100, 40), outline=(220, 170, 60), width=3)
    draw.rectangle((44, 72, 148, 98), fill=(180, 120, 50), outline=(220, 170, 60))
    draw.ellipse((68, 108, 88, 128), fill=(255, 80, 120))
    draw.ellipse((92, 112, 108, 128), fill=(80, 180, 255))
    draw.ellipse((112, 108, 128, 128), fill=(255, 220, 60))
    f = load_font(28, True)
    draw.text((62, 38), '百搭', fill=(255, 220, 80), font=f)
    img.save(OUT / 'wild.png', 'PNG', optimize=True)


def draw_scatter():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    _bg(draw, dark=True)
    draw.rounded_rectangle((52, 100, 140, 140), radius=8, fill=(80, 50, 30), outline=(120, 80, 40), width=2)
    draw.polygon([(140, 120), (170, 110), (170, 130)], fill=(60, 40, 25))
    draw.ellipse((168, 112, 188, 132), fill=(255, 200, 80))
    f = load_font(28, True)
    draw.text((58, 38), '夺宝', fill=(255, 200, 80), font=f)
    img.save(OUT / 'scatter.png', 'PNG', optimize=True)


def main():
    draw_queen()
    draw_map()
    draw_pistol()
    draw_compass()
    draw_letter('A', 'a')
    draw_letter('K', 'k')
    draw_letter('Q', 'q')
    draw_wild()
    draw_scatter()
    print('OK tiles ->', OUT)


if __name__ == '__main__':
    main()
