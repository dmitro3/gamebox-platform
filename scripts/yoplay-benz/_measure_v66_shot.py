# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw
import json
import math
from pathlib import Path

p = Path(r"c:\Users\pc\AppData\Local\Temp\cursor\screenshots\v66-tab-now.png")
im = Image.open(p).convert("RGB")
W, H = im.size
print("official shot", W, H)

px = im.load()
minx, miny, maxx, maxy = W, H, 0, 0
for y in range(0, H, 2):
    for x in range(0, W, 2):
        r, g, b = px[x, y]
        if r + g + b > 40:
            minx = min(minx, x)
            miny = min(miny, y)
            maxx = max(maxx, x)
            maxy = max(maxy, y)
print("content", minx, miny, maxx, maxy, "cw", maxx - minx + 1, "ch", maxy - miny + 1)

game = im.crop((minx, miny, maxx + 1, maxy + 1))
gw, gh = game.size
scale = 480 / gw
design_h = gh * scale
print("scale to 480w -> h", design_h)

scaled = game.resize((480, int(round(design_h))), Image.Resampling.LANCZOS)
sw, sh = scaled.size
out = scaled.copy()
dr = ImageDraw.Draw(out)
spx = scaled.load()


def is_cyan(r, g, b):
    return b > 150 and g > 90 and r < 140 and (b - r) > 40


band = []
for y in range(sh):
    c = 0
    for x in range(0, sw, 2):
        if is_cyan(*spx[x, y]):
            c += 1
    if c > 25:
        band.append((y, c))
print("cyan bands sample", band[:: max(1, len(band) // 20)][:25], "total", len(band))

panel_candidates = [y for y, c in band if y > sh * 0.35]
panel_top = panel_candidates[0] if panel_candidates else int(sh * 0.45)
print("est panel_top", panel_top, "panel_h", sh - panel_top)

best = None
for cy in range(panel_top + 40, min(panel_top + 220, sh - 20), 3):
    for cx in range(160, 320, 3):
        score = 0
        for ang in range(0, 360, 15):
            for rad in (55, 62, 68):
                x = int(cx + rad * math.cos(math.radians(ang)))
                y = int(cy + rad * math.sin(math.radians(ang)))
                if 0 <= x < sw and 0 <= y < sh and is_cyan(*spx[x, y]):
                    score += 1
        if best is None or score > best[0]:
            best = (score, cx, cy)
print("start candidate", best)

if best:
    _, cx, cy = best
    dr.ellipse([cx - 70, cy - 70, cx + 70, cy + 70], outline=(255, 0, 0), width=2)
dr.line([0, panel_top, sw, panel_top], fill=(0, 255, 0), width=2)

layout = {
    "shot": {"w": W, "h": H},
    "content": {"x": minx, "y": miny, "w": gw, "h": gh},
    "scaled480": {"w": sw, "h": sh},
    "panelTopEst": panel_top,
    "startEst": {"cx": best[1], "cy": best[2], "score": best[0]} if best else None,
}
out_json = Path(r"c:\Users\pc\Desktop\gamebox-platform\scripts\yoplay-benz\_v66_layout_measure.json")
out_json.write_text(json.dumps(layout, indent=2), encoding="utf-8")
out_path = Path(r"c:\Users\pc\AppData\Local\Temp\cursor\screenshots\v66-annotated-480.png")
out.save(out_path)
print("wrote", out_path)
print(json.dumps(layout, indent=2))
