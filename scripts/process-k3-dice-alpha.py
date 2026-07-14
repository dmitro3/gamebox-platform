"""快三骰子 PNG · 边缘泛洪去底 + 最大连通域，不修改骰面 RGB"""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "games-assets" / "kuai3" / "assets" / "result"
SRC = Path(r"C:\Users\pc\.cursor\projects\c-Users-pc-Desktop-gamebox-platform\assets")


def is_bg_pixel(r: int, g: int, b: int) -> bool:
    r, g, b = int(r), int(g), int(b)
    if r >= 250 and g >= 250 and b >= 248:
        return True
    neutral = max(abs(r - g), abs(g - b), abs(r - b))
    lum = (r + g + b) / 3
    if neutral <= 8 and 198 <= lum <= 252:
        return True
    if g > r + 14 and g > b + 8 and g > 55 and r < 200:
        return True
    return False


def flood_bg(rgb: np.ndarray) -> np.ndarray:
    h, w = rgb.shape[:2]
    bg = np.zeros((h, w), dtype=bool)
    seen = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def seed(x: int, y: int) -> None:
        if is_bg_pixel(*rgb[y, x]):
            seen[y, x] = True
            q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while q:
        x, y = q.popleft()
        bg[y, x] = True
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny, nx] and is_bg_pixel(*rgb[ny, nx]):
                seen[ny, nx] = True
                q.append((nx, ny))
    return bg


def keep_largest_cc(fg: np.ndarray) -> np.ndarray:
    h, w = fg.shape
    labels = np.zeros((h, w), dtype=np.int32)
    best_id = 0
    best_size = 0
    cur = 0

    for sy in range(h):
        for sx in range(w):
            if not fg[sy, sx] or labels[sy, sx]:
                continue
            cur += 1
            n = 0
            q: deque[tuple[int, int]] = deque([(sx, sy)])
            labels[sy, sx] = cur
            while q:
                x, y = q.popleft()
                n += 1
                for nx, ny in ((x + 1, y), (x -  1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and fg[ny, nx] and labels[ny, nx] == 0:
                        labels[ny, nx] = cur
                        q.append((nx, ny))
            if n > best_size:
                best_size = n
                best_id = cur

    return labels == best_id


def strip_bg_fringe(data: np.ndarray) -> np.ndarray:
    """去掉仍贴在骰子外缘的灰格像素（仅改 alpha）。"""
    rgb = data[:, :, :3]
    alpha = data[:, :, 3]
    fg = alpha > 0
    h, w = fg.shape
    out = alpha.copy()

    for y in range(h):
        for x in range(w):
            if not fg[y, x]:
                continue
            r, g, b = rgb[y, x]
            if not is_bg_pixel(int(r), int(g), int(b)):
                continue
            touch = False
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and not fg[ny, nx]:
                    touch = True
                    break
            if touch:
                out[y, x] = 0
    return out


def crop_pad(data: np.ndarray, pad: int = 10) -> np.ndarray:
    alpha = data[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if len(ys) == 0:
        return data
    y0 = max(0, ys.min() - pad)
    y1 = min(data.shape[0], ys.max() + pad + 1)
    x0 = max(0, xs.min() - pad)
    x1 = min(data.shape[1], xs.max() + pad + 1)
    return data[y0:y1, x0:x1]


def resize_rgba(data: np.ndarray, max_side: int = 512) -> np.ndarray:
    h, w = data.shape[:2]
    scale = max_side / max(h, w)
    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))

    rgb = data[:, :, :3].astype(np.float32)
    a = data[:, :, 3].astype(np.float32) / 255.0
    premul = np.dstack([
        np.clip(np.round(rgb[:, :, 0] * a), 0, 255),
        np.clip(np.round(rgb[:, :, 1] * a), 0, 255),
        np.clip(np.round(rgb[:, :, 2] * a), 0, 255),
        np.clip(np.round(a * 255), 0, 255),
    ]).astype(np.uint8)

    out = np.array(Image.fromarray(premul, mode="RGBA").resize((nw, nh), Image.Resampling.LANCZOS))
    a2 = out[:, :, 3].astype(np.float32) / 255.0
    safe = np.maximum(a2, 1e-6)
    rgb2 = np.zeros_like(out[:, :, :3], dtype=np.float32)
    for c in range(3):
        rgb2[:, :, c] = np.clip(out[:, :, c] / safe, 0, 255)
    rgb2[out[:, :, 3] == 0] = 0
    out[:, :, :3] = rgb2.astype(np.uint8)
    return out


def feather_alpha(data: np.ndarray, radius: float = 0.35) -> np.ndarray:
    hard = data[:, :, 3].copy()
    soft = np.array(
        Image.fromarray(hard, mode="L").filter(ImageFilter.GaussianBlur(radius=radius)),
        dtype=np.uint8,
    )
    soft[hard == 0] = 0
    soft[(hard == 255) & (soft > 200)] = 255
    data[:, :, 3] = soft
    return data


def process(path: Path) -> None:
    data = np.array(Image.open(path).convert("RGBA"))
    rgb = data[:, :, :3]
    bg = flood_bg(rgb)
    fg = keep_largest_cc(~bg)
    data[:, :, 3] = np.where(fg, 255, 0).astype(np.uint8)
    data[:, :, 3] = strip_bg_fringe(data)
    data[data[:, :, 3] == 0, :3] = 0
    data = crop_pad(data)
    data = resize_rgba(data, 512)
    data = feather_alpha(data)

    Image.fromarray(data).save(path, optimize=True)
    a = data[:, :, 3]
    partial = int(((a > 0) & (a < 255)).sum())
    print(f"{path.name}: {data.shape[1]}x{data.shape[0]} partial={partial} opaque={(a == 255).sum()}")


def main() -> None:
    for i in range(1, 7):
        n = f"{i:02d}"
        for prefix in ("dice", "icon"):
            src = None
            for name in (f"k3-{prefix}-v3-{n}.png", f"k3-{prefix}-v2-{n}.png", f"k3-{prefix}-{n}.png"):
                p = SRC / name
                if p.exists():
                    src = p
                    break
            if src:
                Image.open(src).save(ASSETS / f"{prefix}-{n}.png")
                print(f"copy {src.name} -> {prefix}-{n}.png")

    for name in sorted(ASSETS.glob("dice-*.png")):
        process(name)
    for name in sorted(ASSETS.glob("icon-*.png")):
        process_icon(name)


def process_icon(path: Path) -> None:
    data = np.array(Image.open(path).convert("RGBA"))
    rgb = data[:, :, :3]
    bg = flood_bg(rgb)
    fg = keep_largest_cc(~bg)
    data[:, :, 3] = np.where(fg, 255, 0).astype(np.uint8)
    data[:, :, 3] = strip_bg_fringe(data)
    data[data[:, :, 3] == 0, :3] = 0
    data = crop_pad(data, pad=8)
    data = resize_rgba(data, 256)
    data = feather_alpha(data, radius=0.3)
    Image.fromarray(data).save(path, optimize=True)
    print(f"{path.name}: {data.shape[1]}x{data.shape[0]} (icon)")


if __name__ == "__main__":
    main()
