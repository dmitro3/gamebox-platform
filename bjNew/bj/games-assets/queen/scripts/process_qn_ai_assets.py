# -*- coding: utf-8
"""
赏金女王 · AI 原稿 → PS 级成品素材
流程：AI 重绘原稿 → rembg/裁切/锐化 → 烘焙中文 → 合成 room-bg
"""
from __future__ import annotations

import json
import shutil
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
from rembg import remove as rembg_remove

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
AI = ASSETS / 'ai-sources'
MJ = ROOT.parent / 'mahjong' / 'assets'

CANVAS_W, CANVAS_H = 1080, 1920
TILE_HD = (288, 360)
TILE_STD = (192, 240)
ICON_SIZE = 64

TILE_IDS = ['queen', 'map', 'pistol', 'compass', 'a', 'k', 'q', 'wild', 'scatter']
TILE_LABELS = {'wild': '百搭', 'scatter': '夺宝'}


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


def polish(im: Image.Image, contrast=1.06, color=1.05, sharp=1.12) -> Image.Image:
    im = ImageEnhance.Contrast(im).enhance(contrast)
    im = ImageEnhance.Color(im).enhance(color)
    im = ImageEnhance.Sharpness(im).enhance(sharp)
    return im


def rembg_png(path: Path) -> Image.Image:
    raw = path.read_bytes()
    out = rembg_remove(raw)
    return Image.open(BytesIO(out)).convert('RGBA')


def crop_portrait(im: Image.Image, tw: int, th: int) -> Image.Image:
    """中心裁切为 tw:th"""
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


def bake_tile_label(im: Image.Image, text: str) -> Image.Image:
    im = im.convert('RGBA')
    d = ImageDraw.Draw(im)
    f = load_font(max(22, im.width // 9), True)
    bbox = d.textbbox((0, 0), text, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (im.width - tw) // 2
    y = im.height - th - int(im.height * 0.06)
    # 描边
    for ox, oy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
        d.text((x + ox, y + oy), text, fill=(40, 20, 0, 220), font=f)
    d.text((x, y), text, fill=(255, 220, 80, 255), font=f)
    return im


def process_tile(name: str):
    src = AI / f'qn-ai-tile-{name}.png'
    if not src.exists():
        print('SKIP missing', src.name)
        return
    im = Image.open(src).convert('RGB')
    im = polish(im)
    hd = crop_cover(im, *TILE_HD)
    std = hd.resize(TILE_STD, Image.Resampling.LANCZOS)
    if name in TILE_LABELS:
        hd = bake_tile_label(hd, TILE_LABELS[name])
        std = bake_tile_label(std, TILE_LABELS[name])
    hd_dir = ASSETS / 'tiles' / 'hd'
    hd_dir.mkdir(parents=True, exist_ok=True)
    std_path = ASSETS / 'tiles' / f'{name}.png'
    hd_path = hd_dir / f'{name}@3x.png'
    ai_copy = ASSETS / 'tiles' / f'{name}-ai-source.png'
    std.save(std_path, 'PNG', optimize=True)
    hd.save(hd_path, 'PNG', optimize=True)
    shutil.copy2(src, ai_copy)
    print('tile', name, std_path.stat().st_size)


def process_spin_btn():
    src = AI / 'qn-ai-spin-btn.png'
    if not src.exists():
        return
    rgba = rembg_png(src)
    rgba = _defringe(np.array(rgba))
    im = Image.fromarray(rgba)
    im = im.resize((512, 512), Image.Resampling.LANCZOS)
    # 圆形裁切
    mask = Image.new('L', (512, 512), 0)
    ImageDraw.Draw(mask).ellipse((8, 8, 504, 504), fill=255)
    out = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    out = polish(out.convert('RGB')).convert('RGBA')
    out.putalpha(im.split()[3])
    out.save(ASSETS / 'spin-btn.png', 'PNG', optimize=True)
    shutil.copy2(src, ASSETS / 'spin-btn-ai-source.png')
    print('spin-btn OK')


def _defringe(rgba: np.ndarray) -> np.ndarray:
    out = rgba.copy()
    alpha = out[:, :, 3].astype(np.float32)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 0.8)
    out[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    rgb = out[:, :, :3]
    dark = (rgb[:, :, 0] < 40) & (rgb[:, :, 1] < 40) & (rgb[:, :, 2] < 40)
    semi = (out[:, :, 3] > 0) & (out[:, :, 3] < 240)
    out[dark & semi, 3] = 0
    return out


def process_top_header():
    src = AI / 'qn-ai-top-header-wind.png'
    if not src.exists():
        src = AI / 'qn-ai-top-header.png'
    if not src.exists():
        return
    im = polish(Image.open(src).convert('RGB'), contrast=1.04, color=1.08, sharp=1.14)
    w, h = im.size
    nh = int(h * 1080 / w)
    im = im.resize((1080, nh), Image.Resampling.LANCZOS)
    im.save(ASSETS / 'top-header.png', 'PNG', optimize=True)
    shutil.copy2(src, ASSETS / 'top-header-ai-source.png')
    # 四门炮管 plaque 位置（对齐炮口 x1/x2/x3/x5）
    cannon_slots = [
        {'left': 0.082, 'top': 0.776, 'width': 0.178},
        {'left': 0.292, 'top': 0.776, 'width': 0.178},
        {'left': 0.502, 'top': 0.776, 'width': 0.178},
        {'left': 0.712, 'top': 0.776, 'width': 0.178},
    ]
    slots = {
        'size': [1080, nh],
        'slots': [
            {'label': lb, 'goldOverlay': lay}
            for lb, lay in zip(('x1', 'x2', 'x3', 'x5'), cannon_slots)
        ],
    }
    (ASSETS / 'top-header-slots.json').write_text(
        json.dumps(slots, indent=2, ensure_ascii=False), encoding='utf-8'
    )
    print('top-header', im.size, 'from', src.name)


def process_bottom_deco():
    src = AI / 'qn-ai-bottom-deco.png'
    if not src.exists():
        return
    im = polish(Image.open(src).convert('RGB'))
    im = crop_cover(im, 1536, 360)
    im.save(ASSETS / 'bottom-deco.png', 'PNG', optimize=True)
    shutil.copy2(src, ASSETS / 'bottom-deco-ai-source.png')
    print('bottom-deco OK')


def process_splash():
    src = AI / 'qn-ai-splash.png'
    if not src.exists():
        return
    im = polish(Image.open(src).convert('RGB'))
    im = crop_portrait(im, CANVAS_W, CANVAS_H)
    overlay = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rectangle((0, CANVAS_H - 280, CANVAS_W, CANVAS_H), fill=(0, 0, 0, 120))
    f = load_font(56, True)
    title = '赏金女王'
    bbox = d.textbbox((0, 0), title, font=f)
    tw = bbox[2] - bbox[0]
    d.text(((CANVAS_W - tw) // 2, CANVAS_H - 200), title, fill=(255, 210, 100, 255), font=f)
    im = Image.alpha_composite(im.convert('RGBA'), overlay).convert('RGB')
    im.save(ASSETS / 'splash.png', 'PNG', optimize=True)
    print('splash OK')


def process_room_bg():
    src = AI / 'qn-ai-room-bg.png'
    frame_src = AI / 'qn-ai-reel-frame.png'
    if not src.exists():
        return
    base = polish(Image.open(src).convert('RGB'))
    base = crop_portrait(base, CANVAS_W, CANVAS_H)

    if frame_src.exists():
        frame_rgb = Image.open(frame_src).convert('RGB')
        # 柔化合成绳框到转轴区
        body_y = int(CANVAS_H * 0.325)
        body_h = int(CANVAS_H * 0.355)
        fw = int(CANVAS_W * 0.92)
        fh = body_h
        frame = crop_cover(frame_rgb, fw, fh)
        frame = frame.filter(ImageFilter.GaussianBlur(0.3))
        x = (CANVAS_W - fw) // 2
        base.paste(frame, (x, body_y))

    base.save(ASSETS / 'room-bg.png', 'PNG', optimize=True)
    base.save(ASSETS / 'room-bg.jpg', 'JPEG', quality=93, optimize=True, progressive=True)
    shutil.copy2(src, ASSETS / 'room-bg-ai-source.png')
    layout = '''\
:root {
  --qn-body-y: 37.500%;
  --qn-foot-y: 77.917%;
  --qn-foot-h: 22.083%;
  --qn-ctrl-mask-y: 63.000%;
  --qn-tile-cols: 5;
  --qn-tile-rows: 3;
  --qn-deco-ar: 1536 / 360;
}'''
    (ASSETS / 'room-bg-layout.txt').write_text(layout, encoding='utf-8')
    print('room-bg OK')


def process_icon(name: str, out_name: str):
    src = AI / f'qn-ai-icon-{name}.png'
    if not src.exists():
        return
    try:
        im = rembg_png(src)
    except Exception:
        im = Image.open(src).convert('RGBA')
    im = im.resize((ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS)
    im.save(ASSETS / out_name, 'PNG', optimize=True)
    print('icon', out_name)


def process_mult_overlays():
    """炮口倍数高亮：激活时金红发光 plaque"""
    out_dir = ASSETS / 'mult-active'
    out_dir.mkdir(parents=True, exist_ok=True)
    for label in ('x1', 'x2', 'x3', 'x5'):
        w, h = 200, 72
        img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        # 木牌底 + 金边（对齐炮口铭牌）
        d.rounded_rectangle((2, 2, w - 3, h - 3), radius=8, fill=(80, 38, 22, 200))
        d.rounded_rectangle((2, 2, w - 3, h - 3), radius=8, outline=(255, 210, 90, 255), width=3)
        d.rounded_rectangle((6, 6, w - 7, h - 7), radius=6, outline=(255, 160, 60, 180), width=2)
        # 外发光
        glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.rounded_rectangle((0, 0, w - 1, h - 1), radius=10, outline=(255, 120, 40, 120), width=6)
        glow = glow.filter(ImageFilter.GaussianBlur(4))
        img = Image.alpha_composite(glow, img)
        d = ImageDraw.Draw(img)
        f = load_font(32, True)
        text = label.upper().replace('X', 'x') if label.startswith('x') else label
        bbox = d.textbbox((0, 0), text, font=f)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        tx, ty = (w - tw) // 2, (h - th) // 2 - 2
        for ox, oy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            d.text((tx + ox, ty + oy), text, fill=(120, 30, 10, 255), font=f)
        d.text((tx, ty), text, fill=(255, 240, 160, 255), font=f)
        img.save(out_dir / f'{label}.png', 'PNG', optimize=True)
    print('mult-active OK')


def copy_misc():
    for name in ('msg-orn-left.svg', 'msg-orn-right.svg'):
        src = MJ / name
        if src.exists():
            shutil.copy2(src, ASSETS / name)


def main():
    if not AI.exists():
        raise FileNotFoundError(f'缺少 AI 原稿目录: {AI}')
    ASSETS.mkdir(parents=True, exist_ok=True)
    for tid in TILE_IDS:
        process_tile(tid)
    process_top_header()
    process_bottom_deco()
    process_room_bg()
    process_spin_btn()
    process_splash()
    process_icon('wallet', 'qn-icon-wallet.png')
    process_icon('coin', 'qn-icon-coin.png')
    process_icon('prize', 'qn-icon-prize.png')
    process_mult_overlays()
    copy_misc()
    print('\n=== DONE ===', ASSETS)


if __name__ == '__main__':
    main()
