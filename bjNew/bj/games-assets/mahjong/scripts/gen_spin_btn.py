"""生成麻将胡了旋转按钮 PNG（标准格式，本地可直接打开）"""
from pathlib import Path
from math import cos, sin, pi
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'spin-btn.png'
SIZE = 512
CX, CY = SIZE // 2, SIZE // 2


def lerp(a, b, t):
    return int(a + (b - a) * t)


def main():
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 外圈金色光晕
    for r in range(248, 220, -2):
        t = (248 - r) / 28
        c = lerp(200, 120, t)
        draw.ellipse((CX - r, CY - r, CX + r, CY + r), fill=(c, lerp(160, 90, t), 40, 30))

    # 金边
    draw.ellipse((CX - 230, CY - 230, CX + 230, CY + 230), fill=(210, 165, 55, 255))
    draw.ellipse((CX - 218, CY - 218, CX + 218, CY + 218), fill=(160, 115, 35, 255))

    # 绿色玉面
    green = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    gd = ImageDraw.Draw(green)
    for r in range(210, 0, -1):
        t = r / 210
        gd.ellipse(
            (CX - r, CY - r, CX + r, CY + r),
            fill=(lerp(30, 90, t), lerp(120, 200, t), lerp(50, 110, t), 255)
        )
    green = green.filter(ImageFilter.GaussianBlur(1.2))
    img = Image.alpha_composite(img, green)

    draw = ImageDraw.Draw(img)

    # 金色双箭头（顺时针）
    def arrow_arc(start_deg, sweep=130, width=22):
        pts = []
        for a in range(start_deg, start_deg + sweep, 4):
            rad = a * pi / 180
            pts.append((CX + cos(rad) * 118, CY + sin(rad) * 118))
        if len(pts) >= 2:
            draw.line(pts, fill=(255, 220, 100, 255), width=width, joint='curve')
        end = (start_deg + sweep) * pi / 180
        tip = (CX + cos(end) * 118, CY + sin(end) * 118)
        left = end + pi * 0.78
        right = end - pi * 0.78
        head = [
            tip,
            (tip[0] + cos(left) * 34, tip[1] + sin(left) * 34),
            (tip[0] + cos(right) * 34, tip[1] + sin(right) * 34),
        ]
        draw.polygon(head, fill=(255, 220, 100, 255))

    arrow_arc(30)
    arrow_arc(210)

    # 顶部柔和高光
    highlight = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight)
    hd.ellipse((CX - 120, CY - 150, CX + 120, CY - 20), fill=(255, 255, 255, 40))
    highlight = highlight.filter(ImageFilter.GaussianBlur(8))
    img = Image.alpha_composite(img, highlight)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, 'PNG', optimize=True)
    img.verify()
    print('OK', OUT, OUT.stat().st_size)


if __name__ == '__main__':
    main()
