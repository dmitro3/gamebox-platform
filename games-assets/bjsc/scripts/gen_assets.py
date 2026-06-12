"""生成北京赛车方形号码球 PNG 与开奖公布底图"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BALLS_DIR = ROOT / 'assets' / 'balls'
BALLS_DIR.mkdir(parents=True, exist_ok=True)

BALLS = {
    1:  ('#e8b923', '#fff4c8', '#1a1408'),
    2:  ('#3b7ddd', '#b8d8ff', '#ffffff'),
    3:  ('#6b6b73', '#d8d8e0', '#ffffff'),
    4:  ('#f07a18', '#ffd8a8', '#ffffff'),
    5:  ('#5ec8e8', '#d8f8ff', '#0d2838'),
    6:  ('#9b4fd4', '#e8c8ff', '#ffffff'),
    7:  ('#a8a8b0', '#f0f0f4', '#1a1408'),
    8:  ('#e83838', '#ffc8c8', '#ffffff'),
    9:  ('#8b1a2e', '#ffb0c0', '#ffffff'),
    10: ('#2db84a', '#b8f0c4', '#ffffff'),
}

SIZE = 64
RADIUS = 8


def lerp(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def draw_square_ball(n, fill, highlight, text_color):
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    fill_rgb = hex_rgb(fill)
    hi_rgb = hex_rgb(highlight)
    txt_rgb = hex_rgb(text_color)

    # 外框 + 主体
    draw.rounded_rectangle((1, 1, SIZE - 2, SIZE - 2), radius=RADIUS, fill=fill_rgb)
    draw.rounded_rectangle((1, 1, SIZE - 2, SIZE - 2), radius=RADIUS, outline=hi_rgb, width=2)

    # 顶部高光条
    draw.rounded_rectangle((5, 5, SIZE - 6, 16), radius=4, fill=(*hi_rgb, 70))

    # 数字
    label = str(n)
    try:
        font = ImageFont.truetype('arialbd.ttf', 26 if n < 10 else 22)
    except OSError:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((SIZE - tw) / 2, (SIZE - th) / 2 - 2), label, fill=txt_rgb, font=font)
    return img


def gen_balls():
    for n, colors in BALLS.items():
        img = draw_square_ball(n, *colors)
        img.save(BALLS_DIR / f'ball-{n:02d}.png', 'PNG')
        print('ball', n)


def gen_draw_bg():
    w, h = 640, 420
    img = Image.new('RGB', (w, h), '#0a0c14')
    draw = ImageDraw.Draw(img)

    # 顶部深蓝渐变
    for y in range(h // 2):
        t = y / (h // 2)
        c = lerp((10, 12, 20), (18, 32, 68), 1 - t)
        draw.line([(0, y), (w, y)], fill=c)

    # 中央光束
    cx = w // 2
    for i in range(-8, 9):
        x = cx + i * 28
        for y in range(40, h - 90):
            alpha = max(0, 120 - abs(i) * 12 - abs(y - 170) // 3)
            if alpha > 0:
                draw.line([(x, y), (x + i * 2, y + 8)], fill=(40, 120, 220), width=1)

    # 舞台地面光
    draw.ellipse((80, h - 160, w - 80, h + 40), fill=(20, 40, 80))

    # 底部信息区暗条
    draw.rectangle((0, h - 88, w, h), fill=(6, 8, 12))

    # 标题区
    try:
        title_font = ImageFont.truetype('arialbd.ttf', 28)
        sub_font = ImageFont.truetype('arial.ttf', 14)
    except OSError:
        title_font = sub_font = ImageFont.load_default()

    draw.text((24, 18), '北京赛车', fill=(120, 200, 255), font=title_font)

    # 领奖台占位（金银铜盾形示意）
    podium_y = 200
    slots = [(w // 2 - 130, '#b0b8c8', '亚军'), (w // 2 - 42, '#f0c848', '冠军'), (w // 2 + 46, '#c87840', '季军')]
    for x, color, _ in slots:
        draw.rounded_rectangle((x, podium_y, x + 76, podium_y + 88), radius=10, fill=hex_rgb(color))
        draw.rounded_rectangle((x + 8, podium_y + 10, x + 68, podium_y + 70), radius=8, outline=(255, 255, 255), width=2)

    out = ROOT / 'assets' / 'draw-result-bg.png'
    img.save(out, 'PNG')
    print('draw bg', out)


if __name__ == '__main__':
    gen_balls()
    gen_draw_bg()
