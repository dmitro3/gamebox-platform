# -*- coding: utf-8 -*-
"""
赏金女王顶栏动图 · 光流位移（非溶解、非整图波纹）
- 以 top-header.png 为唯一底图
- AI 关键帧仅提供「往哪推像素」的光流向量
- 帧间插值 flow，不对 RGB 做 cross-fade
- 炮管/船舵以下像素与底图完全一致
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'top-header.png'
AI_DIR = ROOT / 'assets' / 'ai-sources' / 'header-wind'
OUT_GAME = ROOT / 'assets' / 'top-header.gif'
OUT_DESKTOP = Path(r'C:\Users\pc\Desktop\炮管与女王人物优化.gif')

SPLIT_RATIO = 0.56
HAIR_RATIO = 0.22       # 纯动区上沿（发顶）
FADE_RATIO = 0.52       # 动区渐隐下沿（颌/肩以上）
FLOW_GAIN = 2.4         # 放大 AI 发梢位移
TWEENS = 4              # 关键帧间插值步数
FRAME_MS = 70
GIF_WIDTH = 720

# 风动关键帧 → 往返
WIND_KEYS = ['f01', 'f03', 'f05', 'f07', 'f05', 'f03', 'f01']


def load_rgb(path: Path) -> np.ndarray:
    return np.array(Image.open(path).convert('RGB'))


def build_motion_mask(h: int, w: int) -> np.ndarray:
    """只在头发/帽羽/旗面区域允许位移，其余锚死"""
    mask = np.zeros((h, w), np.float32)
    y_top = int(h * HAIR_RATIO)
    y_fade = int(h * FADE_RATIO)

    for y in range(h):
        if y < y_top:
            row = 1.0
        elif y < y_fade:
            row = 1.0 - (y - y_top) / max(y_fade - y_top, 1)
        else:
            row = 0.0
        # 人物在中部；左右留空
        for x in range(w):
            nx = x / max(w - 1, 1)
            if nx < 0.08 or nx > 0.96:
                sx = 0.0
            elif nx < 0.18:
                sx = (nx - 0.08) / 0.10
            elif nx > 0.88:
                sx = (0.96 - nx) / 0.08
            else:
                sx = 1.0
            mask[y, x] = row * sx

    # 左侧旗面单独开一条动效带
    flag_x1, flag_x2 = int(w * 0.02), int(w * 0.22)
    flag_y1, flag_y2 = int(h * 0.08), int(h * 0.42)
    mask[flag_y1:flag_y2, flag_x1:flag_x2] = np.maximum(
        mask[flag_y1:flag_y2, flag_x1:flag_x2], 0.55
    )

    return cv2.GaussianBlur(mask, (0, 0), sigmaX=6, sigmaY=10)


def flow_to_key(master_bgr: np.ndarray, key_bgr: np.ndarray, mask: np.ndarray) -> np.ndarray:
    g0 = cv2.cvtColor(master_bgr, cv2.COLOR_BGR2GRAY)
    g1 = cv2.cvtColor(key_bgr, cv2.COLOR_BGR2GRAY)
    flow = cv2.calcOpticalFlowFarneback(
        g0, g1, None,
        pyr_scale=0.5, levels=4, winsize=21,
        iterations=5, poly_n=7, poly_sigma=1.5, flags=0,
    )
    flow *= mask[..., None] * FLOW_GAIN
    return flow.astype(np.float32)


def warp_with_flow(master_bgr: np.ndarray, flow: np.ndarray, split_y: int) -> np.ndarray:
    h, w = master_bgr.shape[:2]
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    out = cv2.remap(
        master_bgr,
        gx + flow[..., 0],
        gy + flow[..., 1],
        interpolation=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REFLECT101,
    )
    out[split_y:] = master_bgr[split_y:]
    return out


def lerp_flow(a: np.ndarray, b: np.ndarray, t: float) -> np.ndarray:
    return a * (1.0 - t) + b * t


def build_flow_sequence(master: np.ndarray, mask: np.ndarray) -> list[np.ndarray]:
    h, w = master.shape[:2]
    master_bgr = cv2.cvtColor(master, cv2.COLOR_RGB2BGR)

    key_imgs = {}
    key_flows = {}
    for name in sorted(set(WIND_KEYS)):
        path = AI_DIR / f'qn-wind-{name}.png'
        if not path.exists():
            raise FileNotFoundError(path)
        key_bgr = cv2.cvtColor(
            cv2.resize(load_rgb(path), (w, h), interpolation=cv2.INTER_LANCZOS4),
            cv2.COLOR_RGB2BGR,
        )
        key_imgs[name] = key_bgr
        key_flows[name] = flow_to_key(master_bgr, key_bgr, mask)

    seq: list[np.ndarray] = []

    for i in range(len(WIND_KEYS) - 1):
        fa = key_flows[WIND_KEYS[i]]
        fb = key_flows[WIND_KEYS[i + 1]]
        seq.append(fa)
        for step in range(1, TWEENS + 1):
            t = step / (TWEENS + 1)
            seq.append(lerp_flow(fa, fb, t))
    seq.append(key_flows[WIND_KEYS[-1]])
    return seq


def flows_to_frames(master: np.ndarray, flows: list[np.ndarray], split_y: int) -> list[Image.Image]:
    master_bgr = cv2.cvtColor(master, cv2.COLOR_RGB2BGR)
    out: list[Image.Image] = []
    for flow in flows:
        warped = warp_with_flow(master_bgr, flow, split_y)
        out.append(Image.fromarray(cv2.cvtColor(warped, cv2.COLOR_BGR2RGB)))
    return out


def lock_static_bottom(frames: list[Image.Image], split_y: int) -> list[Image.Image]:
    ref = np.array(frames[0].convert('RGB'))
    bot = ref[split_y:].copy()
    locked = []
    for f in frames:
        arr = np.array(f.convert('RGB'))
        arr[split_y:] = bot
        locked.append(Image.fromarray(arr))
    return locked


def resize_frames(frames: list[Image.Image], width: int) -> list[Image.Image]:
    w0, h0 = frames[0].size
    h1 = int(h0 * width / w0)
    return [f.resize((width, h1), Image.Resampling.LANCZOS) for f in frames]


def save_gif(frames: list[Image.Image], path: Path, split_y: int):
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = [f.convert('RGB') for f in frames]
    ref_q = rgb[0].quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    ref_px = ref_q.load()
    w, h = ref_q.size
    pals = []
    for f in rgb:
        q = f.quantize(palette=ref_q, dither=Image.Dither.NONE)
        px = q.load()
        for y in range(split_y, h):
            for x in range(w):
                px[x, y] = ref_px[x, y]
        pals.append(q)
    pals[0].save(
        path,
        save_all=True,
        append_images=pals[1:],
        duration=FRAME_MS,
        loop=0,
        disposal=2,
        optimize=True,
    )


def main():
    if not SRC.exists():
        raise FileNotFoundError(SRC)
    master = load_rgb(SRC)
    h, w = master.shape[:2]
    split_y = int(h * SPLIT_RATIO)
    mask = build_motion_mask(h, w)

    flows = build_flow_sequence(master, mask)
    frames = flows_to_frames(master, flows, split_y)
    frames = lock_static_bottom(frames, split_y)
    print('flow keyframes', len(WIND_KEYS), 'output frames', len(frames))

    game = resize_frames(frames, GIF_WIDTH)
    gy = int(game[0].size[1] * SPLIT_RATIO)
    game = lock_static_bottom(game, gy)
    save_gif(game, OUT_GAME, gy)

    desk = [f.resize((400, 711), Image.Resampling.LANCZOS) for f in resize_frames(frames, 400)]
    dy = int(711 * SPLIT_RATIO)
    desk = lock_static_bottom(desk, dy)
    save_gif(desk, OUT_DESKTOP, dy)

    print('OK', len(frames), 'x', FRAME_MS, 'ms')
    print(' game ->', OUT_GAME, round(OUT_GAME.stat().st_size / 1024 / 1024, 2), 'MB')
    print(' desk ->', OUT_DESKTOP, round(OUT_DESKTOP.stat().st_size / 1024 / 1024, 2), 'MB')


if __name__ == '__main__':
    main()
