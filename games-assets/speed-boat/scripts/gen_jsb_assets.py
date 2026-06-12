# -*- coding: utf-8 -*-
"""极速飞艇 · 独立号码球（海蓝双层边框）+ 开奖场景 + 飞艇艇身图"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BALLS_DIR = ROOT / 'assets' / 'balls'
BOATS_DIR = ROOT / 'assets' / 'boats'
BALLS_DIR.mkdir(parents=True, exist_ok=True)
BOATS_DIR.mkdir(parents=True, exist_ok=True)

# PK10 标准色（与界面一致）
BALLS = {
    1:  ('#e8b923', '#fff8d0', '#1a1408'),
    2:  ('#3b7ddd', '#c8e4ff', '#ffffff'),
    3:  ('#6b6b73', '#e4e4ec', '#ffffff'),
    4:  ('#f07a18', '#ffe0b8', '#ffffff'),
    5:  ('#5ec8e8', '#d8f8ff', '#0a2838'),
    6:  ('#9b4fd4', '#ecd0ff', '#ffffff'),
    7:  ('#a8a8b0', '#f4f4f8', '#1a1408'),
    8:  ('#e83838', '#ffc8c8', '#ffffff'),
    9:  ('#8b1a2e', '#ffb8c8', '#ffffff'),
    10: ('#2db84a', '#c0f0cc', '#ffffff'),
}

BALL_SIZE = 72
BOAT_W, BOAT_H = 140, 88


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def load_font(size, bold=True):
    names = ['arialbd.ttf', 'Arial Bold.ttf', 'msyhbd.ttc', 'arial.ttf'] if bold else ['arial.ttf', 'msyh.ttc']
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_flyboat_ball(n, fill, highlight, text_color):
    """飞艇专用：圆角方牌 + 双层海蓝外框 + 底部浪纹"""
    img = Image.new('RGBA', (BALL_SIZE, BALL_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    fill_rgb = hex_rgb(fill)
    hi_rgb = hex_rgb(highlight)
    txt_rgb = hex_rgb(text_color)
    outer = hex_rgb('#00bce8')
    mid = hex_rgb('#0077aa')
    inner_glow = hex_rgb('#a8f0ff')

    # 外圈海蓝框（飞艇专属，区别于赛车单层金边）
    draw.rounded_rectangle((0, 0, BALL_SIZE - 1, BALL_SIZE - 1), radius=14, fill=outer)
    draw.rounded_rectangle((3, 3, BALL_SIZE - 4, BALL_SIZE - 4), radius=12, fill=mid)
    draw.rounded_rectangle((6, 6, BALL_SIZE - 7, BALL_SIZE - 7), radius=10, fill=(*inner_glow, 40))
    draw.rounded_rectangle((7, 7, BALL_SIZE - 8, BALL_SIZE - 8), radius=9, fill=fill_rgb)

    # 顶部高光
    draw.rounded_rectangle((12, 10, BALL_SIZE - 13, 22), radius=5, fill=(*hi_rgb, 90))

    # 底部浪纹装饰
    for i, y in enumerate([BALL_SIZE - 14, BALL_SIZE - 10]):
        draw.arc((10 + i * 4, y, 28 + i * 4, y + 8), 0, 180, fill=(*outer, 180), width=2)
        draw.arc((BALL_SIZE - 36 - i * 4, y, BALL_SIZE - 18 - i * 4, y + 8), 0, 180, fill=(*outer, 180), width=2)

    label = str(n)
    font = load_font(28 if n < 10 else 24)
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((BALL_SIZE - tw) / 2, (BALL_SIZE - th) / 2 - 1), label, fill=txt_rgb, font=font)
    return img


def draw_boat_hull(n, fill, highlight, text_color):
    """侧视飞艇，艇身编号对应名次球色"""
    img = Image.new('RGBA', (BOAT_W, BOAT_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    fill_rgb = hex_rgb(fill)
    hi_rgb = hex_rgb(highlight)
    txt_rgb = hex_rgb(text_color)
    water = hex_rgb('#0088cc')

    # 水花
    for i in range(5):
        x = 18 + i * 22
        draw.ellipse((x, BOAT_H - 22, x + 16, BOAT_H - 6), fill=(255, 255, 255, 35))

    # 艇体
    hull = [(8, 48), (18, 28), (BOAT_W - 28, 24), (BOAT_W - 8, 38), (BOAT_W - 12, 52), (12, 58)]
    draw.polygon(hull, fill=fill_rgb, outline=hi_rgb)
    draw.polygon([(22, 32), (BOAT_W - 36, 28), (BOAT_W - 40, 36), (26, 42)], fill=(*hi_rgb, 120))

    # 驾驶舱
    draw.rounded_rectangle((BOAT_W - 52, 18, BOAT_W - 22, 38), radius=6, fill=(240, 248, 255, 220), outline=(180, 210, 240))

    # 编号
    font = load_font(32 if n < 10 else 26)
    label = str(n)
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((BOAT_W - tw) / 2 - 8, 34 - th / 2), label, fill=txt_rgb, font=font)

    # 底部水线
    draw.line([(0, BOAT_H - 4), (BOAT_W, BOAT_H - 4)], fill=(*water, 120), width=2)
    return img


def gen_balls_and_boats():
    for n, colors in BALLS.items():
        draw_flyboat_ball(n, *colors).save(BALLS_DIR / f'ball-{n:02d}.png', 'PNG')
        draw_boat_hull(n, *colors).save(BOATS_DIR / f'boat-{n:02d}.png', 'PNG')
        print('ball+boat', n)


def gen_draw_stage():
    """热带海面开奖场景（无动态数字，飞艇由 JS 叠加）"""
    w, h = 640, 380
    img = Image.new('RGB', (w, h), '#87ceeb')
    draw = ImageDraw.Draw(img)

    # 天空
    for y in range(int(h * 0.55)):
        t = y / (h * 0.55)
        c = lerp((135, 206, 250), (255, 248, 220), t * 0.35)
        draw.line([(0, y), (w, y)], fill=c)

    # 太阳
    draw.ellipse((w - 110, 24, w - 50, 84), fill=(255, 230, 120))

    # 远海
    for y in range(int(h * 0.45), int(h * 0.62)):
        t = (y - h * 0.45) / (h * 0.17)
        c = lerp((30, 120, 180), (20, 90, 150), t)
        draw.line([(0, y), (w, y)], fill=c)

    # 近海
    for y in range(int(h * 0.62), h - 70):
        t = (y - h * 0.62) / (h * 0.38 - 70)
        c = lerp((15, 100, 160), (8, 60, 110), min(1, t))
        draw.line([(0, y), (w, y)], fill=c)

    # 小岛
    ix, iy = w // 2 - 60, int(h * 0.38)
    draw.ellipse((ix - 50, iy + 10, ix + 130, iy + 55), fill=(238, 210, 160))
    draw.ellipse((ix, iy, ix + 80, iy + 40), fill=(180, 220, 120))
    # 棕榈树
    for px in (ix + 20, ix + 55):
        draw.line([(px, iy + 5), (px, iy - 25)], fill=(120, 80, 40), width=4)
        for ang in (-40, -15, 10, 35):
            ex = px + int(math.cos(math.radians(ang)) * 22)
            ey = iy - 25 + int(math.sin(math.radians(ang)) * 10)
            draw.line([(px, iy - 25), (ex, ey)], fill=(40, 140, 60), width=3)

    # 水面波纹
    for row in range(6):
        y = int(h * 0.68) + row * 14
        for x in range(0, w, 48):
            draw.arc((x, y, x + 36, y + 10), 0, 180, fill=(255, 255, 255), width=1)

    # 底部暗条（与 UI foot 衔接）
    draw.rectangle((0, h - 70, w, h), fill=(6, 20, 40))

    out = ROOT / 'assets' / 'draw-result-stage.png'
    img.save(out, 'PNG')
    print('stage', out)


if __name__ == '__main__':
    gen_balls_and_boats()
    gen_draw_stage()
