"""生成冠亚季军月桂冠 PNG — 金/银/铜，中心留空供 Canvas 写车号"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'result'
W, H = 320, 320
CX, CY = W // 2, H // 2 + 8

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


def leaf(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    ang: float,
    scale: float,
    fill: tuple[int, int, int],
    outline: tuple[int, int, int],
) -> None:
    pts = []
    for deg in range(0, 360, 18):
        r = math.radians(deg)
        rx = scale * (0.28 + 0.72 * abs(math.cos(r * 0.5)))
        ry = scale * 0.46
        pts.append((x + rx * math.cos(r + ang), y + ry * math.sin(r + ang)))
    draw.polygon(pts, fill=fill, outline=outline)


def branch_side(
    draw: ImageDraw.ImageDraw,
    side: int,
    pal: dict[str, tuple[int, int, int]],
) -> None:
    """单侧月桂枝：沿椭圆弧排列叶片"""
    rx, ry = 108, 96
    start = math.radians(200 if side < 0 else -20)
    end = math.radians(-20 if side < 0 else 200)
    steps = 14
    for i in range(steps):
        t = i / (steps - 1)
        a = start + (end - start) * t
        x = CX + rx * math.cos(a) * side * -1 if side < 0 else CX + rx * math.cos(a)
        # left branch uses angles from 200° to 340°, right from 20° to 160°
        if side < 0:
            x = CX + rx * math.cos(a)
        else:
            x = CX + rx * math.cos(a)
        y = CY + ry * math.sin(a)
        tangent = a + (math.pi / 2 if side > 0 else -math.pi / 2)
        c = mix(pal['mid'], pal['lo'], 0.15 + t * 0.55)
        ol = mix(pal['lo'], pal['dk'], 0.35)
        leaf(draw, x, y, tangent, 11 + (1 - abs(t - 0.5)) * 3, c, ol)


def draw_wreath(pal: dict[str, tuple[int, int, int]]) -> Image.Image:
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)

    rx, ry = 108, 96
    for side in (-1, 1):
        start = math.radians(215 if side < 0 else 25)
        end = math.radians(325 if side < 0 else 155)
        steps = 15
        for i in range(steps):
            t = i / (steps - 1)
            a = start + (end - start) * t
            x = CX + rx * math.cos(a)
            y = CY + ry * math.sin(a)
            tangent = a + side * 0.55
            c = mix(pal['mid'], pal['lo'], 0.12 + t * 0.5)
            ol = mix(pal['lo'], pal['dk'], 0.4)
            sc = 10.5 + (1 - abs(t - 0.5)) * 3.5
            leaf(ImageDraw.Draw(out), x, y, tangent, sc, c, ol)
            leaf(sd, x + 2, y + 3, tangent, sc, (*pal['dk'], 60), (*pal['dk'], 60))

    # 底部交汇：两枝在下方靠拢
    tie_y = CY + ry * 0.72
    for dx in (-18, -8, 0, 8, 18):
        leaf(
            ImageDraw.Draw(out),
            CX + dx,
            tie_y + abs(dx) * 0.08,
            math.pi / 2,
            8,
            mix(pal['mid'], pal['hi'], 0.2),
            mix(pal['lo'], pal['dk'], 0.3),
        )

    # 顶部装饰小枝
    for dx in (-12, 0, 12):
        leaf(
            ImageDraw.Draw(out),
            CX + dx,
            CY - ry - 6,
            -math.pi / 2 + dx * 0.02,
            7,
            mix(pal['hi'], pal['mid'], 0.25),
            mix(pal['lo'], pal['dk'], 0.35),
        )

    out = Image.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(1.2)), out)
    return out.filter(ImageFilter.GaussianBlur(0.25))


def main() -> None:
    for name in ('gold', 'silver', 'bronze'):
        path = ROOT / f'laurel-{name}.png'
        draw_wreath(PALETTES[name]).save(path, 'PNG', optimize=True)
        print('saved', path.name)


if __name__ == '__main__':
    main()
