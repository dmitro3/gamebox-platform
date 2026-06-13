# -*- coding: utf-8 -*-
"""从 PG 参考截图提取真实麻将牌空白模版（非程序化 3D）"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / 'assets' / 'ref' / 'IMG_0034.PNG'
OUT = ROOT / 'assets' / 'tiles' / 'tile-template.png'
OUT_PREVIEW = ROOT / 'assets' / 'tiles' / 'tile-template-preview.png'
OUT_PREVIEW_DARK = ROOT / 'assets' / 'tiles' / 'tile-template-preview-dark.png'

TEMPLATE_W, TEMPLATE_H = 288, 360

# 参考图 5×4 牌阵区域（IMG_0034.PNG 1320×2868）
GRID = dict(x0=0.11, x1=0.89, y0=0.205, y1=0.535, cols=5, rows=4)
# 象牙色普通牌（非金色/特殊牌）
PICK_COL, PICK_ROW = 2, 2


def _grid_cell_bounds(w: int, h: int, col: int, row: int, pad: int = 18) -> tuple[int, int, int, int]:
    gx0 = int(w * GRID['x0'])
    gx1 = int(w * GRID['x1'])
    gy0 = int(h * GRID['y0'])
    gy1 = int(h * GRID['y1'])
    cw = (gx1 - gx0) // GRID['cols']
    ch = (gy1 - gy0) // GRID['rows']
    x0 = gx0 + col * cw + pad
    y0 = gy0 + row * ch + pad
    x1 = gx0 + (col + 1) * cw - pad
    y1 = gy0 + (row + 1) * ch - pad
    return x0, y0, x1, y1


def _score_ivory_tile(rgb: np.ndarray) -> float:
    h, w = rgb.shape[:2]
    center = rgb[h // 4: 3 * h // 4, w // 4: 3 * w // 4].astype(np.float32)
    r, g, b = center[:, :, 0].mean(), center[:, :, 1].mean(), center[:, :, 2].mean()
    sat = center.max(axis=2).mean() - center.min(axis=2).mean()
    return float(255 - abs(r - g) - abs(g - b) - sat * 2)


def _find_best_ivory_tile(img: Image.Image) -> tuple[int, int]:
    w, h = img.size
    best_score, best = -1e9, (PICK_COL, PICK_ROW)
    for row in range(GRID['rows']):
        for col in range(GRID['cols']):
            box = _grid_cell_bounds(w, h, col, row, pad=12)
            crop = img.crop(box).convert('RGB')
            score = _score_ivory_tile(np.array(crop))
            if score > best_score:
                best_score, best = score, (col, row)
    return best


def _chroma_key_green(rgba: np.ndarray) -> np.ndarray:
    rgb = rgba[:, :, :3].astype(np.float32)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    alpha = rgba[:, :, 3].astype(np.float32).copy()
    alpha[:] = 255

    felt = (g > r + 12) & (g > b + 8) & (g > 65)
    gap = (g > r + 5) & (g > b + 3) & (g < 120) & (r < 75)
    alpha = np.where(felt | gap, 0, alpha)

    out = rgba.copy()
    out[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    return out


def _isolate_largest_tile(rgba: np.ndarray) -> np.ndarray:
    """只保留最大连通块（单张牌）"""
    mask = (rgba[:, :, 3] > 20).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if n <= 1:
        return rgba
    idx = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    tile_mask = (labels == idx).astype(np.uint8) * 255
    tile_mask = cv2.erode(tile_mask, np.ones((3, 3), np.uint8), iterations=1)
    out = rgba.copy()
    out[:, :, 3] = np.minimum(out[:, :, 3], tile_mask)
    ys, xs = np.where(tile_mask > 0)
    y0, y1 = ys.min(), ys.max() + 1
    x0, x1 = xs.min(), xs.max() + 1
    pad = 2
    y0, x0 = max(0, y0 - pad), max(0, x0 - pad)
    y1, x1 = min(rgba.shape[0], y1 + pad), min(rgba.shape[1], x1 + pad)
    return out[y0:y1, x0:x1]


def _blank_face(rgba: np.ndarray) -> np.ndarray:
    """牌面中心整块换象牙渐变，保留边缘倒角质感"""
    h, w = rgba.shape[:2]
    rgb = rgba[:, :, :3].astype(np.float32)

    ring = rgb[int(h * 0.06):int(h * 0.16), int(w * 0.08):int(w * 0.22)]
    ivory = ring.reshape(-1, 3).mean(axis=0)

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    grad = 1.0 - 0.055 * (((xx / w) - 0.48) ** 2 + ((yy / h) - 0.40) ** 2)
    face = np.clip(ivory * grad[..., None], 0, 255)

    fy0, fy1 = int(h * 0.10), int(h * 0.90)
    fx0, fx1 = int(w * 0.10), int(w * 0.90)
    blend = int(min(h, w) * 0.045)

    out = rgb.copy()
    out[fy0:fy1, fx0:fx1] = face[fy0:fy1, fx0:fx1]

    for i in range(blend):
        t = (i + 1) / blend
        y0, y1 = fy0 - i - 1, fy1 + i + 1
        x0, x1 = fx0 - i - 1, fx1 + i + 1
        if y0 < 0 or x0 < 0 or y1 > h or x1 > w:
            continue
        out[y0, x0:x1] = out[y0, x0:x1] * (1 - t) + face[y0, x0:x1] * t
        out[y1 - 1, x0:x1] = out[y1 - 1, x0:x1] * (1 - t) + face[y1 - 1, x0:x1] * t
        out[y0:y1, x0] = out[y0:y1, x0] * (1 - t) + face[y0:y1, x0] * t
        out[y0:y1, x1 - 1] = out[y0:y1, x1 - 1] * (1 - t) + face[y0:y1, x1 - 1] * t

    result = rgba.copy()
    result[:, :, :3] = np.clip(out, 0, 255).astype(np.uint8)
    return result


def _refine_alpha(rgba: np.ndarray) -> np.ndarray:
    a = rgba[:, :, 3].astype(np.float32)
    a = cv2.GaussianBlur(a, (0, 0), 0.8)
    out = rgba.copy()
    out[:, :, 3] = np.clip(a, 0, 255).astype(np.uint8)
    return out


def extract_template(ref_path: Path | None = None) -> Image.Image:
    ref_path = ref_path or REF
    if not ref_path.exists():
        raise FileNotFoundError(f'缺少参考图: {ref_path}')

    src = Image.open(ref_path).convert('RGBA')
    col, row = _find_best_ivory_tile(src)
    box = _grid_cell_bounds(*src.size, col, row)
    crop = np.array(src.crop(box), dtype=np.uint8)
    crop = _chroma_key_green(crop)
    crop = _isolate_largest_tile(crop)
    crop = _blank_face(crop)
    crop = _refine_alpha(crop)

    tile = Image.fromarray(crop, 'RGBA')
    tile = tile.resize((TEMPLATE_W, TEMPLATE_H), Image.Resampling.LANCZOS)
    tile = tile.filter(ImageFilter.UnsharpMask(radius=0.9, percent=95, threshold=2))
    return tile


def _preview_on_room_bg(tile: Image.Image) -> Image.Image:
    bg_path = ROOT / 'assets' / 'room-bg.jpg'
    pw, ph = 540, 960
    if bg_path.exists():
        canvas = Image.open(bg_path).convert('RGBA').resize((pw, ph), Image.Resampling.LANCZOS)
    else:
        canvas = Image.new('RGBA', (pw, ph), (10, 6, 4, 255))
    y0, y1 = int(ph * 0.20), int(ph * 0.80)
    tw = int(pw * 0.168)
    th = int(tw * tile.height / tile.width)
    t = tile.resize((tw, th), Image.Resampling.LANCZOS)
    cols, rows, gap = 5, 4, max(4, tw // 22)
    ox = (pw - (cols * tw + (cols - 1) * gap)) // 2
    oy = y0 + (y1 - y0 - (rows * th + (rows - 1) * gap)) // 2
    for r in range(rows):
        for c in range(cols):
            canvas.alpha_composite(t, (ox + c * (tw + gap), oy + r * (th + gap)))
    return canvas.convert('RGB')


def _preview_single_dark(tile: Image.Image) -> Image.Image:
    pw, ph = 480, 600
    canvas = Image.new('RGBA', (pw, ph), (10, 6, 4, 255))
    tw = int(pw * 0.58)
    th = int(tw * tile.height / tile.width)
    t = tile.resize((tw, th), Image.Resampling.LANCZOS)
    canvas.alpha_composite(t, ((pw - tw) // 2, (ph - th) // 2))
    return canvas.convert('RGB')


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    print('Extracting real PG tile from', REF)
    template = extract_template()
    template.save(OUT, optimize=True)
    _preview_on_room_bg(template).save(OUT_PREVIEW, optimize=True)
    _preview_single_dark(template).save(OUT_PREVIEW_DARK, optimize=True)
    print('OK', OUT, template.size)


if __name__ == '__main__':
    main()
