# -*- coding: utf-8
"""赏金女王 · 程序化绘制船舵旋转按钮"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'spin-btn.png'
SIZE = 512
CX, CY = SIZE // 2, SIZE // 2


def lerp(a, b, t):
    return int(a + (b - a) * t)


def main():
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    for r in range(248, 218, -2):
        t = (248 - r) / 30
        draw.ellipse((CX - r, CY - r, CX + r, CY + r), fill=(lerp(180, 100, t), lerp(130, 70, t), 40, 35))

    draw.ellipse((CX - 228, CY - 228, CX + 228, CY + 228), fill=(190, 145, 55, 255))
    draw.ellipse((CX - 210, CY - 210, CX + 210, CY + 210), fill=(130, 85, 35, 255))

    wood = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wood)
    for r in range(200, 0, -2):
        t = r / 200
        wd.ellipse((CX - r, CY - r, CX + r, CY + r),
                   fill=(lerp(90, 150, t), lerp(55, 95, t), lerp(30, 50, t), 255))
    wood = wood.filter(ImageFilter.GaussianBlur(1.0))
    img = Image.alpha_composite(img, wood)
    draw = ImageDraw.Draw(img)

    for ang in range(0, 360, 45):
        rad = math.radians(ang)
        x2 = CX + math.cos(rad) * 175
        y2 = CY + math.sin(rad) * 175
        draw.line([(CX, CY), (x2, y2)], fill=(210, 170, 80, 255), width=16)

    draw.ellipse((CX - 55, CY - 55, CX + 55, CY + 55), fill=(100, 60, 30, 255), outline=(180, 140, 70), width=4)

    def arrow_arc(start_deg, sweep=120, width=20):
        pts = []
        for a in range(start_deg, start_deg + sweep, 4):
            rad = a * math.pi / 180
            pts.append((CX + math.cos(rad) * 120, CY + math.sin(rad) * 120))
        if len(pts) >= 2:
            draw.line(pts, fill=(255, 220, 100, 255), width=width, joint='curve')
        end = (start_deg + sweep) * math.pi / 180
        tip = (CX + math.cos(end) * 120, CY + math.sin(end) * 120)
        left, right = end + math.pi * 0.78, end - math.pi * 0.78
        draw.polygon([
            tip,
            (tip[0] + math.cos(left) * 32, tip[1] + math.sin(left) * 32),
            (tip[0] + math.cos(right) * 32, tip[1] + math.sin(right) * 32),
        ], fill=(255, 220, 100, 255))

    arrow_arc(35)
    arrow_arc(215)

    hl = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(hl).ellipse((CX - 100, CY - 140, CX + 100, CY - 20), fill=(255, 255, 255, 45))
    img = Image.alpha_composite(img, hl.filter(ImageFilter.GaussianBlur(8)))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, 'PNG', optimize=True)
    print('OK', OUT)


if __name__ == '__main__':
    main()
