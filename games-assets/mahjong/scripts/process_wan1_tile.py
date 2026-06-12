# -*- coding: utf-8 -*-
"""AI 一万牌：rembg 抠图 + 去黑边噪点 + 导出多尺寸（不做手绘绿边）"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove as rembg_remove

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'tiles' / 'wan1-ai-source.png'
FACE_IVORY = np.array([252.0, 251.0, 248.0], dtype=np.float32)  # 米白（偏中性）
OUT_HD = ROOT / 'assets' / 'tiles' / 'hd' / 'wan1@3x.png'
OUT_STD = ROOT / 'assets' / 'tiles' / 'wan1.png'
OUT_PREVIEW = ROOT / 'assets' / 'tiles' / 'wan1-preview-dark.png'
OUT_SRC_COPY = ROOT / 'assets' / 'tiles' / 'wan1-ai-source.png'

HD_W, HD_H = 288, 360
STD_W, STD_H = 96, 120


def _is_green(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    return (g > r + 8) & (g > b + 4) & (g > 55)


def _is_red(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    return (r > 120) & (r > g + 35) & (r > b + 35)


def _remove_checkerboard(rgba: np.ndarray) -> np.ndarray:
    out = rgba.copy()
    rgb = out[:, :, :3].astype(np.float32)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    warm = (r > g + 2) | (g > b + 2)
    tile_like = warm | _is_red(rgb) | _is_green(rgb.astype(np.uint8))
    neutral = (np.abs(r - g) < 14) & (np.abs(g - b) < 14)
    checker = neutral & (r > 155) & (r < 253) & ~tile_like
    out[checker, 3] = 0
    return out


def _defringe(rgba: np.ndarray) -> np.ndarray:
    """去掉透明边缘黑边、牌面杂点"""
    out = rgba.copy()
    h, w = out.shape[:2]
    alpha = out[:, :, 3].astype(np.uint8)

    alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    alpha = cv2.GaussianBlur(alpha.astype(np.float32), (0, 0), 0.55)
    out[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)

    rgb = out[:, :, :3]
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    dark = (r < 72) & (g < 72) & (b < 72)
    semi = (out[:, :, 3] > 0) & (out[:, :, 3] < 245)
    out[dark & semi, 3] = 0

    face = (out[:, :, 3] > 200) & ~_is_green(rgb) & ~_is_red(rgb)
    speck = face & dark
    if speck.any():
        speck_u8 = speck.astype(np.uint8) * 255
        n, labels, stats, _ = cv2.connectedComponentsWithStats(speck_u8, connectivity=8)
        for i in range(1, n):
            if stats[i, cv2.CC_STAT_AREA] <= 24:
                out[labels == i, 3] = 0

    edge = np.zeros((h, w), np.uint8)
    edge[2 : h - 2, 2 : w - 2] = 255
    edge = 255 - cv2.erode(edge, np.ones((5, 5), np.uint8))
    fringe = edge > 0
    dark_fringe = fringe & dark & (out[:, :, 3] > 0)
    out[dark_fringe, 3] = 0

    return out


def _face_mask(rgba: np.ndarray) -> np.ndarray:
    rgb = rgba[:, :, :3]
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    bright = (r > 175) & (g > 165) & (b > 155)
    return (rgba[:, :, 3] > 200) & bright & ~_is_green(rgb) & ~_is_red(rgb)


def _shift_face_ivory(rgba: np.ndarray) -> np.ndarray:
    """牌面去黄偏色，调整为米白"""
    out = rgba.astype(np.float32).copy()
    face = _face_mask(out.astype(np.uint8))
    if not face.any():
        return rgba

    r, g, b = out[:, :, 0], out[:, :, 1], out[:, :, 2]
    lum = r * 0.299 + g * 0.587 + b * 0.114
    strength = np.clip((lum - 120) / 100, 0, 1) * face.astype(np.float32)

    warm = np.clip(r - b, 0, 80)
    nr = np.where(face, np.clip(r - warm * 0.42 * strength, 0, 255), r)
    ng = np.where(face, np.clip(g - warm * 0.18 * strength + 4 * strength, 0, 255), g)
    nb = np.where(face, np.clip(b + warm * 0.28 * strength + 8 * strength, 0, 255), b)

    mix = strength * 0.55
    lift = 10.0 * strength
    nr = np.where(face, np.clip(nr * (1 - mix) + FACE_IVORY[0] * mix + lift, 0, 255), nr)
    ng = np.where(face, np.clip(ng * (1 - mix) + FACE_IVORY[1] * mix + lift, 0, 255), ng)
    nb = np.where(face, np.clip(nb * (1 - mix) + FACE_IVORY[2] * mix + lift, 0, 255), nb)

    out[:, :, 0], out[:, :, 1], out[:, :, 2] = nr, ng, nb
    return out.astype(np.uint8)


def _crop_to_tile(rgba: np.ndarray, pad: int = 6) -> np.ndarray:
    mask = rgba[:, :, 3] > 24
    if not mask.any():
        return rgba
    ys, xs = np.where(mask)
    y0, y1 = max(0, ys.min() - pad), min(rgba.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(rgba.shape[1], xs.max() + pad + 1)
    return rgba[y0:y1, x0:x1]


def _fit_size(tile: Image.Image, w: int, h: int) -> Image.Image:
    tw, th = tile.size
    scale = min(w / tw, h / th)
    nw, nh = max(1, int(tw * scale)), max(1, int(th * scale))
    resized = tile.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((w - nw) // 2, (h - nh) // 2))
    return canvas.filter(ImageFilter.UnsharpMask(radius=0.6, percent=75, threshold=3))


def _preview_dark(tile: Image.Image) -> Image.Image:
    pw, ph = 480, 600
    canvas = Image.new('RGBA', (pw, ph), (10, 6, 4, 255))
    tw = int(pw * 0.55)
    th = int(tw * tile.height / tile.width)
    t = tile.resize((tw, th), Image.Resampling.LANCZOS)
    canvas.alpha_composite(t, ((pw - tw) // 2, (ph - th) // 2))
    return canvas.convert('RGB')


def main() -> None:
    if not SRC.exists():
        raise FileNotFoundError(f'缺少源图: {SRC}')

    src_img = Image.open(SRC).convert('RGBA')
    OUT_SRC_COPY.parent.mkdir(parents=True, exist_ok=True)
    src_img.save(OUT_SRC_COPY)

    cut = rembg_remove(src_img)
    rgba = _remove_checkerboard(np.array(cut, dtype=np.uint8))
    rgba = _defringe(rgba)
    rgba = _shift_face_ivory(rgba)
    rgba = _crop_to_tile(rgba)
    tile = Image.fromarray(rgba, 'RGBA')

    OUT_HD.parent.mkdir(parents=True, exist_ok=True)
    hd = Image.fromarray(_shift_face_ivory(np.array(_fit_size(tile, HD_W, HD_H), dtype=np.uint8)), 'RGBA')
    std = Image.fromarray(_shift_face_ivory(np.array(_fit_size(tile, STD_W, STD_H), dtype=np.uint8)), 'RGBA')
    hd.save(OUT_HD, optimize=True)
    std.save(OUT_STD, optimize=True)
    _preview_dark(hd).save(OUT_PREVIEW, optimize=True)
    print('OK', OUT_HD, OUT_STD, OUT_PREVIEW)


if __name__ == '__main__':
    main()
