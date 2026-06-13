# -*- coding: utf-8 -*-
"""经典水果机 · 程序化绘制公共工具"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_rgb(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def load_font(size: int, bold: bool = True):
    for p in (
        'C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc',
        'C:/Windows/Fonts/simhei.ttf',
        'C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf',
    ):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def radial_glow(size: int, color, blur: int = 12) -> Image.Image:
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = size // 2
    for r in range(size // 2, 0, -2):
        t = r / (size // 2)
        a = int(180 * (1 - t) ** 1.8)
        d.ellipse((cx - r, cx - r, cx + r, cx + r), fill=(*color[:3], a))
    return im.filter(ImageFilter.GaussianBlur(blur))


def arcade_bg(w: int = W, h: int = H) -> Image.Image:
    img = Image.new('RGB', (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        base = lerp_rgb((28, 12, 8), (58, 22, 14), t ** 0.6)
        base = lerp_rgb(base, (18, 8, 6), t ** 2.2)
        for x in range(w):
            glow = 0
            glow += max(0, 1 - math.hypot(x - w * 0.5, y - h * 0.22) / 280) * 55
            glow += max(0, 1 - math.hypot(x - w * 0.18, y - h * 0.55) / 160) * 28
            glow += max(0, 1 - math.hypot(x - w * 0.82, y - h * 0.62) / 140) * 22
            px[x, y] = tuple(max(0, min(255, int(base[i] + (glow if i == 0 else glow * 0.45)))) for i in range(3))
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(h):
        t = abs(y / h - 0.5) * 2
        a = int(90 * t ** 1.6)
        od.line([(0, y), (w, y)], fill=(0, 0, 0, a))
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')


def plastic_red(w: int, h: int, c1=(200, 40, 28), c2=(120, 18, 12)) -> Image.Image:
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=min(w, h) // 8, fill=(*c2, 255))
    for y in range(h):
        t = y / max(h - 1, 1)
        c = lerp_rgb(c1, c2, t ** 0.85)
        d.line([(4, y), (w - 5, y)], fill=(*c, 255))
    hi = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.rounded_rectangle((8, 6, w - 10, h // 3), radius=10, fill=(255, 255, 255, 45))
    hi = hi.filter(ImageFilter.GaussianBlur(6))
    return Image.alpha_composite(img, hi)


def gold_text(draw: ImageDraw.ImageDraw, xy, text: str, font, fill=(255, 230, 120)):
    x, y = xy
    for ox, oy, c in [(-1, 0, (60, 30, 0)), (1, 0, (60, 30, 0)), (0, -1, (60, 30, 0)), (0, 1, (60, 30, 0)),
                      (0, 2, (30, 10, 0))]:
        draw.text((x + ox, y + oy), text, fill=c, font=font)
    draw.text((x, y), text, fill=fill, font=font)
