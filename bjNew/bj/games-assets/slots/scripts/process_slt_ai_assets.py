# -*- coding: utf-8 -*-
"""
经典水果机 · AI 原稿 → PS 级成品素材
流程：AI 重绘原稿 → 抠图/锐化/裁切 → 导出 symbols / UI / 背景
"""
from __future__ import annotations

import json
import shutil
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

try:
    from rembg import remove as rembg_remove
    HAS_REMBG = True
except ImportError:
    HAS_REMBG = False

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
AI = ASSETS / 'ai-sources'
SYMS = ASSETS / 'symbols'

CANVAS_W, CANVAS_H = 1080, 1920
SYM_HD = 192
SYM_STD = 96
ICON_SIZE = 64
CELL_SIZE = 96
LIGHT_SIZE = 56


def load_font(size: int, bold: bool = True):
    for p in (
        'C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc',
        'C:/Windows/Fonts/simhei.ttf',
        'C:/Windows/Fonts/arialbd.ttf',
    ):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def polish(im: Image.Image, contrast=1.1, color=1.08, sharp=1.2) -> Image.Image:
    im = ImageEnhance.Contrast(im).enhance(contrast)
    im = ImageEnhance.Color(im).enhance(color)
    im = ImageEnhance.Sharpness(im).enhance(sharp)
    return im


def rembg_png(path: Path) -> Image.Image:
    if not HAS_REMBG:
        return key_black(Image.open(path).convert('RGBA'))
    out = rembg_remove(path.read_bytes())
    return Image.open(BytesIO(out)).convert('RGBA')


def key_black(im: Image.Image, thresh: int = 32) -> Image.Image:
    im = im.convert('RGBA')
    arr = np.array(im)
    rgb = arr[:, :, :3]
    dark = (rgb[:, :, 0] < thresh) & (rgb[:, :, 1] < thresh) & (rgb[:, :, 2] < thresh)
    arr[dark, 3] = 0
    return Image.fromarray(arr)


def crop_center_square(im: Image.Image, ratio: float = 0.84) -> Image.Image:
    w, h = im.size
    side = int(min(w, h) * ratio)
    x0 = (w - side) // 2
    y0 = (h - side) // 2
    return im.crop((x0, y0, x0 + side, y0 + side))


def crop_cover(im: Image.Image, tw: int, th: int) -> Image.Image:
    w, h = im.size
    target = tw / th
    cur = w / h
    if cur > target:
        nw = int(h * target)
        x0 = (w - nw) // 2
        box = (x0, 0, x0 + nw, h)
    else:
        nh = int(w / target)
        y0 = (h - nh) // 2
        box = (0, y0, w, y0 + nh)
    return im.crop(box).resize((tw, th), Image.Resampling.LANCZOS)


def crop_portrait(im: Image.Image, tw: int, th: int) -> Image.Image:
    return crop_cover(im, tw, th)


def process_symbol(name: str):
    src = AI / f'slt-ai-sym-{name}.png'
    if not src.exists():
        print('SKIP sym', name)
        return
    im = rembg_png(src)
    im = crop_center_square(im, 0.86)
    im = polish(im.convert('RGB')).convert('RGBA')
    alpha = key_black(im, 40).split()[3]
    im.putalpha(alpha)
    hd = im.resize((SYM_HD, SYM_HD), Image.Resampling.LANCZOS)
    std = hd.resize((SYM_STD, SYM_STD), Image.Resampling.LANCZOS)
    SYMS.mkdir(parents=True, exist_ok=True)
    std.save(SYMS / f'{name}.png', 'PNG', optimize=True)
    hd.save(SYMS / f'{name}@2x.png', 'PNG', optimize=True)
    shutil.copy2(src, SYMS / f'{name}-ai-source.png')
    print('sym', name)


def process_cell(name: str, out: str, lit: bool = False):
    s = CELL_SIZE
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if lit:
        d.rounded_rectangle((4, 4, s - 5, s - 5), radius=9, fill=(255, 200, 60, 60))
        d.rounded_rectangle((6, 6, s - 7, s - 7), radius=8, outline=(255, 220, 100, 255), width=3)
    else:
        d.rounded_rectangle((6, 6, s - 7, s - 7), radius=8, fill=(40, 18, 10, 200))
        d.rounded_rectangle((8, 8, s - 9, s - 9), radius=7, outline=(90, 50, 25, 160), width=2)
    im.save(ASSETS / out, 'PNG', optimize=True)
    print(out)


def process_light_dot():
    src = AI / 'slt-ai-light-dot.png'
    if not src.exists():
        return
    im = rembg_png(src)
    im = crop_center_square(im, 0.75)
    im = polish(im.convert('RGB')).convert('RGBA')
    im = im.resize((LIGHT_SIZE, LIGHT_SIZE), Image.Resampling.LANCZOS)
    im.save(ASSETS / 'light-dot.png', 'PNG', optimize=True)
    print('light-dot')


def process_btn(name: str, out: str, size: tuple[int, int]):
    src = AI / f'slt-ai-{name}.png'
    w, h = size
    if name in ('btn-bet', 'btn-bet-on'):
        im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        on = name == 'btn-bet-on'
        if on:
            d.rounded_rectangle((2, 2, w - 3, h - 3), radius=8, fill=(255, 200, 50, 230))
            d.rounded_rectangle((4, 4, w - 5, h - 5), radius=7, outline=(255, 240, 140, 255), width=2)
        else:
            d.rounded_rectangle((2, 2, w - 3, h - 3), radius=8, fill=(80, 40, 20, 210))
            d.rounded_rectangle((4, 4, w - 5, h - 5), radius=7, outline=(160, 110, 50, 200), width=2)
        im.save(ASSETS / out, 'PNG', optimize=True)
        print(out)
        return
    if not src.exists():
        print('SKIP btn', name)
        return
    im = rembg_png(src)
    im = crop_center_square(im, 0.88)
    im = polish(im.convert('RGB')).convert('RGBA')
    alpha = key_black(im, 38).split()[3]
    im.putalpha(alpha)
    im = im.resize(size, Image.Resampling.LANCZOS)
    im.save(ASSETS / out, 'PNG', optimize=True)
    print(out)


def process_icon(name: str, out: str):
    src = AI / f'slt-ai-icon-{name}.png'
    if not src.exists():
        print('SKIP icon', name)
        return
    im = rembg_png(src)
    im = crop_center_square(im, 0.8)
    im = polish(im.convert('RGB')).convert('RGBA')
    alpha = key_black(im, 38).split()[3]
    im.putalpha(alpha)
    im = im.resize((ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS)
    im.save(ASSETS / out, 'PNG', optimize=True)
    print(out)


def process_top_header():
    src = AI / 'slt-ai-top-header.png'
    if not src.exists():
        return
    im = polish(Image.open(src).convert('RGB'), sharp=1.15)
    im = crop_cover(im, 1080, 220)
    overlay = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    f = load_font(46, True)
    title = '经典水果机'
    bbox = d.textbbox((0, 0), title, font=f)
    tw = bbox[2] - bbox[0]
    for ox, oy in [(-2, 0), (2, 0), (0, 2)]:
        d.text(((1080 - tw) // 2 + ox, 72 + oy), title, fill=(40, 10, 0, 200), font=f)
    d.text(((1080 - tw) // 2, 72), title, fill=(255, 220, 100, 240), font=f)
    im = Image.alpha_composite(im.convert('RGBA'), overlay)
    im = key_dark_rgba(im, 50)
    im.save(ASSETS / 'top-header.png', 'PNG', optimize=True)
    print('top-header')


def key_dark_rgba(im: Image.Image, thresh: int = 48) -> Image.Image:
    im = im.convert('RGBA')
    arr = np.array(im)
    lum = arr[:, :, :3].astype(np.int16).sum(axis=2)
    arr[lum < thresh, 3] = 0
    return Image.fromarray(arr)


def punch_rect_rgba(im: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    im = im.convert('RGBA')
    arr = np.array(im)
    x0, y0, x1, y1 = box
    arr[y0:y1, x0:x1, 3] = 0
    return Image.fromarray(arr)


def process_machine_frame():
    src = AI / 'slt-ai-machine-frame.png'
    if not src.exists():
        return
    im = polish(Image.open(src).convert('RGBA'), sharp=1.15)
    im = crop_cover(im, 960, 720)
    w, h = im.size
    im = key_dark_rgba(im, 42)
    im = punch_rect_rgba(im, (int(w * 0.17), int(h * 0.11), int(w * 0.83), int(h * 0.89)))
    im.save(ASSETS / 'machine-frame.png', 'PNG', optimize=True)
    print('machine-frame')


def process_center_panel():
    w, h = 360, 260
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((4, 4, w - 5, h - 5), radius=14, fill=(8, 28, 12, 200))
    d.rounded_rectangle((8, 8, w - 9, h - 9), radius=12, outline=(60, 180, 80, 180), width=3)
    im.save(ASSETS / 'center-panel.png', 'PNG', optimize=True)
    print('center-panel')


def process_bottom_deco():
    src = AI / 'slt-ai-bottom-deco.png'
    if not src.exists():
        return
    im = polish(Image.open(src).convert('RGBA'), sharp=1.1)
    im = crop_cover(im, 1080, 300)
    im = key_dark_rgba(im, 48)
    im.save(ASSETS / 'bottom-deco.png', 'PNG', optimize=True)
    print('bottom-deco')


def process_splash():
    src = AI / 'slt-ai-splash.png'
    if not src.exists():
        return
    im = polish(Image.open(src).convert('RGB'), sharp=1.12)
    im = crop_portrait(im, CANVAS_W, CANVAS_H)
    overlay = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rectangle((0, CANVAS_H - 280, CANVAS_W, CANVAS_H), fill=(0, 0, 0, 120))
    f = load_font(52, True)
    title = '经典水果机'
    bbox = d.textbbox((0, 0), title, font=f)
    tw = bbox[2] - bbox[0]
    d.text(((CANVAS_W - tw) // 2, CANVAS_H - 200), title, fill=(255, 200, 80, 255), font=f)
    im = Image.alpha_composite(im.convert('RGBA'), overlay).convert('RGB')
    im.save(ASSETS / 'splash.png', 'PNG', optimize=True)
    print('splash')


def process_room_bg():
    src = AI / 'slt-ai-room-bg.png'
    if not src.exists():
        return
    im = polish(Image.open(src).convert('RGB'), contrast=1.05, color=1.06)
    im = crop_portrait(im, CANVAS_W, CANVAS_H)
    im.save(ASSETS / 'room-bg.jpg', 'JPEG', quality=93, optimize=True, progressive=True)
    print('room-bg')


def write_manifest():
    manifest = {
        'game': '经典水果机',
        'version': '2.0-ai',
        'symbols': ['apple', 'orange', 'lemon', 'watermelon', 'cherry', 'bell', 'bar', 'seven'],
        'ui': [
            'btn-start', 'btn-bet', 'btn-bet-on', 'btn-clear', 'btn-allbet',
            'icon-wallet', 'icon-coin', 'icon-prize',
            'slot-cell', 'slot-cell-lit', 'light-dot',
        ],
        'frames': ['top-header', 'machine-frame', 'center-panel', 'bottom-deco', 'room-bg', 'splash'],
        'aiSources': sorted(p.name for p in AI.glob('slt-ai-*.png')),
    }
    (ASSETS / 'element-manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8'
    )


def main():
    AI.mkdir(parents=True, exist_ok=True)
    SYMS.mkdir(parents=True, exist_ok=True)

    for sym in ['apple', 'orange', 'lemon', 'watermelon', 'cherry', 'bell', 'bar', 'seven']:
        process_symbol(sym)

    process_cell('slot-cell', 'slot-cell.png', lit=False)
    process_cell('slot-cell-lit', 'slot-cell-lit.png', lit=True)
    process_light_dot()

    process_btn('btn-start', 'btn-start.png', (120, 120))
    process_btn('btn-bet', 'btn-bet.png', (80, 56))
    process_btn('btn-bet-on', 'btn-bet-on.png', (80, 56))
    process_btn('btn-clear', 'btn-clear.png', (88, 52))
    process_btn('btn-allbet', 'btn-allbet.png', (88, 52))

    for name, out in [
        ('wallet', 'icon-wallet.png'),
        ('coin', 'icon-coin.png'),
        ('prize', 'icon-prize.png'),
    ]:
        process_icon(name, out)

    process_top_header()
    process_machine_frame()
    process_center_panel()
    process_bottom_deco()
    process_splash()
    process_room_bg()
    write_manifest()
    print('\nOK 水果机 AI 素材已导出 →', ASSETS)


if __name__ == '__main__':
    main()
