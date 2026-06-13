# -*- coding: utf-8 -*-
"""龙虎斗 · 一键生成全部素材"""
from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
SYMS = ASSETS / 'symbols'
SLOTS_ASSETS = ROOT.parent / 'slots' / 'assets'
W, H = 1080, 1920


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_rgb(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def load_font(size: int, bold: bool = True):
    for p in (
        'C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc',
        'C:/Windows/Fonts/simhei.ttf',
        'C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf',
    ):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def save_jpg(im: Image.Image, path: Path, q: int = 92):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert('RGB').save(path, 'JPEG', quality=q, optimize=True)
    print('OK', path.relative_to(ROOT))


def save_png(im: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'PNG', optimize=True)
    print('OK', path.relative_to(ROOT))


def arcade_bg(w: int = W, h: int = H) -> Image.Image:
    img = Image.new('RGB', (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        base = lerp_rgb((12, 18, 32), (28, 38, 68), t ** 0.6)
        base = lerp_rgb(base, (8, 12, 22), t ** 2.2)
        for x in range(w):
            glow = 0
            glow += max(0, 1 - math.hypot(x - w * 0.3, y - h * 0.4) / 220) * 40
            glow += max(0, 1 - math.hypot(x - w * 0.7, y - h * 0.45) / 200) * 35
            px[x, y] = tuple(max(0, min(255, int(base[i] + (glow if i == 0 else glow * 0.35)))) for i in range(3))
    return img.filter(ImageFilter.GaussianBlur(1.0))


def draw_dragon():
    s = 96
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((8, 20, 88, 80), fill=(200, 40, 28))
    d.polygon([(20, 30), (48, 12), (76, 30), (68, 50), (28, 50)], fill=(255, 180, 60))
    d.ellipse((36, 38, 48, 50), fill=(255, 255, 200))
    d.ellipse((52, 38, 64, 50), fill=(255, 255, 200))
    f = load_font(28)
    d.text((30, 58), '龙', fill=(255, 240, 180), font=f)
    save_png(im, SYMS / 'dragon.png')


def draw_tiger():
    s = 96
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((10, 22, 86, 78), fill=(240, 160, 40))
    for i in range(5):
        x = 22 + i * 12
        d.line([(x, 28), (x + 4, 70)], fill=(180, 100, 20), width=2)
    d.ellipse((34, 36, 46, 48), fill=(30, 20, 10))
    d.ellipse((54, 36, 66, 48), fill=(30, 20, 10))
    d.polygon([(38, 52), (48, 60), (58, 52), (48, 56)], fill=(220, 60, 40))
    f = load_font(28)
    d.text((30, 58), '虎', fill=(255, 250, 220), font=f)
    save_png(im, SYMS / 'tiger.png')


def draw_tie():
    s = 96
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((12, 12, 84, 84), radius=14, fill=(40, 100, 60))
    d.rounded_rectangle((16, 16, 80, 80), radius=12, outline=(180, 240, 180, 200), width=3)
    f = load_font(36)
    d.text((28, 24), '和', fill=(220, 255, 220), font=f)
    save_png(im, SYMS / 'tie.png')


def draw_table_frame():
    w, h = 960, 680
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((8, 8, w - 9, h - 9), radius=24, fill=(60, 38, 18, 255))
    d.rounded_rectangle((16, 16, w - 17, h - 17), radius=20, outline=(200, 150, 60, 220), width=5)
    d.rounded_rectangle((28, 28, w - 29, h - 29), radius=16, outline=(120, 80, 40, 180), width=3)
    for i in range(10):
        x = 60 + i * 84
        d.ellipse((x, 20, x + 12, 32), fill=(255, 200, 60, 180 if i % 2 else 100))
    save_png(im, ASSETS / 'table-frame.png')


def draw_splash():
    bg = arcade_bg(W, H)
    im = bg.convert('RGBA')
    d = ImageDraw.Draw(im)
    f = load_font(72)
    bbox = d.textbbox((0, 0), '龙虎斗', font=f)
    tw = bbox[2] - bbox[0]
    d.text((W // 2 - tw // 2, 480), '龙虎斗', fill=(255, 220, 100))
    f2 = load_font(30, False)
    d.text((W // 2 - 150, 580), '龙争虎斗 · 押中即赢', fill=(200, 220, 255))
    cx = W // 2
    d.rounded_rectangle((cx - 200, 820, cx + 200, 1180), radius=20, fill=(18, 50, 32, 220), outline=(200, 160, 60, 200), width=4)
    d.text((cx - 60, 960), '龙  VS  虎', fill=(255, 230, 150), font=load_font(36))
    save_png(im, ASSETS / 'splash.png')


def copy_shared():
    SYMS.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)
    shared = [
        'btn-start.png', 'btn-clear.png', 'btn-allbet.png',
        'icon-wallet.png', 'icon-coin.png', 'icon-prize.png'
    ]
    for name in shared:
        src = SLOTS_ASSETS / name
        if src.exists():
            shutil.copy2(src, ASSETS / name)
            print('COPY', name)


def write_manifest():
    manifest = {
        'version': '1.0',
        'game': '龙虎斗',
        'sides': ['dragon', 'tiger', 'tie'],
    }
    (ASSETS / 'element-manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8'
    )
    print('OK element-manifest.json')


def main():
    print('>> 复制共用按钮/图标')
    copy_shared()

    print('>> 生成符号')
    draw_dragon()
    draw_tiger()
    draw_tie()

    print('>> 生成牌桌与背景')
    draw_table_frame()
    draw_splash()
    save_jpg(arcade_bg(), ASSETS / 'room-bg.jpg')
    write_manifest()
    print('\n全部素材已导出到 assets/')


if __name__ == '__main__':
    main()
