# -*- coding: utf-8
"""赏金女王 · 倍数高亮叠层"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from qn_draw_common import load_font

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'mult-active'


def build(label: str, w: int, h: int) -> Image.Image:
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((2, 2, w - 3, h - 3), radius=h // 8, outline=(255, 210, 80, 230), width=4)
    d.rounded_rectangle((8, 8, w - 9, h - 9), radius=h // 10, fill=(255, 200, 60, 100))
    f = load_font(h // 2, True)
    bbox = d.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((w - tw) // 2, (h - th) // 2 - 2), label, fill=(255, 245, 200, 255), font=f)
    return img.filter(ImageFilter.GaussianBlur(0.2))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for label in ('x1', 'x2', 'x3', 'x5'):
        build(label, 220, 88).save(OUT / f'{label}.png', 'PNG', optimize=True)
    print('OK mult-active')


if __name__ == '__main__':
    main()
