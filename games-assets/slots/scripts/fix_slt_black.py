# -*- coding: utf-8 -*-
"""修复 AI 素材黑底：抠透明 + 机柜开窗"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
AI = ASSETS / 'ai-sources'


def key_dark(im: Image.Image, thresh: int = 48) -> Image.Image:
    im = im.convert('RGBA')
    arr = np.array(im)
    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.sum(axis=2)
    arr[lum < thresh, 3] = 0
    return Image.fromarray(arr)


def punch_rect(im: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    im = im.convert('RGBA')
    arr = np.array(im)
    x0, y0, x1, y1 = box
    arr[y0:y1, x0:x1, 3] = 0
    return Image.fromarray(arr)


def fix_machine_frame():
    src = AI / 'slt-ai-machine-frame.png'
    if not src.exists():
        src = ASSETS / 'machine-frame.png'
    im = Image.open(src).convert('RGBA')
    w, h = im.size
    if w != 960 or h != 720:
        im = im.resize((960, 720), Image.Resampling.LANCZOS)
    im = key_dark(im, 42)
    # 中央转轴窗镂空（比例按机柜图）
    im = punch_rect(im, (int(w * 0.17), int(h * 0.11), int(w * 0.83), int(h * 0.89)))
    im = ImageEnhance.Sharpness(im).enhance(1.1)
    im.save(ASSETS / 'machine-frame.png', 'PNG', optimize=True)
    print('machine-frame fixed (transparent window)')


def fix_top_header():
    src = AI / 'slt-ai-top-header.png'
    if not src.exists():
        return
    im = Image.open(src).convert('RGBA')
    im = im.resize((1080, 220), Image.Resampling.LANCZOS)
    im = key_dark(im, 50)
    im.save(ASSETS / 'top-header.png', 'PNG', optimize=True)
    print('top-header fixed')


def fix_bottom_deco():
    src = AI / 'slt-ai-bottom-deco.png'
    if not src.exists():
        return
    im = Image.open(src).convert('RGBA')
    im = im.resize((1080, 300), Image.Resampling.LANCZOS)
    im = key_dark(im, 48)
    im.save(ASSETS / 'bottom-deco.png', 'PNG', optimize=True)
    print('bottom-deco fixed')


def fix_center_panel():
    """中央屏改为半透明绿玻璃，不要死黑块"""
    w, h = 360, 260
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((4, 4, w - 5, h - 5), radius=14, fill=(8, 28, 12, 200))
    d.rounded_rectangle((8, 8, w - 9, h - 9), radius=12, outline=(60, 180, 80, 180), width=3)
    for y in range(18, h - 18, 5):
        d.line([(14, y), (w - 15, y)], fill=(20, 80, 35, 35), width=1)
    im.save(ASSETS / 'center-panel.png', 'PNG', optimize=True)
    print('center-panel fixed (glass)')


def fix_slot_cells():
    s = 96
    dark = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(dark)
    d.rounded_rectangle((6, 6, s - 7, s - 7), radius=8, fill=(40, 18, 10, 200))
    d.rounded_rectangle((8, 8, s - 9, s - 9), radius=7, outline=(90, 50, 25, 160), width=2)
    dark.save(ASSETS / 'slot-cell.png', 'PNG')

    lit = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    dl = ImageDraw.Draw(lit)
    dl.rounded_rectangle((4, 4, s - 5, s - 5), radius=9, fill=(255, 200, 60, 60))
    dl.rounded_rectangle((6, 6, s - 7, s - 7), radius=8, outline=(255, 220, 100, 255), width=3)
    lit.save(ASSETS / 'slot-cell-lit.png', 'PNG')
    print('slot-cells fixed')


def fix_bet_buttons():
    for name, on in [('btn-bet.png', False), ('btn-bet-on.png', True)]:
        w, h = 80, 56
        im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        if on:
            d.rounded_rectangle((2, 2, w - 3, h - 3), radius=8, fill=(255, 200, 50, 230))
            d.rounded_rectangle((4, 4, w - 5, h - 5), radius=7, outline=(255, 240, 140, 255), width=2)
        else:
            d.rounded_rectangle((2, 2, w - 3, h - 3), radius=8, fill=(80, 40, 20, 210))
            d.rounded_rectangle((4, 4, w - 5, h - 5), radius=7, outline=(160, 110, 50, 200), width=2)
        im.save(ASSETS / name, 'PNG')
    print('bet buttons fixed')


def main():
    fix_machine_frame()
    fix_top_header()
    fix_bottom_deco()
    fix_center_panel()
    fix_slot_cells()
    fix_bet_buttons()
    print('\nOK 黑块修复完成')


if __name__ == '__main__':
    main()
