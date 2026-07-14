"""生成冠亚季军纹章 PNG — 同款造型，金/银/铜三色，实心金属无白块"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'result'
W, H = 280, 200
CX, CY = W // 2, 98

PALETTES = {
    'gold': {
        'hi': (255, 236, 160),
        'mid': (228, 176, 40),
        'lo': (148, 96, 20),
        'dk': (80, 52, 8),
    },
    'silver': {
        'hi': (244, 250, 255),
        'mid': (184, 200, 220),
        'lo': (108, 124, 148),
        'dk': (56, 64, 80),
    },
    'bronze': {
        'hi': (255, 210, 150),
        'mid': (196, 120, 52),
        'lo': (128, 72, 28),
        'dk': (72, 40, 12),
    },
}


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def mix(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t))


def shield_pts(cx: int, cy: int) -> list[tuple[int, int]]:
    return [
        (cx, cy - 52),
        (cx + 46, cy - 28),
        (cx + 40, cy + 18),
        (cx + 18, cy + 50),
        (cx, cy + 58),
        (cx - 18, cy + 50),
        (cx - 40, cy + 18),
        (cx - 46, cy - 28),
    ]


def leaf(draw: ImageDraw.ImageDraw, x: float, y: float, ang: float, s: float, c: tuple[int, int, int]) -> None:
    pts = []
    for deg in range(0, 360, 24):
        r = math.radians(deg)
        rx = s * (0.35 + 0.65 * abs(math.cos(r * 0.5)))
        ry = s * 0.42
        pts.append((x + rx * math.cos(r + ang), y + ry * math.sin(r + ang)))
    draw.polygon(pts, fill=c)


def laurel(draw: ImageDraw.ImageDraw, side: int, pal: dict[str, tuple[int, int, int]]) -> None:
    bx = CX + side * 62
    for i in range(8):
        t = i / 7
        y = CY - 38 + t * 76
        x = bx + side * (6 + math.sin(t * math.pi) * 10)
        ang = side * (-0.5 + t * 0.3)
        c = mix(pal['mid'], pal['lo'], 0.25 + t * 0.35)
        leaf(draw, x, y, ang, 10 + (1 - abs(t - 0.5)) * 2.5, c)


def metallic_shield(pal: dict[str, tuple[int, int, int]]) -> Image.Image:
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).polygon(shield_pts(CX, CY), fill=255)

    grad = Image.new('RGB', (W, H))
    gd = ImageDraw.Draw(grad)
    for y in range(H):
        t = y / H
        gd.line([(0, y), (W, y)], fill=mix(pal['hi'], pal['lo'], t * 0.85))
    for x in range(W):
        t = x / W
        c = mix(pal['hi'], pal['dk'], t * 0.35)
        gd.line([(x, 0), (x, H)], fill=c)

    shine = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shine)
    sd.polygon(
        [(CX - 28, CY - 40), (CX - 4, CY - 44), (CX + 8, CY - 8), (CX - 18, CY + 6)],
        fill=(*pal['hi'], 70),
    )
    sd.polygon(
        [(CX + 10, CY + 10), (CX + 38, CY + 34), (CX + 20, CY + 48), (CX - 2, CY + 24)],
        fill=(*pal['dk'], 55),
    )

    body = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    body.paste(grad, mask=mask)
    body = Image.alpha_composite(body, shine)

    edge = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(edge).polygon(shield_pts(CX, CY), outline=(*mix(pal['hi'], pal['mid'], 0.3), 220), width=2)
    return Image.alpha_composite(body, edge)


def draw_crown(draw: ImageDraw.ImageDraw, pal: dict[str, tuple[int, int, int]]) -> None:
    y = CY - 68
    pts = [
        (CX - 20, y + 10),
        (CX - 13, y),
        (CX - 7, y + 7),
        (CX, y - 6),
        (CX + 7, y + 7),
        (CX + 13, y),
        (CX + 20, y + 10),
    ]
    draw.polygon(pts, fill=mix(pal['hi'], pal['mid'], 0.15), outline=mix(pal['lo'], pal['dk'], 0.4))


def build(name: str, pal: dict[str, tuple[int, int, int]]) -> Image.Image:
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(out)
    laurel(ld, -1, pal)
    laurel(ld, 1, pal)

    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).polygon([(p[0] + 3, p[1] + 4) for p in shield_pts(CX, CY)], fill=(*pal['dk'], 90))
    out = Image.alpha_composite(out, shadow)

    out = Image.alpha_composite(out, metallic_shield(pal))
    draw_crown(ImageDraw.Draw(out), pal)
    return out.filter(ImageFilter.GaussianBlur(0.35))


def main() -> None:
    for name in ('gold', 'silver', 'bronze'):
        path = ROOT / f'rank-emblem-{name}.png'
        build(name, PALETTES[name]).save(path, 'PNG', optimize=True)
        print('saved', path.name)


if __name__ == '__main__':
    main()
