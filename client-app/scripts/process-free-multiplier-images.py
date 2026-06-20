"""Post-process AI-generated free-spin multiplier sprites to 569x82 transparent PNGs."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

W, H = 569, 82
OUT_DIR = Path(__file__).resolve().parents[1] / "public/images/games/mahjong/lingguang"
GEN_DIR = Path(r"C:\Users\pc\.cursor\projects\c-Users-pc-Desktop-gamebox-platform\assets")

PAIRS = [
    ("multiplier-values-free-gen.png", "multiplier-values-free.png"),
    ("multiplier-values-free-active-gen.png", "multiplier-values-free-active.png"),
]


def remove_black_bg(img: Image.Image, thresh: int = 42) -> Image.Image:
    arr = np.array(img.convert("RGBA"))
    rgb = arr[:, :, :3].astype(int)
    dark = rgb.max(axis=2) < thresh
    arr[dark, 3] = 0
    return Image.fromarray(arr)


def content_bbox(img: Image.Image, lum_thresh: int = 40) -> tuple[int, int, int, int]:
    arr = np.array(img.convert("RGBA"))
    rgb = arr[:, :, :3]
    mask = rgb.max(axis=2) > lum_thresh
    ys, xs = np.where(mask)
    pad = 4
    return (
        max(0, xs.min() - pad),
        max(0, ys.min() - pad),
        min(img.width, xs.max() + pad + 1),
        min(img.height, ys.max() + pad + 1),
    )


def process(src_name: str, dst_name: str) -> None:
    src = GEN_DIR / src_name
    im = Image.open(src).convert("RGBA")
    box = content_bbox(im)
    cropped = im.crop(box)
    cropped = remove_black_bg(cropped)
    resized = cropped.resize((W, H), Image.Resampling.LANCZOS)
    dst = OUT_DIR / dst_name
    resized.save(dst, optimize=True)
    print(f"Saved {dst} from crop {box}")


def main() -> None:
    for src, dst in PAIRS:
        process(src, dst)


if __name__ == "__main__":
    main()
