# -*- coding: utf-8 -*-
"""从 room-bg 去掉中部绿毡牌区（含金框），换成暗木底"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
BG_JPG = ASSETS / 'room-bg.jpg'
BG_PNG = ASSETS / 'room-bg.png'
PLAIN = ASSETS / 'room-bg-plain.jpg'

# 绿毡+金框整体区域
FELT_BOX = dict(x0=0.024, x1=0.976, y0=0.150, y1=0.835)


def _make_wood_patch(w: int, h: int, ref_rgb: tuple[int, int, int]) -> np.ndarray:
    if PLAIN.exists():
        src = Image.open(PLAIN).convert('RGB')
        sw, sh = src.size
        crop = src.crop((int(sw * 0.08), int(sh * 0.12), int(sw * 0.92), int(sh * 0.58)))
        patch = crop.resize((w, h), Image.Resampling.LANCZOS)
        patch = ImageEnhance.Brightness(patch).enhance(0.42)
        patch = ImageEnhance.Contrast(patch).enhance(1.08)
        patch = patch.filter(ImageFilter.GaussianBlur(radius=0.5))
        arr = np.array(patch, dtype=np.float32)
    else:
        arr = np.zeros((h, w, 3), dtype=np.float32)
        arr[:] = ref_rgb

    # 与参考暗木色对齐
    ref = np.array(ref_rgb, dtype=np.float32)
    mean = arr.reshape(-1, 3).mean(axis=0)
    arr = arr * 0.72 + ref * 0.28
  # 上下略暗
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    vignette = 1.0 - 0.12 * np.abs(yy - 0.5) * 2
    arr *= vignette[..., None]
    return np.clip(arr, 0, 255).astype(np.uint8)


def remove_green_felt(img: Image.Image) -> Image.Image:
    arr = np.array(img.convert('RGB'), dtype=np.uint8)
    h, w = arr.shape[:2]

    x0 = int(w * FELT_BOX['x0'])
    x1 = int(w * FELT_BOX['x1'])
    y0 = int(h * FELT_BOX['y0'])
    y1 = int(h * FELT_BOX['y1'])

    ref_y = min(h - 2, y1 + int(h * 0.02))
    ref_rgb = tuple(int(x) for x in arr[ref_y, w // 2])
    fill_arr = _make_wood_patch(x1 - x0, y1 - y0, ref_rgb)

    out = arr.astype(np.float32)
    feather = 16
    ys = np.arange(y0, y1, dtype=np.float32)
    xs = np.arange(x0, x1, dtype=np.float32)
    yy, xx = np.meshgrid(ys, xs, indexing='ij')
    dist = np.minimum.reduce([yy - y0, y1 - 1 - yy, xx - x0, x1 - 1 - xx])
    alpha = np.clip(dist / feather, 0, 1)[..., None]

    orig = arr[y0:y1, x0:x1].astype(np.float32)
    patch = fill_arr.astype(np.float32)
    blended = orig * (1 - alpha) + patch * alpha
    out[y0:y1, x0:x1] = blended

    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGB')


def main() -> None:
    if not BG_JPG.exists():
        raise FileNotFoundError(BG_JPG)
    fixed = remove_green_felt(Image.open(BG_JPG))
    fixed.save(BG_JPG, 'JPEG', quality=94, optimize=True, progressive=True)
    fixed.save(BG_PNG, 'PNG', optimize=True)
    print('OK', BG_JPG, BG_PNG, fixed.size)


if __name__ == '__main__':
    main()
