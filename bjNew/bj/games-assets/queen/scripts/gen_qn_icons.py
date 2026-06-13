# -*- coding: utf-8
"""赏金女王 · 程序化绘制 UI 小图标"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
S = 64


def wallet():
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((8, 16, 56, 52), radius=6, fill=(210, 170, 80), outline=(160, 120, 50), width=2)
    d.rounded_rectangle((14, 10, 50, 28), radius=4, fill=(180, 140, 60))
    d.rectangle((36, 30, 52, 44), fill=(140, 100, 40), outline=(100, 70, 30))
    return img


def coin():
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((10, 10, 54, 54), fill=(255, 210, 80), outline=(200, 160, 50), width=2)
    d.text((22, 18), '¥', fill=(160, 110, 30))
    return img


def prize():
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(32, 8), (38, 24), (56, 26), (42, 36), (46, 54), (32, 44), (18, 54), (22, 36), (8, 26), (26, 24)], fill=(255, 210, 60), outline=(200, 160, 40))
    return img


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    wallet().save(ASSETS / 'qn-icon-wallet.png', 'PNG', optimize=True)
    coin().save(ASSETS / 'qn-icon-coin.png', 'PNG', optimize=True)
    prize().save(ASSETS / 'qn-icon-prize.png', 'PNG', optimize=True)
    print('OK icons')


if __name__ == '__main__':
    main()
