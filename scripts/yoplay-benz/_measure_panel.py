# -*- coding: utf-8 -*-
"""测量 panel_mobile.png 上圆形/矩形占位的中心坐标。"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

PANEL = Path("client-app/public/images/games/bcbm/h5/panel_mobile.png")
OUT = Path("client-app/public/images/games/bcbm/h5/panel_annotated.png")

im = Image.open(PANEL).convert("RGBA")
w, h = im.size
print("panel", w, h)
px = im.load()

# 找高亮描边：高蓝、低红
mask = Image.new("L", (w, h), 0)
mp = mask.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 20:
            continue
        if b > 140 and b > r + 40 and b > g - 10:
            mp[x, y] = 255

# 简化：按行统计亮度找圆
# 检测圆形：找局部“环”的质心 — 用连通域在 mask 上
from collections import deque

visited = [[False] * w for _ in range(h)]
blobs = []


def flood(sx, sy):
    q = deque([(sx, sy)])
    visited[sy][sx] = True
    pts = []
    while q:
        x, y = q.popleft()
        pts.append((x, y))
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and mp[nx, ny] > 0:
                visited[ny][nx] = True
                q.append((nx, ny))
    return pts


for y in range(0, h, 2):
    for x in range(0, w, 2):
        if mp[x, y] > 0 and not visited[y][x]:
            pts = flood(x, y)
            if len(pts) < 80:
                continue
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            minx, maxx = min(xs), max(xs)
            miny, maxy = min(ys), max(ys)
            bw, bh = maxx - minx + 1, maxy - miny + 1
            cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
            # roughly circular or rectangular frames
            aspect = bw / max(bh, 1)
            blobs.append(
                {
                    "cx": round(cx, 1),
                    "cy": round(cy, 1),
                    "w": bw,
                    "h": bh,
                    "area": len(pts),
                    "aspect": round(aspect, 2),
                }
            )

# 去重：中心接近的合并
blobs.sort(key=lambda b: -b["area"])
kept = []
for b in blobs:
    if any(abs(b["cx"] - k["cx"]) < 18 and abs(b["cy"] - k["cy"]) < 18 for k in kept):
        continue
    kept.append(b)

# 分类：圆 vs 横条
circles = [b for b in kept if 0.75 <= b["aspect"] <= 1.35 and b["w"] >= 28]
bars = [b for b in kept if b["aspect"] > 1.6 and b["h"] < 60]
circles.sort(key=lambda b: (b["cy"], b["cx"]))
bars.sort(key=lambda b: (b["cy"], b["cx"]))

print("\n=== CIRCLES ===")
for b in circles:
    print(b)
print("\n=== BARS ===")
for b in bars[:20]:
    print(b)

ann = im.convert("RGBA").copy()
draw = ImageDraw.Draw(ann)
for b in circles:
    r = max(b["w"], b["h"]) / 2
    draw.ellipse([b["cx"] - r, b["cy"] - r, b["cx"] + r, b["cy"] + r], outline=(255, 0, 0, 255), width=2)
    draw.text((b["cx"] - 10, b["cy"] - 8), f"{int(b['cx'])},{int(b['cy'])}", fill=(255, 255, 0, 255))
ann.save(OUT)
print("annotated", OUT)
