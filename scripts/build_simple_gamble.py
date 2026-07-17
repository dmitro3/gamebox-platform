"""Simple gamble sheets: same gold frame as idle, dark center + number circle."""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

OUT = Path(r"c:\Users\pc\Desktop\gamebox-platform\client-app\public\images\games\slots\center\sheets")
IDLE = Image.open(OUT / "idle.png").convert("RGB")
CW, CH = 256, 341
BASE = IDLE.crop((0, 0, CW, CH))


def orange_mask(arr: np.ndarray) -> np.ndarray:
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    m = (r > 160) & (g > 60) & (g < 200) & (b < 100)
    try:
        from scipy import ndimage

        m = ndimage.binary_erosion(m, iterations=2)
    except Exception:
        pass
    return m


def make_cell(kind: str, i: int, n: int) -> Image.Image:
    arr = np.array(BASE).astype(np.float32)
    orange = orange_mask(arr)
    t = i / max(1, n - 1)

    if kind == "roll":
        fill = np.array([16.0, 26.0, 44.0]) * (1.0 + 0.05 * math.sin(i * 0.7))
    elif kind == "win":
        fill = np.array([26.0, 40.0, 28.0]) * (1.0 + 0.16 * math.sin(t * math.pi))
    else:
        fill = np.array([20.0, 16.0, 22.0]) * (1.0 - 0.4 * t)

    arr[orange] = fill
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    cx, cy = CW // 2, int(CH * 0.5)
    rad = int(min(CW, CH) * 0.26)

    for thick, color in [(9, (170, 120, 35)), (5, (255, 205, 80)), (2, (255, 235, 150))]:
        d.ellipse(
            [cx - rad - thick, cy - rad - thick, cx + rad + thick, cy + rad + thick],
            outline=color,
            width=max(2, thick // 2),
        )
    d.ellipse([cx - rad + 1, cy - rad + 1, cx + rad - 1, cy + rad - 1], fill=(6, 8, 12))

    bulbs = 16
    phase = i % bulbs
    for b in range(bulbs):
        ang = -math.pi / 2 + b * 2 * math.pi / bulbs
        bx = cx + int((rad + 4) * math.cos(ang))
        by = cy + int((rad + 4) * math.sin(ang))
        on = (b - phase) % bulbs < 4
        if kind == "lose":
            col = (100, 75, 40) if on else (45, 35, 22)
            br = 2
        elif kind == "win":
            col = (255, 240, 130) if on else (190, 140, 55)
            br = 3 if on else 2
        else:
            col = (255, 225, 95) if on else (150, 110, 45)
            br = 3 if on else 2
        d.ellipse([bx - br, by - br, bx + br, by + br], fill=col)

    if kind == "win" and i >= n // 4:
        glow = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        a = int(35 + 45 * abs(math.sin(t * math.pi)))
        gd.ellipse([cx - rad - 16, cy - rad - 16, cx + rad + 16, cy + rad + 16], fill=(255, 195, 50, a))
        glow = glow.filter(ImageFilter.GaussianBlur(7))
        img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")

    if kind == "lose" and t > 0.35:
        img = ImageEnhance.Brightness(img).enhance(1.0 - 0.4 * (t - 0.35) / 0.65)

    return img


def build(kind: str, cols: int, rows: int) -> Image.Image:
    # Keep idle cell aspect: pad into 1024x1024 sheet
    sheet = Image.new("RGB", (1024, 1024), (0, 0, 0))
    n = cols * rows
    cell_w = 1024 // cols
    cell_h = 1024 // rows
    for i in range(n):
        cell = make_cell(kind, i, n).resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        c, r = i % cols, i // cols
        sheet.paste(cell, (c * cell_w, r * cell_h))
    return sheet


def main() -> None:
    # All 4x3 like idle — same rhythm, easy to read
    for kind, name in [("roll", "gamble-roll.png"), ("win", "gamble-win.png"), ("lose", "gamble-lose.png")]:
        build(kind, 4, 3).save(OUT / name, optimize=True)
        print("saved", name)


if __name__ == "__main__":
    main()
