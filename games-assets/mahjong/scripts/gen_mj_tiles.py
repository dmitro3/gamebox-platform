# -*- coding: utf-8 -*-
"""麻将胡了 · 牌面素材（白底绿纹麻将牌）"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'tiles'
OUT.mkdir(parents=True, exist_ok=True)

W, H = 96, 120

# AI 精修牌面，生成脚本不覆盖
MANUAL_TILES = frozenset({'wan1'})

TILES = [
    ('wan8', '八萬', '#c62828', '#fff8f0'),
    ('wan5', '五萬', '#c62828', '#fff8f0'),
    ('wan2', '二萬', '#c62828', '#fff8f0'),
    ('tong4', '四筒', '#1565c0', '#fff8f0'),
    ('tong6', '六筒', '#1565c0', '#fff8f0'),
    ('tong8', '八筒', '#1565c0', '#fff8f0'),
    ('sou3', '三索', '#2e7d32', '#fff8f0'),
    ('sou5', '五索', '#2e7d32', '#fff8f0'),
    ('sou7', '七索', '#2e7d32', '#fff8f0'),
    ('fa', '發', '#2e7d32', '#fff8f0', True),
    ('zhong', '中', '#c62828', '#fff8f0', True),
    ('bai', '白', '#78909c', '#fff8f0'),
    ('wild', '百搭', '#f9a825', '#fffde7', False, True),
    ('hu', '胡', '#d32f2f', '#fff5f5', False, False, True),
    ('gold', '中', '#c62828', '#fff8f0', True, False, False, True),
]


def load_font(size):
    for name in ['msyh.ttc', 'msyhbd.ttc', 'simhei.ttf', 'arial.ttf']:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_tile(spec):
    key = spec[0]
    if key in MANUAL_TILES and (OUT / f'{key}.png').exists():
        print('skip manual', key)
        return
    text = spec[1]
    color = spec[2]
    bg = spec[3]
    is_honor = len(spec) > 4 and spec[4]
    is_wild = len(spec) > 5 and spec[5]
    is_hu = len(spec) > 6 and spec[6]
    is_gold = len(spec) > 7 and spec[7]

    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    face = tuple(int(bg[i:i+2], 16) for i in (1, 3, 5))
    if is_gold:
        draw.rounded_rectangle((2, 2, W-3, H-3), radius=10, fill=(255, 200, 60))
        draw.rounded_rectangle((6, 6, W-7, H-7), radius=8, fill=face)
    else:
        draw.rounded_rectangle((4, 4, W-5, H-5), radius=8, fill=face)
        draw.rounded_rectangle((4, 4, W-5, H-5), radius=8, outline=(200, 190, 170), width=2)

    if is_wild:
        draw.rounded_rectangle((12, 28, W-12, H-18), radius=6, fill=(255, 215, 80))
        draw.ellipse((W//2-18, 38, W//2+18, 74), fill=(255, 235, 120), outline=(200, 140, 20), width=2)
        f = load_font(22)
        draw.text((W//2-20, 10), '百搭', fill=(180, 100, 0), font=f)
        img.save(OUT / f'{key}.png', 'PNG')
        return

    if is_hu:
        f = load_font(52)
        bbox = draw.textbbox((0, 0), text, font=f)
        tw = bbox[2]-bbox[0]
        th = bbox[3]-bbox[1]
        draw.text(((W-tw)/2, (H-th)/2-4), text, fill=(211, 47, 47), font=f)
        # glow ring
        draw.rounded_rectangle((8, 8, W-9, H-9), radius=6, outline=(255, 100, 100, 180), width=3)
        img.save(OUT / f'{key}.png', 'PNG')
        return

    fsize = 36 if len(text) <= 2 else 28
    f = load_font(fsize)
    bbox = draw.textbbox((0, 0), text, font=f)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    draw.text(((W-tw)/2, (H-th)/2-2), text, fill=tuple(int(color[i:i+2], 16) for i in (1, 3, 5)), font=f)

    if is_honor and not is_gold:
        draw.rectangle((10, 10, W-11, 18), fill=(220, 210, 190))

    img.save(OUT / f'{key}.png', 'PNG')
    print('tile', key)


if __name__ == '__main__':
    for spec in TILES:
        draw_tile(spec)
