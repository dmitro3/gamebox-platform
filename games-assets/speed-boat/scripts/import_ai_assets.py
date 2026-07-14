# -*- coding: utf-8 -*-
"""导入 AI 飞艇/背景 — 绿幕 chroma key（保留艇身白/半透明浪花）"""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RESULT = ROOT / 'assets' / 'result'
AI = RESULT / 'ai'
SRC = RESULT / 'ai-sources'
CURSOR_SRC = Path(r'C:\Users\pc\.cursor\projects\c-Users-pc-Desktop-gamebox-platform\assets')

AI.mkdir(parents=True, exist_ok=True)
SRC.mkdir(parents=True, exist_ok=True)

# PK10 标准艇身配色（供文档/验收对照）
BOAT_THEMES = {
    1: 'bright yellow and white',
    2: 'royal blue and white',
    3: 'dark charcoal grey and white',
    4: 'orange and white',
    5: 'cyan teal and white',
    6: 'purple and white',
    7: 'silver grey and white',
    8: 'red and white',
    9: 'maroon brown and white',
    10: 'green and white',
}


def resolve_src(name: str) -> Path | None:
    for base in (SRC, CURSOR_SRC):
        p = base / name
        if p.exists():
            return p
    return None


def mirror_src(name: str) -> None:
    src = CURSOR_SRC / name
    if not src.exists():
        return
    dst = SRC / name
    if not dst.exists() or src.stat().st_mtime > dst.stat().st_mtime:
        shutil.copy2(src, dst)


def sample_ratio(img: Image.Image, predicate) -> float:
    sample = img.convert('RGBA').resize((48, 48))
    hits = sum(1 for r, g, b, a in sample.getdata() if predicate(r, g, b, hard=True))
    return hits / max(1, sample.width * sample.height)


def is_green_pixel(r: int, g: int, b: int, hard: bool = False) -> bool:
    if hard:
        return g >= 120 and g >= r + 35 and g >= b + 35
    return g >= 95 and g >= r + 22 and g >= b + 22


def is_magenta_pixel(r: int, g: int, b: int, hard: bool = False) -> bool:
    if hard:
        return r >= 120 and b >= 120 and r >= g + 35 and b >= g + 35
    return r >= 95 and b >= 95 and r >= g + 22 and b >= g + 22


def green_dominance(r: int, g: int, b: int) -> int:
    return g - max(r, b)


def magenta_dominance(r: int, g: int, b: int) -> int:
    return min(r, b) - g


def chroma_alpha(dominance: int, is_bg: bool) -> int:
    """0 = 全透明，255 = 全保留"""
    if not is_bg:
        return 255
    if dominance >= 48:
        return 0
    return int(255 * (1.0 - dominance / 48.0))


def chroma_key(img: Image.Image, is_bg, dominance) -> Image.Image:
    img = img.convert('RGBA')
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            na = chroma_alpha(dominance(r, g, b), is_bg(r, g, b))
            if na <= 0:
                px[x, y] = (r, g, b, 0)
            elif na < 255:
                px[x, y] = (r, g, b, int(a * na / 255))
    return img


def despill_green(img: Image.Image, strength: float = 0.55) -> Image.Image:
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            if g > max(r, b) + 8:
                g = int(g - (g - max(r, b)) * strength)
                px[x, y] = (r, max(0, g), b, a)
    return img


def despill_magenta(img: Image.Image, strength: float = 0.55) -> Image.Image:
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            if min(r, b) > g + 8:
                over_r = r - g
                over_b = b - g
                r = int(r - max(0, over_r) * strength)
                b = int(b - max(0, over_b) * strength)
                px[x, y] = (max(0, r), g, max(0, b), a)
    return img


def trim_alpha(img: Image.Image, pad: int = 12) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad)
    y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


def key_boat(img: Image.Image) -> Image.Image:
    """按背景色选抠图方案：洋红幕（绿色艇专用）> 绿幕 > 旧白底泛洪"""
    if sample_ratio(img, is_magenta_pixel) > 0.08:
        return despill_magenta(chroma_key(img, is_magenta_pixel, magenta_dominance))
    if sample_ratio(img, is_green_pixel) > 0.08:
        return despill_green(chroma_key(img, is_green_pixel, green_dominance))
    return despill_green(_legacy_white_flood(img))


def _legacy_white_flood(img: Image.Image) -> Image.Image:
    from collections import deque

    def is_white(r: int, g: int, b: int) -> bool:
        return r >= 248 and g >= 248 and b >= 248

    img = img.convert('RGBA')
    w, h = img.size
    px = img.load()
    seen = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if x < 0 or x >= w or y < 0 or y >= h:
            return
        i = y * w + x
        if seen[i]:
            return
        r, g, b, a = px[x, y]
        if is_white(r, g, b):
            seen[i] = 1
            q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        px[x, y] = (px[x, y][0], px[x, y][1], px[x, y][2], 0)
        push(x + 1, y)
        push(x - 1, y)
        push(x, y + 1)
        push(x, y - 1)
    return img


def normalize_boat(img: Image.Image, target_w: int = 760) -> Image.Image:
    img = trim_alpha(key_boat(img))
    if img.width <= 0:
        return img
    ratio = target_w / img.width
    nh = max(1, int(img.height * ratio))
    return img.resize((target_w, nh), Image.Resampling.LANCZOS)


def save_boat(n: int) -> None:
    name = f'jsb-ai-boat-{n:02d}.png'
    mirror_src(name)
    src = resolve_src(name)
    if not src:
        print('skip missing', name)
        return
    img = normalize_boat(Image.open(src))
    out = AI / f'boat-{n:02d}.png'
    img.save(out, 'PNG', optimize=True)
    print('boat', out.name, img.size, '<-', src.name)


def save_bg() -> None:
    for name in ('jsb-sea-bg.png', 'bg.png'):
        mirror_src(name)
        src = resolve_src(name)
        if src:
            img = Image.open(src).convert('RGB')
            out = RESULT / 'bg.png'
            img.save(out, 'PNG', optimize=True)
            print('bg', out, img.size)
            return
    print('bg source missing')


if __name__ == '__main__':
    for i in range(1, 11):
        save_boat(i)
    save_bg()
    print('done')
