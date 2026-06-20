"""Generate free-spin multiplier bar sprites: x2 x4 x6 x10 (569x82, transparent)."""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_DIR = Path(__file__).resolve().parents[1] / "public/images/games/mahjong/lingguang"
W, H = 569, 82
LABELS = ["x2", "x4", "x6", "x10"]
# Even slot centers (percent) — x10 gets a slightly wider slot
SLOT_CENTERS = [0.125, 0.375, 0.625, 0.875]
SLOT_WIDTHS = [0.22, 0.22, 0.22, 0.28]
FONT_PATH = r"C:\Windows\Fonts\arialbd.ttf"


def _load_font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size)


def _fit_font(label: str, slot_w: int, max_h: int) -> ImageFont.FreeTypeFont:
    for size in range(max_h, 20, -1):
        font = _load_font(size)
        bbox = font.getbbox(label)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        if tw <= slot_w * 0.92 and th <= max_h * 0.88:
            return font
    return _load_font(24)


def _add_grain(img: Image.Image, strength: float) -> Image.Image:
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            n = (random.random() - 0.5) * strength
            px[x, y] = (
                max(0, min(255, int(r + n))),
                max(0, min(255, int(g + n * 0.85))),
                max(0, min(255, int(b + n * 0.4))),
                a,
            )
    return img


def _render_label(
    label: str,
    font: ImageFont.FreeTypeFont,
    mode: str,
) -> Image.Image:
    bbox = font.getbbox(label)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = 14
    cw, ch = tw + pad * 2, th + pad * 2
    base = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    ox, oy = pad - bbox[0], pad - bbox[1]

    if mode == "regular":
        outline = (120, 70, 10, 255)
        mid = (210, 150, 35)
        face = (165, 105, 18)
        hi = (255, 220, 120)
        glow = (255, 190, 60, 90)
        outline_w = 3
    else:
        outline = (90, 45, 0, 255)
        mid = (255, 215, 60)
        face = (255, 190, 20)
        hi = (255, 255, 210)
        glow = (255, 240, 120, 130)
        outline_w = 4

    draw = ImageDraw.Draw(base)

    # Outer glow
    for r in range(6, 0, -1):
        draw.text(
            (ox, oy),
            label,
            font=font,
            fill=(glow[0], glow[1], glow[2], max(0, glow[3] - r * 12)),
            stroke_width=r + outline_w,
            stroke_fill=(255, 180, 40, 40),
        )

    # Dark outline
    draw.text(
        (ox, oy),
        label,
        font=font,
        fill=face,
        stroke_width=outline_w + 2,
        stroke_fill=outline,
    )

    # Gold body
    draw.text((ox, oy), label, font=font, fill=mid)

    # Top highlight pass (slightly offset)
    hi_layer = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    hi_draw = ImageDraw.Draw(hi_layer)
    hi_draw.text((ox, oy - 1), label, font=font, fill=(*hi, 180))
    hi_layer = hi_layer.filter(ImageFilter.GaussianBlur(0.6))
    base = Image.alpha_composite(base, hi_layer)

    if mode == "regular":
        base = _add_grain(base, 28)
        # Slightly darken for sandblasted look
        dark = Image.new("RGBA", base.size, (40, 20, 0, 55))
        base = Image.alpha_composite(base, dark)
    else:
        base = base.filter(ImageFilter.GaussianBlur(0.3))
        bright = Image.new("RGBA", base.size, (255, 220, 80, 35))
        base = Image.alpha_composite(base, bright)

    return base


def build_sprite(mode: str) -> Image.Image:
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for label, cx_pct, slot_pct in zip(LABELS, SLOT_CENTERS, SLOT_WIDTHS):
        slot_w = int(W * slot_pct)
        font = _fit_font(label, slot_w, H - 8)
        glyph = _render_label(label, font, mode)
        cx = int(W * cx_pct)
        x = cx - glyph.width // 2
        y = (H - glyph.height) // 2
        canvas.alpha_composite(glyph, (x, y))
    return canvas


def main() -> None:
    random.seed(42)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    regular = build_sprite("regular")
    active = build_sprite("active")

    regular_path = OUT_DIR / "multiplier-values-free.png"
    active_path = OUT_DIR / "multiplier-values-free-active.png"

    regular.save(regular_path, optimize=True)
    active.save(active_path, optimize=True)

    print(f"Saved {regular_path} ({regular.size})")
    print(f"Saved {active_path} ({active.size})")


if __name__ == "__main__":
    main()
