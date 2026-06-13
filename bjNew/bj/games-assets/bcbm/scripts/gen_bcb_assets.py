# -*- coding: utf-8 -*-
"""奔驰宝马 · 一键生成全部素材"""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from bcb_draw_common import (
    W, H, arcade_bg, lerp_rgb, load_font, plastic_metal, radial_glow, silver_text,
)

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
SYMS = ASSETS / 'symbols'
SYMS.mkdir(parents=True, exist_ok=True)

CAR_SYMBOLS = [
    ('benz', '奔驰', (175, 178, 188)),
    ('bmw', '宝马', (28, 78, 168)),
    ('audi', '奥迪', (58, 62, 68)),
    ('vw', '大众', (52, 108, 178)),
    ('porsche', '保时捷', (196, 34, 38)),
    ('lambo', '兰博', (236, 188, 28)),
    ('maserati', '玛莎', (24, 42, 92)),
    ('ferrari', '法拉利', (220, 22, 32)),
]


def save_jpg(im: Image.Image, path: Path, q: int = 92):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert('RGB').save(path, 'JPEG', quality=q, optimize=True)
    print('OK', path.relative_to(ROOT))


def save_png(im: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'PNG', optimize=True)
    print('OK', path.relative_to(ROOT))


def _sym_canvas(size: int = 96) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def _draw_car_side(d: ImageDraw.ImageDraw, cx: int, cy: int, body, accent=None):
    accent = accent or tuple(max(0, c - 35) for c in body[:3])
    d.rounded_rectangle((cx - 34, cy - 6, cx + 34, cy + 14), radius=6, fill=body)
    d.rounded_rectangle((cx - 20, cy - 20, cx + 10, cy - 2), radius=5, fill=body)
    d.polygon([(cx - 18, cy - 2), (cx + 8, cy - 2), (cx + 14, cy - 18), (cx - 12, cy - 18)], fill=accent)
    d.ellipse((cx - 26, cy + 10, cx - 10, cy + 26), fill=(24, 24, 28))
    d.ellipse((cx + 10, cy + 10, cx + 26, cy + 26), fill=(24, 24, 28))
    d.ellipse((cx - 22, cy + 14, cx - 14, cy + 22), fill=(90, 95, 105, 120))
    d.ellipse((cx + 14, cy + 14, cx + 22, cy + 22), fill=(90, 95, 105, 120))


def draw_car_symbol(sym_id: str, label: str, body_color):
    s = 96
    im, d = _sym_canvas(s)
    cx, cy = s // 2, s // 2 - 6
    _draw_car_side(d, cx, cy, body_color)
    if sym_id == 'bmw':
        d.ellipse((cx + 18, cy - 16, cx + 30, cy - 4), fill=(255, 255, 255, 180))
    if sym_id == 'audi':
        for i in range(4):
            d.ellipse((cx - 8 + i * 5, cy - 18, cx - 4 + i * 5, cy - 14), outline=(200, 205, 215), width=1)
    if sym_id == 'ferrari':
        d.polygon([(cx - 34, cy + 2), (cx - 28, cy - 8), (cx - 22, cy + 2)], fill=(255, 220, 0))
    f = load_font(16, False)
    bbox = d.textbbox((0, 0), label, font=f)
    tw = bbox[2] - bbox[0]
    d.text(((s - tw) // 2, 72), label, fill=(230, 236, 248), font=f)
    save_png(im, SYMS / f'{sym_id}.png')


def draw_slot_cell(lit: bool = False):
    s = 96
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if lit:
        d.rounded_rectangle((2, 2, s - 3, s - 3), radius=10, fill=(30, 50, 90, 255))
        d.rounded_rectangle((4, 4, s - 5, s - 5), radius=9, fill=(16, 28, 52, 255))
        d.rounded_rectangle((6, 6, s - 7, s - 7), radius=8, outline=(140, 190, 255, 255), width=3)
        glow = radial_glow(s, (100, 160, 255), 8)
        im = Image.alpha_composite(glow, im)
    else:
        d.rounded_rectangle((4, 4, s - 5, s - 5), radius=8, fill=(14, 20, 36, 255))
        d.rounded_rectangle((6, 6, s - 7, s - 7), radius=7, outline=(50, 70, 110, 200), width=2)
        d.rounded_rectangle((8, 8, s - 9, s - 9), radius=6, fill=(10, 14, 26, 255))
    save_png(im, ASSETS / ('slot-cell-lit.png' if lit else 'slot-cell.png'))


def draw_light_dot():
    s = 56
    glow = radial_glow(s, (120, 180, 255), 4)
    d = ImageDraw.Draw(glow)
    cx = s // 2
    d.ellipse((cx - 10, cx - 10, cx + 10, cx + 10), fill=(210, 235, 255, 255))
    d.ellipse((cx - 5, cx - 5, cx + 5, cx + 5), fill=(255, 255, 255, 220))
    save_png(glow, ASSETS / 'light-dot.png')


def draw_btn_start():
    s = 120
    base = plastic_metal(s, s, (52, 92, 168), (24, 44, 88))
    d = ImageDraw.Draw(base)
    d.ellipse((8, 8, s - 9, s - 9), outline=(180, 210, 255, 200), width=4)
    f = load_font(28)
    silver_text(d, (s // 2 - 28, s // 2 - 18), '开始', f)
    save_png(base, ASSETS / 'btn-start.png')


def draw_btn_small(label: str, name: str):
    w, h = 88, 52
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((2, 2, w - 3, h - 3), radius=8, fill=(24, 36, 62, 255))
    d.rounded_rectangle((4, 4, w - 5, h - 5), radius=7, outline=(90, 130, 190, 255), width=2)
    f = load_font(18)
    bbox = d.textbbox((0, 0), label, font=f)
    tw = bbox[2] - bbox[0]
    d.text(((w - tw) // 2, 14), label, fill=(210, 228, 255), font=f)
    save_png(im, ASSETS / name)


def draw_icon(kind: str):
    s = 64
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((4, 4, s - 5, s - 5), fill=(24, 36, 58, 255), outline=(140, 170, 220, 255), width=2)
    cx = s // 2
    if kind == 'wallet':
        d.rounded_rectangle((18, 22, 46, 44), radius=5, fill=(180, 200, 230))
        d.ellipse((36, 28, 48, 40), fill=(120, 150, 190))
    elif kind == 'coin':
        d.ellipse((18, 18, 46, 46), fill=(180, 200, 240))
        f = load_font(20)
        d.text((22, 18), '$', fill=(40, 60, 100), font=f)
    else:
        d.polygon([(cx, 16), (cx + 18, 42), (cx - 18, 42)], fill=(180, 200, 240))
        d.rectangle((cx - 8, 42, cx + 8, 50), fill=(120, 150, 190))
    save_png(im, ASSETS / f'icon-{kind}.png')


def draw_center_panel():
    w, h = 360, 260
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((4, 4, w - 5, h - 5), radius=14, fill=(8, 12, 22, 255))
    d.rounded_rectangle((8, 8, w - 9, h - 9), radius=12, outline=(60, 90, 140, 255), width=3)
    for y in range(20, h - 20, 6):
        d.line([(16, y), (w - 17, y)], fill=(30, 50, 90, 40), width=1)
    d.rounded_rectangle((14, 14, w - 15, h - 15), radius=10, outline=(80, 120, 180, 80), width=2)
    save_png(im, ASSETS / 'center-panel.png')


def draw_machine_frame():
    w, h = 960, 720
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    body = plastic_metal(w, h, (48, 78, 138), (18, 32, 62))
    im = Image.alpha_composite(im, body)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((24, 24, w - 25, h - 25), radius=20, outline=(180, 210, 255, 180), width=4)
    d.rounded_rectangle((40, 40, w - 41, h - 41), radius=16, fill=(10, 14, 26, 255))
    d.rounded_rectangle((44, 44, w - 45, h - 45), radius=14, outline=(50, 80, 130, 255), width=3)
    for i in range(12):
        x = 80 + i * 68
        d.ellipse((x, 52, x + 14, 66), fill=(140, 190, 255, 200 if i % 2 else 120))
    save_png(im, ASSETS / 'machine-frame.png')


def draw_top_header():
    w, h = 1080, 220
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    grad = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(h):
        t = y / h
        c = lerp_rgb((28, 48, 88), (12, 20, 40), t)
        gd.line([(0, y), (w, y)], fill=(*c, 230))
    im = Image.alpha_composite(im, grad)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((40, 30, w - 41, h - 20), radius=18, outline=(160, 190, 240, 220), width=4)
    f = load_font(52)
    silver_text(d, (w // 2 - 155, 68), '奔驰宝马', f)
    f2 = load_font(22, False)
    d.text((w // 2 - 120, 138), '豪车跑灯 · 押中即赢', fill=(170, 200, 255), font=f2)
    save_png(im, ASSETS / 'top-header.png')


def draw_splash():
    bg = arcade_bg(W, H)
    im = bg.convert('RGBA')
    d = ImageDraw.Draw(im)
    f = load_font(72)
    silver_text(d, (W // 2 - 200, 520), '奔驰宝马', f)
    f2 = load_font(32, False)
    d.text((W // 2 - 210, 620), '奔驰 · 宝马 · 奥迪 · 法拉利', fill=(170, 200, 255), font=f2)
    cx, cy, r = W // 2, 980, 200
    for i in range(24):
        a = i / 24 * math.pi * 2 - math.pi / 2
        x = cx + math.cos(a) * r
        y = cy + math.sin(a) * r
        d.ellipse((x - 18, y - 18, x + 18, y + 18), fill=(16, 24, 44, 200), outline=(140, 180, 240, 180), width=2)
    d.ellipse((cx - 80, cy - 60, cx + 80, cy + 60), fill=(8, 12, 22, 220), outline=(80, 120, 180, 200), width=3)
    f3 = load_font(28)
    d.text((cx - 72, cy - 16), '跑灯开奖', fill=(140, 190, 255), font=f3)
    save_png(im, ASSETS / 'splash.png')


def draw_room_bg():
    save_jpg(arcade_bg(), ASSETS / 'room-bg.jpg')


def write_manifest():
    manifest = {
        'version': '1.0',
        'game': '奔驰宝马',
        'symbols': [s[0] for s in CAR_SYMBOLS],
        'ring_size': 24,
    }
    (ASSETS / 'element-manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8'
    )
    print('OK element-manifest.json')


def main():
    print('>> 生成车标符号')
    for sym_id, label, color in CAR_SYMBOLS:
        draw_car_symbol(sym_id, label, color)

    print('>> 生成灯位与光效')
    draw_slot_cell(False)
    draw_slot_cell(True)
    draw_light_dot()

    print('>> 生成按钮与图标')
    draw_btn_start()
    draw_btn_small('清除', 'btn-clear.png')
    draw_btn_small('全押', 'btn-allbet.png')
    for k in ('wallet', 'coin', 'prize'):
        draw_icon(k)

    print('>> 生成框架与背景')
    draw_center_panel()
    draw_machine_frame()
    draw_top_header()
    draw_splash()
    draw_room_bg()
    write_manifest()
    print('\n全部素材已导出到 assets/')


if __name__ == '__main__':
    main()
