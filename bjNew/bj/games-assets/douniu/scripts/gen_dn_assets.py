# -*- coding: utf-8 -*-
"""斗牛 · 一键生成 PS 级素材（程序化备用 + AI 原稿后处理入口）"""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
AI = ASSETS / 'ai-sources'
CARDS = ASSETS / 'cards'
CHIPS = ASSETS / 'chips'
NIU = ASSETS / 'niu-badges'
W, H = 1080, 1920
CARD_W, CARD_H = 140, 196

SUITS = [
    ('spade', '♠', (20, 20, 28)),
    ('heart', '♥', (180, 32, 40)),
    ('club', '♣', (20, 20, 28)),
    ('diamond', '♦', (180, 32, 40)),
]
RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']


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


def save_jpg(im: Image.Image, path: Path, q: int = 90):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert('RGB').save(path, 'JPEG', quality=q, optimize=True)
    print('OK', path.relative_to(ROOT))


def save_png(im: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'PNG', optimize=True)
    print('OK', path.relative_to(ROOT))


def radial_glow(w, h, cx, cy, r, color, alpha=120):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i in range(r, 0, -2):
        a = int(alpha * (1 - i / r))
        d.ellipse((cx - i, cy - i, cx + i, cy + i), fill=(*color, a))
    return im


def draw_room_bg():
    im = Image.new('RGB', (W, H), (18, 12, 10))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        c = (
            int(28 + 40 * t),
            int(10 + 8 * t),
            int(10 + 6 * t),
        )
        d.line([(0, y), (W, y)], fill=c)
    glow = radial_glow(W, H, W // 2, H // 3, 420, (180, 140, 40), 90)
    im = Image.alpha_composite(im.convert('RGBA'), glow).convert('RGB')
    d = ImageDraw.Draw(im)
    # 赌桌椭圆
    d.ellipse((80, 520, W - 80, 1180), fill=(120, 18, 28))
    d.ellipse((120, 560, W - 120, 1140), fill=(145, 22, 34))
    d.ellipse((160, 600, W - 160, 1100), outline=(200, 160, 60), width=6)
    # 金边
    for i in range(3):
        d.arc((100 + i * 8, 540 + i * 8, W - 100 - i * 8, 1160 - i * 8), 20, 160, fill=(212, 175, 55), width=2)
    im = ImageEnhance.Contrast(im).enhance(1.08)
    save_jpg(im, ASSETS / 'room-bg.jpg')


def draw_splash():
    im = Image.new('RGB', (W, H), (12, 8, 6))
    d = ImageDraw.Draw(im)
    glow = radial_glow(W, H, W // 2, H * 0.38, 500, (212, 175, 55), 100)
    im = Image.alpha_composite(im.convert('RGBA'), glow).convert('RGB')
    d = ImageDraw.Draw(im)
    f = load_font(96)
    title = '斗 牛'
    bbox = d.textbbox((0, 0), title, font=f)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) // 2, H * 0.32), title, fill=(244, 211, 107), font=f)
    f2 = load_font(36, False)
    sub = '庄闲比牌 · 两副牌'
    bbox2 = d.textbbox((0, 0), sub, font=f2)
    d.text(((W - (bbox2[2] - bbox2[0])) // 2, H * 0.32 + 110), sub, fill=(200, 180, 140), font=f2)
    save_png(im.convert('RGBA'), ASSETS / 'splash.png')


def draw_result_stage():
    im = Image.new('RGBA', (640, 360), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 639, 359), radius=12, fill=(20, 14, 10, 220))
    d.rounded_rectangle((8, 8, 631, 351), radius=10, outline=(212, 175, 55, 120), width=2)
    glow = radial_glow(640, 360, 320, 180, 200, (163, 33, 48), 60)
    im = Image.alpha_composite(im, glow)
    save_png(im, ASSETS / 'draw-result-stage.png')


def draw_playing_card(suit_key: str, sym: str, rank: str, color):
    im = Image.new('RGBA', (CARD_W, CARD_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((2, 2, CARD_W - 3, CARD_H - 3), radius=10, fill=(250, 246, 238), outline=(200, 180, 140), width=2)
    d.rounded_rectangle((6, 6, CARD_W - 7, CARD_H - 7), radius=8, outline=(212, 175, 55, 80), width=1)
    f_big = load_font(52)
    f_sm = load_font(22)
    d.text((12, 10), rank, fill=color, font=f_sm)
    d.text((12, 32), sym, fill=color, font=f_sm)
    bbox = d.textbbox((0, 0), sym, font=f_big)
    sw, sh = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((CARD_W - sw) // 2, (CARD_H - sh) // 2 - 8), sym, fill=(*color, 220), font=f_big)
    d.text((CARD_W - 34, CARD_H - 52), rank, fill=color, font=f_sm)
    d.text((CARD_W - 34, CARD_H - 30), sym, fill=color, font=f_sm)
    save_png(im, CARDS / f'{suit_key}_{rank}.png')


def draw_card_backs():
    for name, base, accent in (('back-deck1', (120, 18, 28), (212, 175, 55)), ('back-deck2', (20, 40, 100), (180, 200, 255))):
        im = Image.new('RGBA', (CARD_W, CARD_H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((2, 2, CARD_W - 3, CARD_H - 3), radius=10, fill=base, outline=accent, width=3)
        for i in range(0, CARD_W, 16):
            d.line([(i, 8), (i - 20, CARD_H)], fill=(*accent, 80), width=1)
        f = load_font(28)
        d.text((CARD_W // 2 - 14, CARD_H // 2 - 16), '牛', fill=accent, font=f)
        save_png(im, CARDS / f'{name}.png')


def draw_chip(label: str, path: Path, fill, edge):
    s = 96
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((4, 4, s - 4, s - 4), fill=fill, outline=edge, width=4)
    for a in range(0, 360, 30):
        rad = math.radians(a)
        x1 = s // 2 + math.cos(rad) * 34
        y1 = s // 2 + math.sin(rad) * 34
        x2 = s // 2 + math.cos(rad) * 42
        y2 = s // 2 + math.sin(rad) * 42
        d.line([(x1, y1), (x2, y2)], fill=edge, width=3)
    f = load_font(22 if len(label) <= 2 else 14)
    bbox = d.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((s - tw) // 2, (s - th) // 2 - 2), label, fill=(255, 248, 230), font=f)
    save_png(im, path)


def draw_chips():
    draw_chip('庄', CHIPS / 'chip-banker.png', (140, 28, 36), (244, 211, 107))
    draw_chip('闲', CHIPS / 'chip-player.png', (28, 60, 140), (200, 220, 255))
    draw_chip('和', CHIPS / 'chip-tie.png', (60, 50, 30), (244, 211, 107))
    draw_chip('牛1-6', CHIPS / 'chip-niu-low.png', (50, 90, 50), (180, 230, 180))
    draw_chip('牛7-9', CHIPS / 'chip-niu-mid.png', (90, 70, 30), (255, 220, 140))
    draw_chip('牛牛', CHIPS / 'chip-niu-bull.png', (120, 90, 20), (255, 240, 180))


def draw_niu_badge(name: str, label: str, fill):
    im = Image.new('RGBA', (128, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 127, 47), radius=22, fill=fill, outline=(244, 211, 107), width=2)
    f = load_font(20 if len(label) <= 3 else 16)
    bbox = d.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((128 - tw) // 2, (48 - th) // 2 - 2), label, fill=(255, 248, 230), font=f)
    save_png(im, NIU / f'{name}.png')


def draw_niu_badges():
    items = [
        ('none', '无牛', (50, 50, 55)),
        ('niu1', '牛一', (60, 45, 35)),
        ('niu2', '牛二', (65, 48, 38)),
        ('niu3', '牛三', (70, 50, 40)),
        ('niu4', '牛四', (75, 52, 42)),
        ('niu5', '牛五', (80, 55, 45)),
        ('niu6', '牛六', (85, 58, 48)),
        ('niu7', '牛七', (40, 70, 55)),
        ('niu8', '牛八', (35, 75, 60)),
        ('niu9', '牛九', (30, 80, 65)),
        ('bull', '牛牛', (140, 100, 20)),
        ('flower', '五花牛', (100, 40, 100)),
        ('bomb', '炸弹牛', (120, 30, 30)),
        ('small', '五小牛', (30, 90, 90)),
    ]
    for name, label, fill in items:
        draw_niu_badge(name, label, fill)


def draw_zone(name: str, label: str, fill, edge):
    im = Image.new('RGBA', (480, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 479, 199), radius=16, fill=(*fill, 180), outline=edge, width=3)
    f = load_font(72)
    bbox = d.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((480 - tw) // 2, (200 - th) // 2), label, fill=(255, 248, 235), font=f)
    save_png(im, ASSETS / f'zone-{name}.png')


def draw_vs_badge():
    s = 120
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((4, 4, s - 4, s - 4), fill=(40, 30, 20), outline=(244, 211, 107), width=4)
    f = load_font(36)
    d.text((28, 36), 'VS', fill=(244, 211, 107), font=f)
    save_png(im, ASSETS / 'vs-badge.png')


def draw_icons():
    specs = [
        ('rail-cs', '客', (60, 100, 180)),
        ('rail-play', '玩', (180, 140, 40)),
        ('rail-redpack', '包', (163, 33, 48)),
        ('icon-balance', '分', (212, 175, 55)),
        ('icon-winloss', '赢', (80, 180, 100)),
        ('icon-turnover', '流', (140, 120, 200)),
        ('icon-rebate', '水', (200, 120, 80)),
    ]
    for name, ch, fill in specs:
        s = 84 if name.startswith('rail') else 64
        im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.ellipse((2, 2, s - 2, s - 2), fill=(*fill, 220), outline=(244, 211, 107), width=2)
        f = load_font(28 if s > 70 else 22)
        bbox = d.textbbox((0, 0), ch, font=f)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text(((s - tw) // 2, (s - th) // 2 - 2), ch, fill=(255, 248, 235), font=f)
        save_png(im, ASSETS / f'{name}.png')


def process_ai_if_present():
    """若 ai-sources 有 AI 原稿则覆盖对应成品（简化裁切）。"""
    if not AI.exists():
        return
    mapping = {
        'dn-ai-room-bg.png': (ASSETS / 'room-bg.jpg', 'jpg'),
        'dn-ai-splash.png': (ASSETS / 'splash.png', 'png'),
        'dn-ai-result-stage.png': (ASSETS / 'draw-result-stage.png', 'png'),
    }
    for src_name, (dst, kind) in mapping.items():
        src = AI / src_name
        if not src.exists():
            continue
        im = Image.open(src).convert('RGBA' if kind == 'png' else 'RGB')
        w, h = im.size
        target = W / H
        cur = w / h
        if cur > target:
            nw = int(h * target)
            x0 = (w - nw) // 2
            box = (x0, 0, x0 + nw, h)
        else:
            nh = int(w / target)
            y0 = (h - nh) // 2
            box = (0, y0, w, y0 + nh)
        im = im.crop(box).resize((W, H), Image.Resampling.LANCZOS)
        im = ImageEnhance.Sharpness(im).enhance(1.1)
        if kind == 'jpg':
            save_jpg(im.convert('RGB'), dst)
        else:
            save_png(im, dst)


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    CARDS.mkdir(parents=True, exist_ok=True)
    CHIPS.mkdir(parents=True, exist_ok=True)
    NIU.mkdir(parents=True, exist_ok=True)
    AI.mkdir(parents=True, exist_ok=True)

    draw_room_bg()
    draw_splash()
    draw_result_stage()
    draw_card_backs()
    for suit_key, sym, color in SUITS:
        for rank in RANKS:
            draw_playing_card(suit_key, sym, rank, color)
    draw_chips()
    draw_niu_badges()
    draw_zone('banker', '庄', (120, 28, 36), (255, 180, 160))
    draw_zone('player', '闲', (28, 60, 140), (160, 200, 255))
    draw_vs_badge()
    draw_icons()
    process_ai_if_present()
    print('Done. Assets at', ASSETS)


if __name__ == '__main__':
    main()
