"""半圈竖斑马线背景：基于 AI 参考图，仅保留下弧 + 贴底"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'result' / 'bg.png'
SRC = Path(
    r'C:\Users\pc\.cursor\projects\c-Users-pc-Desktop-gamebox-platform\assets'
    r'\c__Users_pc_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_download-81aa4366-2c99-4412-9cd4-8165148c2430.png'
)
AI = ROOT / 'assets' / 'result' / 'ai-sources'
W, H = 960, 600


def lum(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def fit_canvas(img: Image.Image) -> Image.Image:
    img = img.convert('RGBA')
    scale = W / img.width
    nh = int(img.height * scale)
    img = img.resize((W, nh), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (W, H), (8, 12, 20, 255))
    canvas.paste(img, (0, H - nh))
    return canvas


def keep_semicircle(img: Image.Image) -> Image.Image:
    w, h = img.size
    cx = w * 0.5
    cy = h * 0.40
    rx, ry = w * 0.44, h * 0.36
    px = img.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            L = lum(r, g, b)
            if L < 46:
                continue
            dx, dy = x - cx, y - cy
            dist = math.hypot(dx / rx, dy / ry)
            in_band = 0.68 <= dist <= 1.08
            # 严格只要圆心水平线以下（半圈下弧）
            below = dy >= 0
            if in_band and below:
                continue
            bg = dark_at(img, x, y)
            px[x, y] = mix(bg, (r, g, b, a), 0.97)

    return img


def dark_at(img: Image.Image, x: int, y: int) -> tuple[int, int, int, int]:
    w, h = img.size
    sy = max(0, min(h - 1, int(h * 0.08 + y * 0.05)))
    sx = max(0, min(w - 1, x))
    c = img.getpixel((sx, sy))
    if len(c) == 3:
        r, g, b = c
        a = 255
    else:
        r, g, b, a = c
    return (max(5, int(r * 0.35)), max(8, int(g * 0.35)), max(12, int(b * 0.45)), a)


def mix(bg: tuple, fg: tuple, t: float) -> tuple[int, int, int, int]:
    return tuple(int(fg[i] * (1 - t) + bg[i] * t) for i in range(4))


def fog_top(img: Image.Image) -> Image.Image:
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w, h = img.size
    for y in range(int(h * 0.38)):
        a = int(170 * (1 - y / (h * 0.38)) ** 1.3)
        d.line([(0, y), (w, y)], fill=(6, 10, 18, a))
    return Image.alpha_composite(img, layer)


def main() -> None:
    if not SRC.exists():
        raise FileNotFoundError(SRC)
    AI.mkdir(parents=True, exist_ok=True)
    Image.open(SRC).save(AI / 'bg-zebra-full-ref.png')

    img = fit_canvas(Image.open(SRC))
    img = keep_semicircle(img)
    img = fog_top(img)
    img = img.filter(ImageFilter.GaussianBlur(radius=0.35))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.convert('RGB').save(OUT, 'PNG', optimize=True)
    print('saved', OUT)


if __name__ == '__main__':
    main()
