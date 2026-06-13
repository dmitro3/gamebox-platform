# -*- coding: utf-8 -*-
"""
777 经典拉霸 · AI 原稿 → PS 级成品素材
流程：AI 重绘原稿 → 黑底抠图/锐化/裁切 → 导出 tiles / UI / 背景
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

CANVAS_W, CANVAS_H = 1080, 1920
TILE_HD = 216
TILE_STD = 72
ICON_SIZE = 64

TILE_IDS = ['bar3', 'bar2', 'bar1', 'seven', 'watermelon', 'bell', 'cherry', 'orange', 'lemon']


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


def polish(im: Image.Image, contrast=1.08, color=1.06, sharp=1.15) -> Image.Image:
    im = ImageEnhance.Contrast(im).enhance(contrast)
    im = ImageEnhance.Color(im).enhance(color)
    im = ImageEnhance.Sharpness(im).enhance(sharp)
    return im


def rembg_png(path: Path) -> Image.Image:
    if not HAS_REMBG:
        return key_black(Image.open(path).convert('RGBA'))
    raw = path.read_bytes()
    out = rembg_remove(raw)
    return Image.open(BytesIO(out)).convert('RGBA')


def key_black(im: Image.Image, thresh: int = 28) -> Image.Image:
    """纯黑底 → 透明"""
    im = im.convert('RGBA')
    arr = np.array(im)
    rgb = arr[:, :, :3]
    dark = (rgb[:, :, 0] < thresh) & (rgb[:, :, 1] < thresh) & (rgb[:, :, 2] < thresh)
    arr[dark, 3] = 0
    return Image.fromarray(arr)


def crop_center_square(im: Image.Image, ratio: float = 0.82) -> Image.Image:
    w, h = im.size
    side = int(min(w, h) * ratio)
    x0 = (w - side) // 2
    y0 = (h - side) // 2
    return im.crop((x0, y0, x0 + side, y0 + side))


def crop_portrait(im: Image.Image, tw: int, th: int) -> Image.Image:
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


def crop_cover(im: Image.Image, tw: int, th: int) -> Image.Image:
    return crop_portrait(im, tw, th)


def process_tile(name: str):
    src = AI / f'lb-ai-tile-{name}.png'
    if not src.exists():
        print('SKIP missing', src.name)
        return
    im = rembg_png(src)
    im = crop_center_square(im, 0.88)
    im = polish(im.convert('RGB')).convert('RGBA')
    alpha = key_black(im).split()[3]
    im.putalpha(alpha)
    hd = im.resize((TILE_HD, TILE_HD), Image.Resampling.LANCZOS)
    std = hd.resize((TILE_STD, TILE_STD), Image.Resampling.LANCZOS)
    hd_dir = ASSETS / 'tiles' / 'hd'
    hd_dir.mkdir(parents=True, exist_ok=True)
    std_path = ASSETS / 'tiles' / f'{name}.png'
    hd_path = hd_dir / f'{name}@3x.png'
    std.save(std_path, 'PNG', optimize=True)
    hd.save(hd_path, 'PNG', optimize=True)
    shutil.copy2(src, ASSETS / 'tiles' / f'{name}-ai-source.png')
    print('tile', name)


def process_spin_btn():
    src = AI / 'lb-ai-spin-btn.png'
    if not src.exists():
        return
    im = rembg_png(src)
    im = im.resize((152, 152), Image.Resampling.LANCZOS)
    mask = Image.new('L', (152, 152), 0)
    ImageDraw.Draw(mask).ellipse((4, 4, 148, 148), fill=255)
    out = Image.new('RGBA', (152, 152), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    out = polish(out.convert('RGB')).convert('RGBA')
    out.putalpha(im.split()[3])
    out.save(ASSETS / 'spin-btn.png', 'PNG', optimize=True)
    shutil.copy2(src, ASSETS / 'spin-btn-ai-source.png')
    print('spin-btn OK')


def process_icon(name: str, out_name: str):
    src = AI / f'lb-ai-icon-{name}.png'
    if not src.exists():
        print('SKIP icon', name)
        return
    im = rembg_png(src)
    im = crop_center_square(im, 0.78)
    im = im.resize((ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS)
    im.save(ASSETS / out_name, 'PNG', optimize=True)
    print('icon', out_name)


def process_arrow(name: str, out_name: str):
    src = AI / f'lb-ai-arrow-{name}.png'
    if not src.exists():
        return
    im = rembg_png(src)
    im = crop_center_square(im, 0.6)
    im = im.resize((48, 48), Image.Resampling.LANCZOS)
    im.save(ASSETS / out_name, 'PNG', optimize=True)
    print('arrow', out_name)


def process_top_header():
    src = AI / 'lb-ai-top-header.png'
    if not src.exists():
        return
    im = polish(Image.open(src).convert('RGB'), contrast=1.05, color=1.08, sharp=1.12)
    im = crop_cover(im, 1080, 280)
    overlay = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    f7 = load_font(52, True)
    ft = load_font(36, True)
    for i, x in enumerate([320, 380, 440]):
        t = '7'
        bbox = d.textbbox((0, 0), t, font=f7)
        tw = bbox[2] - bbox[0]
        d.text((x - tw // 2, 60), t, fill=(255, 40, 40, 255), font=f7)
    title = '经典拉霸'
    bbox = d.textbbox((0, 0), title, font=ft)
    tw = bbox[2] - bbox[0]
    d.text(((1080 - tw) // 2 + 80, 130), title, fill=(255, 210, 120, 255), font=ft)
    im = Image.alpha_composite(im.convert('RGBA'), overlay).convert('RGB')
    im.save(ASSETS / 'top-header.png', 'PNG', optimize=True)
    shutil.copy2(src, ASSETS / 'top-header-ai-source.png')
    print('top-header OK')


def process_machine_frame():
    src = AI / 'lb-ai-machine-frame.png'
    if not src.exists():
        return
    im = polish(Image.open(src).convert('RGB'))
    im = crop_cover(im, 960, 520)
    im.save(ASSETS / 'machine-frame.png', 'PNG', optimize=True)
    shutil.copy2(src, ASSETS / 'machine-frame-ai-source.png')
    print('machine-frame OK')


def process_bottom_deco():
    src = AI / 'lb-ai-bottom-deco.png'
    if not src.exists():
        return
    im = polish(Image.open(src).convert('RGB'))
    im = crop_cover(im, 1080, 360)
    im.save(ASSETS / 'bottom-deco.png', 'PNG', optimize=True)
    shutil.copy2(src, ASSETS / 'bottom-deco-ai-source.png')
    print('bottom-deco OK')


def process_paytable_panel():
    src = AI / 'lb-ai-paytable-panel.png'
    if not src.exists():
        return
    im = polish(Image.open(src).convert('RGB'))
    im = crop_cover(im, 540, 200)
    im.save(ASSETS / 'paytable-panel.png', 'PNG', optimize=True)
    print('paytable-panel OK')


def process_splash():
    src = AI / 'lb-ai-splash.png'
    if not src.exists():
        return
    im = polish(Image.open(src).convert('RGB'))
    im = crop_portrait(im, CANVAS_W, CANVAS_H)
    overlay = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rectangle((0, CANVAS_H - 300, CANVAS_W, CANVAS_H), fill=(0, 0, 0, 140))
    f = load_font(48, True)
    title = '777 经典拉霸'
    bbox = d.textbbox((0, 0), title, font=f)
    tw = bbox[2] - bbox[0]
    d.text(((CANVAS_W - tw) // 2, CANVAS_H - 220), title, fill=(255, 200, 80, 255), font=f)
    im = Image.alpha_composite(im.convert('RGBA'), overlay).convert('RGB')
    im.save(ASSETS / 'splash.png', 'PNG', optimize=True)
    print('splash OK')


def process_room_bg():
    src = AI / 'lb-ai-room-bg.png'
    if not src.exists():
        return
    base = polish(Image.open(src).convert('RGB'))
    base = crop_portrait(base, CANVAS_W, CANVAS_H)
    base.save(ASSETS / 'room-bg.jpg', 'JPEG', quality=92, optimize=True, progressive=True)
    base.save(ASSETS / 'room-bg.png', 'PNG', optimize=True)
    shutil.copy2(src, ASSETS / 'room-bg-ai-source.png')
    layout = {
        'canvas': [CANVAS_W, CANVAS_H],
        'machineFrame': {'top': '22%', 'width': '88%', 'aspect': '960/520'},
        'statsBar': {'bottom': '28%', 'height': '360px'},
        'controls': {'bottom': '0', 'height': '22%'},
    }
    (ASSETS / 'element-manifest.json').write_text(
        json.dumps(layout, indent=2, ensure_ascii=False), encoding='utf-8'
    )
    print('room-bg OK')


def write_manifest():
    manifest = {
        'game': '777经典拉霸',
        'tiles': TILE_IDS,
        'ui': [
            'spin-btn', 'icon-wallet', 'icon-coin', 'icon-prize',
            'icon-turbo', 'icon-auto', 'icon-menu',
            'arrow-l', 'arrow-r', 'paytable-panel',
        ],
        'frames': ['top-header', 'machine-frame', 'bottom-deco', 'room-bg', 'splash'],
        'aiSources': sorted(p.name for p in AI.glob('lb-ai-*.png')),
    }
    (ASSETS / 'element-manifest.json').write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8'
    )


def main():
    AI.mkdir(parents=True, exist_ok=True)
    (ASSETS / 'tiles').mkdir(parents=True, exist_ok=True)

    for tid in TILE_IDS:
        process_tile(tid)

    process_spin_btn()
    for name, out in [
        ('wallet', 'icon-wallet.png'),
        ('coin', 'icon-coin.png'),
        ('prize', 'icon-prize.png'),
        ('turbo', 'icon-turbo.png'),
        ('auto', 'icon-auto.png'),
        ('menu', 'icon-menu.png'),
    ]:
        process_icon(name, out)

    process_arrow('l', 'arrow-l.png')
    process_arrow('r', 'arrow-r.png')
    process_top_header()
    process_machine_frame()
    process_bottom_deco()
    process_paytable_panel()
    process_splash()
    process_room_bg()
    write_manifest()
    print('\nOK 经典拉霸 PS 级素材已全部导出 →', ASSETS)


if __name__ == '__main__':
    main()
