"""赏金女王 · 程序化绘制的公共工具"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920

ZONE = {
    'banner_y': 52,
    'banner_h': 88,
    'head_y': 140,
    'head_h': 480,
    'body_y': 624,
    'mid_h': 820,
    'foot_y': 1496,
    'foot_h': 424,
    'deco_h': 360,
}


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_rgb(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def load_font(size: int, bold: bool = False):
    candidates = [
        'C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc',
        'C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf',
        'C:/Windows/Fonts/simhei.ttf',
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def wood_gradient(w: int, h: int, c_top, c_mid, c_bot) -> Image.Image:
    img = Image.new('RGB', (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        if t < 0.45:
            c = lerp_rgb(c_top, c_mid, t / 0.45)
        else:
            c = lerp_rgb(c_mid, c_bot, (t - 0.45) / 0.55)
        for x in range(w):
            grain = math.sin(x * 0.016 + y * 0.038) * 7
            grain += math.sin(x * 0.048 + y * 0.012) * 3
            r = max(0, min(255, int(c[0] + grain)))
            g = max(0, min(255, int(c[1] + grain * 0.65)))
            b = max(0, min(255, int(c[2] + grain * 0.35)))
            px[x, y] = (r, g, b)
    return img.filter(ImageFilter.GaussianBlur(0.5))


def sunset_gradient(w: int, h: int) -> Image.Image:
    img = Image.new('RGB', (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        top = lerp_rgb((88, 42, 98), (180, 72, 58), t ** 0.7)
        bot = lerp_rgb((220, 118, 52), (255, 188, 88), t ** 1.4)
        c = lerp_rgb(top, bot, t)
        for x in range(w):
            wave = math.sin(x * 0.008 + y * 0.004) * 4
            px[x, y] = tuple(max(0, min(255, int(c[i] + wave))) for i in range(3))
    return img.filter(ImageFilter.GaussianBlur(0.8))


def add_vignette(img: Image.Image, strength: float = 0.28) -> Image.Image:
    w, h = img.size
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(h):
        t = abs(y / h - 0.5) * 2
        a = int(255 * strength * (t ** 1.5))
        draw.line([(0, y), (w, y)], fill=(0, 0, 0, a))
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')


def draw_rope(d: ImageDraw.ImageDraw, x0, y0, x1, y1, color=(180, 130, 70), width=5):
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    pts = []
    for i in range(steps + 1):
        t = i / steps
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t + math.sin(t * math.pi * 6) * 3
        pts.append((x, y))
    if len(pts) >= 2:
        d.line(pts, fill=color, width=width, joint='curve')


def draw_coin_icon(d: ImageDraw.ImageDraw, cx: int, cy: int, r: int):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(210, 165, 55), outline=(160, 115, 35))
    hr = max(2, r // 4)
    d.rectangle((cx - hr, cy - hr, cx + hr, cy + hr), fill=(130, 90, 30))


def export_layout_css() -> str:
    body_pct = ZONE['body_y'] / H * 100
    foot_pct = ZONE['foot_y'] / H * 100
    foot_h_pct = ZONE['foot_h'] / H * 100
    return '\n'.join([
        ':root {',
        f'  --qn-body-y: {body_pct:.3f}%;',
        f'  --qn-foot-y: {foot_pct:.3f}%;',
        f'  --qn-foot-h: {foot_h_pct:.3f}%;',
        '  --qn-ctrl-mask-y: 63.000%;',
        '  --qn-tile-cols: 5;',
        '  --qn-tile-rows: 3;',
        '  --qn-deco-ar: 1536 / 360;',
        '}',
    ])


def mult_overlay_layout() -> list[dict]:
    """四炮筒槽位（相对顶栏宽）"""
    return [
        {'left': 0.072, 'top': 0.74, 'width': 0.19},
        {'left': 0.292, 'top': 0.74, 'width': 0.19},
        {'left': 0.512, 'top': 0.74, 'width': 0.19},
        {'left': 0.732, 'top': 0.74, 'width': 0.19},
    ]
