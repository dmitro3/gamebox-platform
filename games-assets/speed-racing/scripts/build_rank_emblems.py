"""生成冠亚季军纹章 PNG：同款造型，金/银/铜三色，无中间白块"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'result'
W, H = 280, 200
CX, CY = W // 2, 98

THEMES = {
    'gold': {
        'file': 'rank-emblem-gold.png',
        'hi': (255, 232, 140),
        'mid': (228, 176, 48),
        'lo': (148, 98, 16),
        'deep': (88, 58, 8),
        'rim': (255, 248, 200),
        'leaf_hi': (255, 220, 100),
        'leaf_lo': (168, 110, 20),
    },
    'silver': {
        'file': 'rank-emblem-silver.png',
        'hi': (240, 246, 255),
        'mid': (176, 188, 210),
        'lo': (108, 118, 138),
        'deep': (64, 72, 88),
        'rim': (255, 255, 255),
        'leaf_hi': (220, 228, 240),
        'leaf_lo': (120, 130, 148),
    },
    'bronze': {
        'file': 'rank-emblem-bronze.png',
        'hi': (255, 196, 130),
        'mid': (196, 118, 52),
        'lo': (128, 72, 28),
        'deep': (72, 40, 12),
        'rim': (255, 220, 170),
        'leaf_hi': (230, 160, 90),
        'leaf_lo': (140, 78, 28),
    },
}


def lerp(a: tuple[int, ...], b: tuple[int, ...], t: float) -> tuple[int, ...]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def mix(theme: dict, t: float) -> tuple[int, int, int]:
    if t < 0.35:
        return lerp(theme['deep'], theme['lo'], t / 0.35)
    if t < 0.7:
        return lerp(theme['lo'], theme['mid'], (t - 0.35) / 0.35)
    return lerp(theme['mid'], theme['hi'], (t - 0.7) / 0.3)


def shield_points(cx: float, cy: float, sw: float, sh: float) -> list[tuple[float, float]]:
    return [
        (cx, cy - sh * 0.52),
        (cx + sw * 0.46, cy - sh * 0.28),
        (cx + sw * 0.42, cy + sh * 0.08),
        (cx + sw * 0.18, cy + sh * 0.42),
        (cx, cy + sh * 0.52),
        (cx - sw * 0.18, cy + sh * 0.42),
        (cx - sw * 0.42, cy + sh * 0.08),
        (cx - sw * 0.46, cy - sh * 0.28),
    ]


def draw_leaf(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    angle: float,
    w: float,
    h: float,
    fill: tuple[int, int, int, int],
) -> None:
    draw.ellipse((x - w / 2, y - h / 2, x + w / 2, y + h / 2), fill=fill)
    draw.ellipse((x - w * 0.15, y - h * 0.55, x + w * 0.15, y - h * 0.05), fill=fill)


def draw_laurel(draw: ImageDraw.ImageDraw, theme: dict, side: int) -> None:
    sign = side
    base_x = CX + sign * 18
    for i in range(9):
        t = i / 8
        ang = math.radians(-118 + sign * (36 + t * 108))
        rx = base_x + sign * (34 + t * 52)
        ry = CY + 8 + t * 34 - (t - 0.5) ** 2 * 18
        lw, lh = 16 - t * 2, 9 + t * 1.5
        tone = lerp(theme['leaf_lo'], theme['leaf_hi'], 0.25 + t * 0.55)
        draw_leaf(draw, rx, ry, ang, lw, lh, (*tone, 255))


def paint_shield(im: Image.Image, theme: dict) -> None:
    px = im.load()
    pts = shield_points(CX, CY, 92, 108)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0, x1 = int(min(xs)) - 2, int(max(xs)) + 2
    y0, y1 = int(min(ys)) - 2, int(max(ys)) + 2

    def inside(x: float, y: float) -> bool:
        inside_flag = False
        j = len(pts) - 1
        for i in range(len(pts)):
            xi, yi = pts[i]
            xj, yj = pts[j]
            if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-6) + xi):
                inside_flag = not inside_flag
            j = i
        return inside_flag

    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if not inside(x + 0.5, y + 0.5):
                continue
            nx = (x - CX) / 92
            ny = (y - CY) / 108
            light = max(0.0, min(1.0, 0.58 - nx * 0.22 - ny * 0.18 + (1 - abs(nx)) * 0.12))
            rgb = mix(theme, light)
            px[x, y] = (*rgb, 255)


def build(theme: dict) -> Image.Image:
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    draw_laurel(draw, theme, -1)
    draw_laurel(draw, theme, 1)

    paint_shield(im, theme)
    draw = ImageDraw.Draw(im)

    pts = shield_points(CX, CY, 92, 108)
    draw.polygon(pts, outline=(*theme['rim'], 220))

    inner = shield_points(CX, CY + 2, 68, 78)
    draw.polygon(inner, outline=(*lerp(theme['deep'], theme['mid'], 0.35), 180))

    for r in (34, 26):
        draw.ellipse((CX - r, CY - r + 2, CX + r, CY + r + 2), outline=(*lerp(theme['lo'], theme['hi'], 0.45), 120))

    crown_y = CY - 58
    crown = [
        (CX - 18, crown_y + 8),
        (CX - 12, crown_y - 2),
        (CX - 6, crown_y + 4),
        (CX, crown_y - 8),
        (CX + 6, crown_y + 4),
        (CX + 12, crown_y - 2),
        (CX + 18, crown_y + 8),
    ]
    draw.polygon(crown, fill=(*theme['hi'], 255), outline=(*theme['deep'], 255))

    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((CX - 88, CY - 70, CX + 88, CY + 78), fill=(*theme['mid'], 28))
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    im = Image.alpha_composite(glow, im)
    return im.filter(ImageFilter.GaussianBlur(0.4))


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    for name, theme in THEMES.items():
        out = ROOT / theme['file']
        build(theme).save(out, 'PNG', optimize=True)
        print('saved', out.name)


if __name__ == '__main__':
    main()
