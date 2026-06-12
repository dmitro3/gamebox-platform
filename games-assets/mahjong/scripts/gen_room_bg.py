"""生成麻将胡了竖屏背景（1080×1920）
- 顶部烘焙「1024 路中奖组合」
- 倍数条留 4 个凹槽位（x1/x2/x3/x5 由 UI 覆盖）
- 底部留「赢得高达…路」装饰框（文字由 UI 动态显示）
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
ASSETS.mkdir(parents=True, exist_ok=True)

# 设计稿尺寸（9:16 竖屏）
W, H = 1080, 1920

# 各区块 Y 坐标（基于 1920 高度，与 CSS 变量对应）
ZONE = {
    'banner_y': 72,
    'banner_h': 118,
    'mult_y': 198,
    'mult_h': 108,
    'body_y': 314,
    'win_y': 1048,
    'win_h': 98,
    'stat_y': 1158,
    'stat_h': 88,
    'ctrl_y': 1256,
}


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_rgb(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def load_font(size: int, bold: bool = False):
    candidates = [
        'C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc',
        'C:/Windows/Fonts/simhei.ttf',
        'C:/Windows/Fonts/arial.ttf',
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def wood_gradient(w: int, h: int, c_top, c_mid, c_bot) -> Image.Image:
    img = Image.new('RGB', (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        if t < 0.45:
            c = lerp_rgb(c_top, c_mid, t / 0.45)
        else:
            c = lerp_rgb(c_mid, c_bot, (t - 0.45) / 0.55)
        for x in range(w):
            grain = math.sin(x * 0.018 + y * 0.042) * 6
            grain += math.sin(x * 0.055 + y * 0.011) * 3
            r = max(0, min(255, int(c[0] + grain)))
            g = max(0, min(255, int(c[1] + grain * 0.7)))
            b = max(0, min(255, int(c[2] + grain * 0.4)))
            px[x, y] = (r, g, b)
    return img.filter(ImageFilter.GaussianBlur(0.6))


def add_vignette(img: Image.Image, strength: float = 0.35) -> Image.Image:
    w, h = img.size
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(h):
        t = abs(y / h - 0.5) * 2
        a = int(255 * strength * (t ** 1.6))
        draw.line([(0, y), (w, y)], fill=(0, 0, 0, a))
    base = img.convert('RGBA')
    return Image.alpha_composite(base, overlay).convert('RGB')


def draw_coin_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int):
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(120, 85, 35), outline=(200, 160, 70))
    hr = max(2, r // 4)
    draw.rectangle((cx - hr, cy - hr, cx + hr, cy + hr), fill=(80, 55, 25))


def draw_top_banner(base: Image.Image):
    y0, h = ZONE['banner_y'], ZONE['banner_h']
    strip = Image.new('RGBA', (W, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(strip)
    for y in range(h):
        t = y / max(h - 1, 1)
        c = lerp_rgb((108, 28, 22), (78, 18, 14), t)
        sd.line([(0, y), (W, y)], fill=(*c, 255))
    strip = strip.filter(ImageFilter.GaussianBlur(0.4))
    d = ImageDraw.Draw(strip)
    d.rounded_rectangle((8, 6, W - 8, h - 6), radius=6, outline=(160, 100, 55), width=2)
    d.line([(12, h - 8), (W - 12, h - 8)], fill=(60, 15, 12), width=2)

    font = load_font(38, bold=True)
    text = '1024 路中奖组合'
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (W - tw) // 2
    ty = (h - th) // 2 - 4
    draw_coin_icon(d, tx - 42, ty + th // 2 + 2, 16)
    draw_coin_icon(d, tx + tw + 42, ty + th // 2 + 2, 16)
    d.text((tx + 2, ty + 2), text, fill=(40, 8, 6), font=font)
    d.text((tx, ty), text, fill=(210, 145, 75), font=font)

    base.paste(strip, (0, y0), strip)


def draw_mult_strip(base: Image.Image):
    y0, h = ZONE['mult_y'], ZONE['mult_h']
    wood = wood_gradient(W, h, (196, 138, 72), (168, 112, 58), (142, 92, 48))
    d = ImageDraw.Draw(wood)
    d.line([(0, 0), (W, 0)], fill=(230, 185, 110), width=2)
    d.line([(0, h - 1), (W, h - 1)], fill=(90, 58, 28), width=3)

    slot_w, slot_h = 118, 72
    gap = (W - slot_w * 4) // 5
    slots = []
    x = gap
    for _ in range(4):
        slots.append((x, (h - slot_h) // 2, x + slot_w, (h + slot_h) // 2))
        x += slot_w + gap

    for sx0, sy0, sx1, sy1 in slots:
        d.rounded_rectangle((sx0, sy0, sx1, sy1), radius=10, fill=(118, 76, 38), outline=(88, 54, 26), width=2)
        d.rounded_rectangle((sx0 + 3, sy0 + 3, sx1 - 3, sy1 - 3), radius=8, outline=(210, 170, 95), width=1)

    base.paste(wood, (0, y0))


def draw_body_wood(base: Image.Image):
    y0 = ZONE['body_y']
    y1 = ZONE['win_y'] - 8
    h = y1 - y0
    body = wood_gradient(W, h, (92, 48, 28), (72, 36, 20), (58, 28, 16))
    body = add_vignette(body, 0.22)
    base.paste(body, (0, y0))


def draw_knot(d: ImageDraw.ImageDraw, cx: int, cy: int, scale: float = 1.0):
    r = int(14 * scale)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(220, 175, 80), width=2)
    d.arc((cx - r - 4, cy - 6, cx - 2, cy + 8), start=200, end=340, fill=(220, 175, 80), width=2)
    d.arc((cx + 2, cy - 6, cx + r + 4, cy + 8), start=200, end=340, fill=(220, 175, 80), width=2)


def draw_win_frame(base: Image.Image):
    """底部信息框：只画装饰边框，中间留空给动态文字"""
    y0, h = ZONE['win_y'], ZONE['win_h']
    frame = Image.new('RGBA', (W, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(frame)
    mx = 36
    d.rounded_rectangle((mx, 8, W - mx, h - 8), radius=10, fill=(92, 16, 18), outline=(210, 168, 72), width=3)
    d.rounded_rectangle((mx + 6, 14, W - mx - 6, h - 14), radius=8, outline=(140, 40, 35), width=1)
    draw_knot(d, mx + 22, h // 2, 1.1)
    draw_knot(d, W - mx - 22, h // 2, 1.1)
    d.line([(mx + 44, h // 2), (W // 2 - 120, h // 2)], fill=(180, 130, 60), width=2)
    d.line([(W // 2 + 120, h // 2), (W - mx - 44, h // 2)], fill=(180, 130, 60), width=2)
    base.paste(frame, (0, y0), frame)


def draw_stat_zone(base: Image.Image):
    y0, h = ZONE['stat_y'], ZONE['stat_h']
    zone = wood_gradient(W, h, (82, 42, 24), (68, 34, 18), (58, 28, 14))
    base.paste(zone, (0, y0))


def draw_coin_pile(draw: ImageDraw.ImageDraw, cx: int, cy: int, count: int, rng: random.Random):
    for i in range(count):
        r = rng.randint(14, 22)
        ox = rng.randint(-50, 50)
        oy = rng.randint(-8, 8)
        x, y = cx + ox, cy + oy
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(210, 165, 55), outline=(160, 115, 35))
        hr = max(2, r // 4)
        draw.rectangle((x - hr, y - hr, x + hr, y + hr), fill=(130, 90, 30))


def draw_control_zone(base: Image.Image):
    y0 = ZONE['ctrl_y']
    h = H - y0
    wood = wood_gradient(W, h, (76, 38, 20), (62, 30, 16), (48, 22, 12))
    d = ImageDraw.Draw(wood)
    rng = random.Random(42)
    draw_coin_pile(d, 120, h - 55, 8, rng)
    draw_coin_pile(d, W - 120, h - 50, 9, rng)
    draw_coin_pile(d, W // 2, h - 35, 5, rng)
    glow = Image.new('RGBA', (W, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((W // 2 - 180, h - 120, W // 2 + 180, h + 40), fill=(255, 180, 80, 28))
    glow = glow.filter(ImageFilter.GaussianBlur(12))
    wood = Image.alpha_composite(wood.convert('RGBA'), glow).convert('RGB')
    base.paste(wood, (0, y0))


def export_layout_css():
    """输出供 CSS 使用的百分比定位"""
    lines = [':root {']
    for key, val in ZONE.items():
        if key.endswith('_y'):
            lines.append(f'  --mj-{key.replace("_", "-")}: {val / H * 100:.3f}%;')
        elif key.endswith('_h'):
            lines.append(f'  --mj-{key.replace("_", "-")}: {val / H * 100:.3f}%;')
    lines.append('}')
    return '\n'.join(lines)


def main():
    base = wood_gradient(W, H, (88, 46, 26), (70, 36, 20), (52, 26, 14))
    draw_top_banner(base)
    draw_mult_strip(base)
    draw_body_wood(base)
    draw_win_frame(base)
    draw_stat_zone(base)
    draw_control_zone(base)

    out_png = ASSETS / 'room-bg.png'
    out_jpg = ASSETS / 'room-bg.jpg'
    base.save(out_png, 'PNG', optimize=True)
    base.save(out_jpg, 'JPEG', quality=90, optimize=True, progressive=True)

    layout = ASSETS / 'room-bg-layout.txt'
    layout.write_text(export_layout_css(), encoding='utf-8')
    print('OK', out_jpg, out_jpg.stat().st_size, base.size)
    print(export_layout_css())


if __name__ == '__main__':
    main()
