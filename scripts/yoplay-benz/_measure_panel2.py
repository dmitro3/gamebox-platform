# -*- coding: utf-8 -*-
"""用暗色圆洞检测 panel 上的圆形占位中心。"""
from pathlib import Path
import math
from PIL import Image, ImageDraw

PANEL = Path("client-app/public/images/games/bcbm/h5/panel_mobile.png")
im = Image.open(PANEL).convert("RGBA")
w, h = im.size
px = im.load()

# 采样：找“周围亮、中心暗”的点作为圆候选
candidates = []
for y in range(40, h - 20, 3):
    for x in range(20, w - 20, 3):
        r, g, b, a = px[x, y]
        if a < 10:
            continue
        # 中心偏暗
        lum = (r + g + b) / 3
        if lum > 55:
            continue
        # 四周在半径处有亮蓝
        ok = 0
        for rad in (22, 28, 36, 48, 60):
            bright = 0
            tot = 0
            for ang in range(0, 360, 30):
                nx = int(x + rad * math.cos(math.radians(ang)))
                ny = int(y + rad * math.sin(math.radians(ang)))
                if not (0 <= nx < w and 0 <= ny < h):
                    continue
                rr, gg, bb, aa = px[nx, ny]
                tot += 1
                if aa > 40 and bb > 120 and bb > rr + 20:
                    bright += 1
            if tot and bright / tot >= 0.45:
                ok = rad
                break
        if ok:
            candidates.append((x, y, ok, lum))

# 聚类
cands = sorted(candidates, key=lambda t: t[3])  # darker first
kept = []
for x, y, rad, lum in cands:
    if any((x - kx) ** 2 + (y - ky) ** 2 < (rad * 0.7) ** 2 for kx, ky, kr, _ in kept):
        continue
    kept.append((x, y, rad, lum))

kept.sort(key=lambda t: (t[1], t[0]))
print("circles found", len(kept))
for x, y, rad, lum in kept:
    print(f"  cx={x} cy={y} r≈{rad} lum={lum:.0f}")

ann = im.copy()
draw = ImageDraw.Draw(ann)
for x, y, rad, lum in kept:
    draw.ellipse([x - rad, y - rad, x + rad, y + rad], outline=(255, 0, 0, 255), width=2)
    draw.text((x - 16, y - 6), f"{x},{y}", fill=(255, 255, 0, 255))
out = Path("client-app/public/images/games/bcbm/h5/panel_circles.png")
ann.save(out)
print("saved", out)

# 设计建议：panel 贴在舞台底部，舞台 480 宽（与 panel 同宽）或 640 缩放
print("\nSuggested layout (panel bottom-aligned, stage 480x852 = 480*(715/480)):")
print("  stage 480 x", round(480 * 715 / 480))
print("  bg = bg_portrait stretched")
print("  panel at y=", round(480 * 715 / 480) - 426)
