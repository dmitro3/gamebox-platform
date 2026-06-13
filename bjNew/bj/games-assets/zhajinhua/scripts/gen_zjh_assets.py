# -*- coding: utf-8 -*-
"""炸金花 · 一键生成 PS 级素材（程序化备用 + AI 原稿后处理入口）"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
AI = ASSETS / 'ai-sources'
CARDS = ASSETS / 'cards'
CHIPS = ASSETS / 'chips'
TYPES = ASSETS / 'type-badges'
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
    im = Image.new('RGB', (W, H), (10, 14, 12))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        c = (int(12 + 18 * t), int(22 + 30 * t), int(16 + 20 * t))
        d.line([(0, y), (W, y)], fill=c)
    glow = radial_glow(W, H, W // 2, H // 3, 420, (40, 140, 80), 90)
    im = Image.alpha_composite(im.convert('RGBA'), glow).convert('RGB')
    d = ImageDraw.Draw(im)
    d.ellipse((80, 520, W - 80, 1180), fill=(18, 72, 48))
    d.ellipse((120, 560, W - 120, 1140), fill=(24, 88, 58))
    d.ellipse((160, 600, W - 160, 1100), outline=(200, 160, 60), width=6)
    for i in range(3):
        d.arc((100 + i * 8, 540 + i * 8, W - 100 - i * 8, 1160 - i * 8), 20, 160, fill=(212, 175, 55), width=2)
    im = ImageEnhance.Contrast(im).enhance(1.08)
    save_jpg(im, ASSETS / 'room-bg.jpg')


def draw_splash():
    im = Image.new('RGB', (W, H), (8, 12, 10))
    d = ImageDraw.Draw(im)
    glow = radial_glow(W, H, W // 2, H * 0.38, 500, (40, 160, 90), 100)
    im = Image.alpha_composite(im.convert('RGBA'), glow).convert('RGB')
    d = ImageDraw.Draw(im)
    f = load_font(96)
    title = '炸 金 花'
    bbox = d.textbbox((0, 0), title, font=f)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) // 2, H * 0.32), title, fill=(244, 211, 107), font=f)
    f2 = load_font(36, False)
    sub = '平台派牌 · 三张比牌'
    bbox2 = d.textbbox((0, 0), sub, font=f2)
    d.text(((W - (bbox2[2] - bbox2[0])) // 2, H * 0.32 + 110), sub, fill=(180, 220, 190), font=f2)
    save_png(im.convert('RGBA'), ASSETS / 'splash.png')


def draw_result_stage():
    im = Image.new('RGBA', (640, 360), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 639, 359), radius=12, fill=(12, 28, 20, 230))
    d.rounded_rectangle((8, 8, 631, 351), radius=10, outline=(212, 175, 55, 120), width=2)
    glow = radial_glow(640, 360, 320, 180, 200, (30, 120, 70), 60)
    im = Image.alpha_composite(im, glow)
    save_png(im, ASSETS / 'draw-result-stage.png')


def draw_deal_zone_bg():
    im = Image.new('RGBA', (960, 280), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 959, 279), radius=20, fill=(16, 48, 32, 200), outline=(212, 175, 55, 100), width=2)
    f = load_font(28, False)
    d.text((380, 12), '本期手牌', fill=(244, 211, 107, 200), font=f)
    save_png(im, ASSETS / 'deal-zone-bg.png')


def draw_playing_card(suit_key: str, sym: str, rank: str, color):
    im = Image.new('RGBA', (CARD_W, CARD_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((2, 2, CARD_W - 3, CARD_H - 3), radius=10, fill=(250, 246, 238), outline=(200, 180, 140), width=2)
    d.rounded_rectangle((6, 6, CARD_W - 7, CARD_H - 7), radius=8, outline=(60, 140, 90, 100), width=1)
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


def draw_card_back():
    im = Image.new('RGBA', (CARD_W, CARD_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((2, 2, CARD_W - 3, CARD_H - 3), radius=10, fill=(18, 72, 48), outline=(212, 175, 55), width=3)
    for i in range(0, CARD_W, 16):
        d.line([(i, 8), (i - 20, CARD_H)], fill=(212, 175, 55, 80), width=1)
    f = load_font(28)
    d.text((CARD_W // 2 - 14, CARD_H // 2 - 16), '花', fill=(244, 211, 107), font=f)
    save_png(im, CARDS / 'back.png')


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
    draw_chip('大', CHIPS / 'chip-big.png', (30, 90, 55), (180, 230, 180))
    draw_chip('小', CHIPS / 'chip-small.png', (50, 70, 100), (200, 220, 255))
    draw_chip('单', CHIPS / 'chip-odd.png', (90, 70, 30), (255, 220, 140))
    draw_chip('双', CHIPS / 'chip-even.png', (70, 50, 90), (220, 180, 255))
    draw_chip('特', CHIPS / 'chip-special.png', (140, 90, 20), (255, 240, 180))
    draw_chip('色', CHIPS / 'chip-color.png', (120, 28, 36), (255, 180, 160))


def draw_type_badge(name: str, label: str, fill):
    im = Image.new('RGBA', (160, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 159, 47), radius=22, fill=fill, outline=(244, 211, 107), width=2)
    f = load_font(20 if len(label) <= 3 else 16)
    bbox = d.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((160 - tw) // 2, (48 - th) // 2 - 2), label, fill=(255, 248, 230), font=f)
    save_png(im, TYPES / f'{name}.png')


def draw_type_badges():
    items = [
        ('leopard', '豹子', (140, 30, 30)),
        ('straight', '顺子', (30, 90, 90)),
        ('flush', '金花', (30, 100, 55)),
        ('pair', '对子', (80, 60, 120)),
        ('high', '散牌', (50, 50, 55)),
    ]
    for name, label, fill in items:
        draw_type_badge(name, label, fill)


def draw_icons():
    specs = [
        ('rail-cs', '客', (60, 100, 180)),
        ('rail-play', '玩', (40, 120, 70)),
        ('rail-redpack', '包', (163, 33, 48)),
    ]
    for name, ch, fill in specs:
        s = 84
        im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.ellipse((2, 2, s - 2, s - 2), fill=(*fill, 220), outline=(244, 211, 107), width=2)
        f = load_font(28)
        bbox = d.textbbox((0, 0), ch, font=f)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text(((s - tw) // 2, (s - th) // 2 - 2), ch, fill=(255, 248, 235), font=f)
        save_png(im, ASSETS / f'{name}.png')


def process_ai_if_present():
    if not AI.exists():
        return
    mapping = {
        'zjh-ai-room-bg.png': (ASSETS / 'room-bg.jpg', 'jpg'),
        'zjh-ai-splash.png': (ASSETS / 'splash.png', 'png'),
        'zjh-ai-result-stage.png': (ASSETS / 'draw-result-stage.png', 'png'),
        'zjh-ai-deal-zone.png': (ASSETS / 'deal-zone-bg.png', 'png'),
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
        im = im.crop(box).resize((W, H) if kind == 'jpg' else im.size, Image.Resampling.LANCZOS)
        im = ImageEnhance.Sharpness(im).enhance(1.1)
        if kind == 'jpg':
            save_jpg(im.convert('RGB'), dst)
        else:
            save_png(im, dst)


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    CARDS.mkdir(parents=True, exist_ok=True)
    CHIPS.mkdir(parents=True, exist_ok=True)
    TYPES.mkdir(parents=True, exist_ok=True)
    AI.mkdir(parents=True, exist_ok=True)

    draw_room_bg()
    draw_splash()
    draw_result_stage()
    draw_deal_zone_bg()
    draw_card_back()
    for suit_key, sym, color in SUITS:
        for rank in RANKS:
            draw_playing_card(suit_key, sym, rank, color)
    draw_chips()
    draw_type_badges()
    draw_icons()
    process_ai_if_present()
    print('Done. Assets at', ASSETS)


if __name__ == '__main__':
    main()
