# -*- coding: utf-8
"""赏金女王 · 加载页（纯绘制，不用参考截图）"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

from qn_draw_common import W, H, load_font, sunset_gradient, wood_gradient

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'splash.png'


def main():
    base = sunset_gradient(W, H)
    deck_h = int(H * 0.42)
    deck = wood_gradient(W, deck_h, (88, 50, 32), (68, 38, 24), (52, 28, 16))
    base.paste(deck, (0, H - deck_h))

    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rectangle((0, 0, W, H), fill=(10, 5, 20, 100))

    title_f = load_font(72, True)
    sub_f = load_font(28, True)
    title = '赏金女王'
    bbox = d.textbbox((0, 0), title, font=title_f)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) // 2 + 3, H // 2 - 100 + 3), title, fill=(20, 8, 10, 200), font=title_f)
    d.text(((W - tw) // 2, H // 2 - 100), title, fill=(255, 210, 100, 255), font=title_f)
    sub = 'BOUNTY QUEEN'
    sb = d.textbbox((0, 0), sub, font=sub_f)
    sw = sb[2] - sb[0]
    d.text(((W - sw) // 2, H // 2 - 20), sub, fill=(255, 180, 80, 220), font=sub_f)

    img = Image.alpha_composite(base.convert('RGBA'), overlay).convert('RGB')
    img = ImageEnhance.Contrast(img).enhance(1.05)
    img = img.filter(ImageFilter.GaussianBlur(0.2))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, 'PNG', optimize=True)
    print('OK splash', OUT)


if __name__ == '__main__':
    main()
