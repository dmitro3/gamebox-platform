"""开奖舞台背景 v2：中间直斑马线到底，两侧弧形围成椭圆圈"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'result' / 'bg.png'
W, H = 960, 600


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp3(c1: tuple, c2: tuple, t: float) -> tuple[int, int, int]:
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def draw_base(draw: ImageDraw.ImageDraw) -> None:
    for y in range(H):
        t = y / H
        if t < 0.38:
            c = lerp3((6, 10, 18), (12, 20, 36), t / 0.38)
        else:
            gt = (t - 0.38) / 0.62
            c = lerp3((12, 20, 36), (3, 5, 8), gt ** 0.9)
        draw.line([(0, y), (W, y)], fill=c)


def stripe_color(alpha: int) -> tuple[int, int, int, int]:
    return (210, 218, 228, alpha)


def draw_center_stripes(base: Image.Image) -> None:
    """中间透视直斑马线，从远处一直拉到页面最底"""
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx = W * 0.5
    top_y = H * 0.32
    bot_y = H
    n = 13
    half_top = W * 0.075
    half_bot = W * 0.26
    for i in range(n):
        u = i / (n - 1)
        xt = cx + lerp(-half_top, half_top, u)
        xb = cx + lerp(-half_bot, half_bot, u)
        if i % 2 == 0:
            wt, wb = 5, 18
            d.polygon(
                [(xt - wt, top_y), (xt + wt, top_y), (xb + wb, bot_y), (xb - wb, bot_y)],
                fill=stripe_color(52),
            )
    base.alpha_composite(layer)


def arc_pt(cx: float, cy: float, rx: float, ry: float, deg: float) -> tuple[float, float]:
    r = math.radians(deg)
    return cx + rx * math.cos(r), cy + ry * math.sin(r)


def draw_ring_stripes(base: Image.Image) -> None:
    """椭圆圈上的弧形斑马线（左右 + 前底弧），围成一圈"""
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = W * 0.5, H * 0.82
    rx, ry = W * 0.48, H * 0.38

    # 整圈分段：左弧 155°~205°，右弧 -25°~25°，底弧 25°~155° 走两侧连接
    segments = 48
    for i in range(segments):
        a0 = 155 + (360 - 155 + 25) * (i / segments) if i < segments else 0
        # 从 155° 顺时针到 205° (左) 再经底 205->335->25 再右 25->155
        # 简化：角度从 155 到 385 (即 25+360)
        ang = 155 + (230 / segments) * i  # 155 -> 385 覆盖左+底+右
        if ang > 360:
            ang -= 360
        a1 = 155 + (230 / segments) * (i + 1)
        if a1 > 360:
            a1 -= 360

        if i % 2 != 0:
            continue

        for band, thick in ((0.84, 0.045), (0.78, 0.04)):
            inner = band
            outer = band + thick
            p1 = arc_pt(cx, cy, rx * inner, ry * inner, ang if ang <= 360 else ang - 360)
            p2 = arc_pt(cx, cy, rx * inner, ry * inner, a1 if a1 <= 360 else a1 - 360)
            p3 = arc_pt(cx, cy, rx * outer, ry * outer, a1 if a1 <= 360 else a1 - 360)
            p4 = arc_pt(cx, cy, rx * outer, ry * outer, ang if ang <= 360 else ang - 360)
            d.polygon([p1, p2, p3, p4], fill=stripe_color(48))

    base.alpha_composite(layer)


def draw_ring_stripes_fixed(base: Image.Image) -> None:
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = W * 0.5, H * 0.84
    rx, ry = W * 0.49, H * 0.36

    steps = 56
    # 155°(左上) -> 205°(左下) -> 335°(右下) -> 25°(右上) -> 155°
    angles = []
    for i in range(steps + 1):
        t = i / steps
        if t < 0.22:
            ang = lerp(168, 212, t / 0.22)
        elif t < 0.5:
            ang = lerp(212, 328, (t - 0.22) / 0.28)
        elif t < 0.78:
            ang = lerp(328, 368, (t - 0.5) / 0.28)
        else:
            ang = lerp(368, 528, (t - 0.78) / 0.22)
        if ang >= 360:
            ang -= 360
        angles.append(ang)

    for i in range(len(angles) - 1):
        if i % 2 != 0:
            continue
        a0, a1 = angles[i], angles[i + 1]
        inner, outer = 0.80, 0.855
        p1 = arc_pt(cx, cy, rx * inner, ry * inner, a0)
        p2 = arc_pt(cx, cy, rx * inner, ry * inner, a1)
        p3 = arc_pt(cx, cy, rx * outer, ry * outer, a1)
        p4 = arc_pt(cx, cy, rx * outer, ry * outer, a0)
        d.polygon([p1, p2, p3, p4], fill=stripe_color(50))

    base.alpha_composite(layer)


def draw_gloss(base: Image.Image) -> None:
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for y in range(int(H * 0.42), H):
        t = (y - H * 0.42) / (H * 0.58)
        a = int(22 * math.sin(t * math.pi) ** 1.2)
        d.line([(0, y), (W, y)], fill=(80, 130, 190, a))
    base.alpha_composite(layer)


def main() -> None:
    img = Image.new('RGB', (W, H))
    draw_base(ImageDraw.Draw(img))
    img = img.convert('RGBA')
    draw_center_stripes(img)
    draw_ring_stripes_fixed(img)
    draw_gloss(img)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.convert('RGB').save(OUT, 'PNG', optimize=True)
    print('saved', OUT)


if __name__ == '__main__':
    main()
