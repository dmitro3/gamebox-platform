# -*- coding: utf-8 -*-
"""经典水果机 · 一键生成全部 PS 级素材"""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from slt_draw_common import (
    W, H, arcade_bg, gold_text, lerp, lerp_rgb, load_font, plastic_red, radial_glow,
)

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
SYMS = ASSETS / 'symbols'
SYMS.mkdir(parents=True, exist_ok=True)


def save_jpg(im: Image.Image, path: Path, q: int = 92):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert('RGB').save(path, 'JPEG', quality=q, optimize=True)
    print('OK', path.relative_to(ROOT))


def save_png(im: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'PNG', optimize=True)
    print('OK', path.relative_to(ROOT))


# ── 水果符号绘制 ──────────────────────────────────────────────

def _sym_canvas(size: int = 96) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def draw_apple():
    s = 96
    im, d = _sym_canvas(s)
    cx, cy = s // 2, s // 2 + 6
    d.ellipse((cx - 30, cy - 28, cx + 30, cy + 30), fill=(180, 28, 28))
    d.ellipse((cx - 18, cy - 22, cx + 8, cy + 2), fill=(255, 90, 80, 120))
    d.ellipse((cx - 8, cy + 8, cx + 26, cy + 28), fill=(120, 18, 18))
    d.line([(cx + 2, cy - 28), (cx + 6, cy - 42)], fill=(80, 140, 40), width=3)
    d.ellipse((cx + 8, cy - 46, cx + 22, cy - 34), fill=(60, 160, 50))
    save_png(im, SYMS / 'apple.png')


def draw_orange():
    s = 96
    im, d = _sym_canvas(s)
    cx, cy = s // 2, s // 2 + 4
    d.ellipse((cx - 30, cy - 30, cx + 30, cy + 30), fill=(240, 140, 30))
    d.ellipse((cx - 20, cy - 22, cx + 6, cy + 4), fill=(255, 200, 100, 100))
    for a in range(0, 360, 22):
        rad = a * math.pi / 180
        x1 = cx + math.cos(rad) * 8
        y1 = cy + math.sin(rad) * 8
        x2 = cx + math.cos(rad) * 28
        y2 = cy + math.sin(rad) * 28
        d.line([(x1, y1), (x2, y2)], fill=(220, 120, 20, 80), width=1)
    d.ellipse((cx - 4, cy - 36, cx + 4, cy - 28), fill=(60, 120, 40))
    save_png(im, SYMS / 'orange.png')


def draw_lemon():
    s = 96
    im, d = _sym_canvas(s)
    cx, cy = s // 2, s // 2 + 2
    d.ellipse((cx - 32, cy - 22, cx + 32, cy + 26), fill=(250, 220, 50))
    d.ellipse((cx - 20, cy - 14, cx + 10, cy + 8), fill=(255, 245, 140, 110))
    d.arc((cx - 32, cy - 22, cx + 32, cy + 26), 200, 340, fill=(210, 170, 20), width=2)
    save_png(im, SYMS / 'lemon.png')


def draw_watermelon():
    s = 96
    im, d = _sym_canvas(s)
    cx, cy = s // 2, s // 2 + 4
    d.pieslice((cx - 34, cy - 30, cx + 34, cy + 34), 200, 340, fill=(40, 150, 55))
    d.pieslice((cx - 30, cy - 26, cx + 30, cy + 30), 205, 335, fill=(55, 180, 70))
    for i in range(7):
        x = cx - 18 + i * 6
        d.ellipse((x - 2, cy - 4, x + 2, cy + 4), fill=(20, 90, 30))
    d.arc((cx - 34, cy - 30, cx + 34, cy + 34), 200, 340, fill=(180, 50, 50), width=5)
    save_png(im, SYMS / 'watermelon.png')


def draw_cherry():
    s = 96
    im, d = _sym_canvas(s)
    d.line([(30, 18), (48, 36), (66, 18)], fill=(60, 130, 40), width=3)
    d.ellipse((22, 38, 46, 62), fill=(200, 25, 45))
    d.ellipse((26, 42, 38, 54), fill=(255, 80, 100, 90))
    d.ellipse((50, 40, 74, 64), fill=(190, 20, 40))
    d.ellipse((54, 44, 66, 56), fill=(255, 70, 90, 90))
    save_png(im, SYMS / 'cherry.png')


def draw_bell():
    s = 96
    im, d = _sym_canvas(s)
    cx = s // 2
    d.ellipse((cx - 6, cy := 18, cx + 6, cy + 10), fill=(200, 160, 40))
    d.polygon([(cx - 28, 28), (cx + 28, 28), (cx + 22, 62), (cx - 22, 62)], fill=(255, 210, 60))
    d.polygon([(cx - 22, 62), (cx + 22, 62), (cx + 18, 72), (cx - 18, 72)], fill=(200, 150, 30))
    d.ellipse((cx - 28, 28, cx + 28, 40), fill=(255, 240, 150, 120))
    d.ellipse((cx - 6, 72, cx + 6, 84), fill=(220, 170, 40))
    save_png(im, SYMS / 'bell.png')


def draw_bar():
    s = 96
    im, d = _sym_canvas(s)
    d.rounded_rectangle((10, 24, 86, 72), radius=8, fill=(20, 20, 28))
    d.rounded_rectangle((12, 26, 84, 70), radius=7, outline=(80, 80, 100), width=2)
    f = load_font(22)
    for i, t in enumerate(['B', 'A', 'R']):
        d.text((22 + i * 22, 34), t, fill=(245, 245, 255), font=f)
    save_png(im, SYMS / 'bar.png')


def draw_seven():
    s = 96
    im, d = _sym_canvas(s)
    f = load_font(52)
    gold_text(d, (14, 18), '77', f, fill=(255, 60, 50))
    d.rounded_rectangle((8, 12, 88, 80), radius=10, outline=(255, 200, 60, 120), width=2)
    save_png(im, SYMS / 'seven.png')


# ── UI 元素 ──────────────────────────────────────────────────

def draw_slot_cell(lit: bool = False):
    s = 96
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if lit:
        d.rounded_rectangle((2, 2, s - 3, s - 3), radius=10, fill=(80, 50, 10, 255))
        d.rounded_rectangle((4, 4, s - 5, s - 5), radius=9, fill=(40, 24, 8, 255))
        d.rounded_rectangle((6, 6, s - 7, s - 7), radius=8, outline=(255, 200, 60, 255), width=3)
        glow = radial_glow(s, (255, 200, 60), 8)
        im = Image.alpha_composite(glow, im)
    else:
        d.rounded_rectangle((4, 4, s - 5, s - 5), radius=8, fill=(28, 16, 10, 255))
        d.rounded_rectangle((6, 6, s - 7, s - 7), radius=7, outline=(60, 38, 22, 200), width=2)
        d.rounded_rectangle((8, 8, s - 9, s - 9), radius=6, fill=(18, 10, 6, 255))
    save_png(im, ASSETS / ('slot-cell-lit.png' if lit else 'slot-cell.png'))


def draw_light_dot():
    s = 56
    glow = radial_glow(s, (255, 220, 80), 4)
    d = ImageDraw.Draw(glow)
    cx = s // 2
    d.ellipse((cx - 10, cx - 10, cx + 10, cx + 10), fill=(255, 250, 200, 255))
    d.ellipse((cx - 5, cx - 5, cx + 5, cx + 5), fill=(255, 255, 255, 220))
    save_png(glow, ASSETS / 'light-dot.png')


def draw_btn_start():
    s = 120
    base = plastic_red(s, s, (240, 50, 35), (140, 20, 12))
    d = ImageDraw.Draw(base)
    d.ellipse((8, 8, s - 9, s - 9), outline=(255, 200, 80, 200), width=4)
    f = load_font(28)
    gold_text(d, (s // 2 - 28, s // 2 - 18), '开始', f)
    save_png(base, ASSETS / 'btn-start.png')


def draw_btn_bet(on: bool = False):
    w, h = 80, 56
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    fill = (255, 200, 50, 255) if on else (50, 32, 20, 255)
    border = (255, 220, 100, 255) if on else (90, 60, 35, 255)
    d.rounded_rectangle((2, 2, w - 3, h - 3), radius=8, fill=fill)
    d.rounded_rectangle((4, 4, w - 5, h - 5), radius=7, outline=border, width=2)
    save_png(im, ASSETS / ('btn-bet-on.png' if on else 'btn-bet.png'))


def draw_btn_small(label: str, name: str, color=(60, 38, 22)):
    w, h = 88, 52
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((2, 2, w - 3, h - 3), radius=8, fill=(*color, 255))
    d.rounded_rectangle((4, 4, w - 5, h - 5), radius=7, outline=(140, 100, 50, 255), width=2)
    f = load_font(18)
    bbox = d.textbbox((0, 0), label, font=f)
    tw = bbox[2] - bbox[0]
    d.text(((w - tw) // 2, 14), label, fill=(255, 230, 180), font=f)
    save_png(im, ASSETS / name)


def draw_icon(kind: str):
    s = 64
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((4, 4, s - 5, s - 5), fill=(50, 32, 18, 255), outline=(200, 150, 60, 255), width=2)
    cx = s // 2
    if kind == 'wallet':
        d.rounded_rectangle((18, 22, 46, 44), radius=5, fill=(255, 200, 60))
        d.ellipse((36, 28, 48, 40), fill=(220, 170, 40))
    elif kind == 'coin':
        d.ellipse((18, 18, 46, 46), fill=(255, 210, 50))
        f = load_font(20)
        d.text((22, 18), '$', fill=(140, 80, 10), font=f)
    else:
        d.polygon([(cx, 16), (cx + 18, 42), (cx - 18, 42)], fill=(255, 200, 50))
        d.rectangle((cx - 8, 42, cx + 8, 50), fill=(200, 150, 40))
    save_png(im, ASSETS / f'icon-{kind}.png')


def draw_center_panel():
    w, h = 360, 260
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((4, 4, w - 5, h - 5), radius=14, fill=(12, 8, 6, 255))
    d.rounded_rectangle((8, 8, w - 9, h - 9), radius=12, outline=(80, 50, 25, 255), width=3)
    for y in range(20, h - 20, 6):
        d.line([(16, y), (w - 17, y)], fill=(20, 60, 30, 40), width=1)
    d.rounded_rectangle((14, 14, w - 15, h - 15), radius=10, outline=(40, 120, 50, 80), width=2)
    save_png(im, ASSETS / 'center-panel.png')


def draw_machine_frame():
    w, h = 960, 720
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    body = plastic_red(w, h, (210, 45, 30), (130, 22, 14))
    im = Image.alpha_composite(im, body)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((24, 24, w - 25, h - 25), radius=20, outline=(255, 200, 80, 180), width=4)
    d.rounded_rectangle((40, 40, w - 41, h - 41), radius=16, fill=(18, 10, 6, 255))
    d.rounded_rectangle((44, 44, w - 45, h - 45), radius=14, outline=(60, 38, 22, 255), width=3)
    # 顶部灯珠
    for i in range(12):
        x = 80 + i * 68
        d.ellipse((x, 52, x + 14, 66), fill=(255, 220, 80, 200 if i % 2 else 120))
    save_png(im, ASSETS / 'machine-frame.png')


def draw_top_header():
    w, h = 1080, 220
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    grad = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(h):
        t = y / h
        c = lerp_rgb((160, 30, 20), (80, 15, 10), t)
        gd.line([(0, y), (w, y)], fill=(*c, 230))
    im = Image.alpha_composite(im, grad)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((40, 30, w - 41, h - 20), radius=18, outline=(255, 200, 70, 220), width=4)
    f = load_font(52)
    gold_text(d, (w // 2 - 155, 68), '经典水果机', f)
    f2 = load_font(22, False)
    d.text((w // 2 - 100, 138), '跑灯玩法 · 押中即赢', fill=(255, 200, 120), font=f2)
    save_png(im, ASSETS / 'top-header.png')


def draw_bottom_deco():
    w, h = 1080, 300
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h
        c = lerp_rgb((50, 30, 18), (30, 18, 10), t)
        d.line([(0, y), (w, y)], fill=(*c, 240))
    d.rounded_rectangle((20, 16, w - 21, h - 16), radius=16, outline=(140, 100, 50, 200), width=3)
    for i in range(3):
        x = 80 + i * 340
        d.rounded_rectangle((x, 40, x + 280, 220), radius=999, fill=(22, 12, 8, 220), outline=(90, 60, 30, 180), width=2)
    save_png(im, ASSETS / 'bottom-deco.png')


def draw_splash():
    bg = arcade_bg(W, H)
    im = bg.convert('RGBA')
    d = ImageDraw.Draw(im)
    f = load_font(72)
    gold_text(d, (W // 2 - 200, 520), '经典水果机', f)
    f2 = load_font(32, False)
    d.text((W // 2 - 168, 620), '苹果 · 西瓜 · 铃铛 · 77', fill=(255, 200, 120), font=f2)
    # 示意灯盘
    cx, cy, r = W // 2, 980, 200
    for i in range(24):
        a = i / 24 * math.pi * 2 - math.pi / 2
        x = cx + math.cos(a) * r
        y = cy + math.sin(a) * r
        d.ellipse((x - 18, y - 18, x + 18, y + 18), fill=(40, 24, 12, 200), outline=(255, 200, 60, 180), width=2)
    d.ellipse((cx - 80, cy - 60, cx + 80, cy + 60), fill=(12, 8, 6, 220), outline=(60, 120, 50, 200), width=3)
    f3 = load_font(28)
    d.text((cx - 72, cy - 16), '跑灯开奖', fill=(80, 255, 100), font=f3)
    save_png(im, ASSETS / 'splash.png')


def draw_room_bg():
    save_jpg(arcade_bg(), ASSETS / 'room-bg.jpg')


def write_manifest():
    manifest = {
        'version': '1.0',
        'game': '经典水果机',
        'symbols': ['apple', 'orange', 'lemon', 'watermelon', 'cherry', 'bell', 'bar', 'seven'],
        'ring_size': 24,
    }
    (ASSETS / 'element-manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8'
    )
    print('OK element-manifest.json')


def main():
    ai_dir = ASSETS / 'ai-sources'
    if ai_dir.exists() and any(ai_dir.glob('slt-ai-*.png')):
        import subprocess
        import sys
        proc = Path(__file__).parent / 'process_slt_ai_assets.py'
        print('>> 检测到 AI 原稿，走 PS 后处理流水线')
        subprocess.run([sys.executable, str(proc)], check=True, cwd=str(proc.parent))
        return

    print('>> 生成水果符号（程序化备用）')
    draw_apple()
    draw_orange()
    draw_lemon()
    draw_watermelon()
    draw_cherry()
    draw_bell()
    draw_bar()
    draw_seven()

    print('>> 生成灯位与光效')
    draw_slot_cell(False)
    draw_slot_cell(True)
    draw_light_dot()

    print('>> 生成按钮与图标')
    draw_btn_start()
    draw_btn_bet(False)
    draw_btn_bet(True)
    draw_btn_small('清除', 'btn-clear.png')
    draw_btn_small('全押', 'btn-allbet.png')
    for k in ('wallet', 'coin', 'prize'):
        draw_icon(k)

    print('>> 生成框架与背景')
    draw_center_panel()
    draw_machine_frame()
    draw_top_header()
    draw_bottom_deco()
    draw_splash()
    draw_room_bg()
    write_manifest()
    print('\n全部素材已导出到 assets/')


if __name__ == '__main__':
    main()
