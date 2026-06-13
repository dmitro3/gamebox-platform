# -*- coding: utf-8
"""炮管与女王 GIF · 消除循环停顿（往返播放 + 过渡帧 + 均匀帧间隔）"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageSequence

SRC = Path(r'C:\Users\pc\Desktop\炮管与女王人物优化.gif')
OUT = Path(r'C:\Users\pc\Desktop\炮管与女王人物优化-smooth.gif')
BACKUP = Path(r'C:\Users\pc\Desktop\炮管与女王人物优化-backup.gif')

FRAME_MS = 65
CROSSFADE_STEPS = 3  # 首尾衔接过渡帧数


def load_frames(path: Path) -> list[Image.Image]:
    im = Image.open(path)
    return [f.convert('RGBA') for f in ImageSequence.Iterator(im)]


def blend(a: np.ndarray, b: np.ndarray, t: float) -> Image.Image:
    t = max(0.0, min(1.0, t))
    out = (a.astype(np.float32) * (1 - t) + b.astype(np.float32) * t).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def build_pingpong(frames: list[Image.Image]) -> list[Image.Image]:
    """0→14→13→…→1，避免 14→0 大跳变"""
    if len(frames) < 2:
        return frames
    fwd = list(frames)
    rev = list(reversed(frames[1:-1]))  # 不含重复首尾
    return fwd + rev


def insert_loop_crossfade(seq: list[Image.Image], steps: int) -> list[Image.Image]:
    """在序列首尾之间插入渐变帧，进一步抹平循环缝"""
    if len(seq) < 2 or steps <= 0:
        return seq
    a = np.array(seq[-1])
    b = np.array(seq[0])
    bridge = [blend(a, b, (i + 1) / (steps + 1)) for i in range(steps)]
    return seq + bridge


def save_gif(frames: list[Image.Image], path: Path, duration: int):
    rgb = [f.convert('P', palette=Image.ADAPTIVE, colors=256) for f in frames]
    rgb[0].save(
        path,
        save_all=True,
        append_images=rgb[1:],
        duration=duration,
        loop=0,
        disposal=2,
        optimize=True,
    )


def main():
    if not SRC.exists():
        raise FileNotFoundError(SRC)

    frames = load_frames(SRC)
    print('source frames:', len(frames))

    seq = build_pingpong(frames)
    seq = insert_loop_crossfade(seq, CROSSFADE_STEPS)
    print('output frames:', len(seq), 'duration_ms:', FRAME_MS)

    if not BACKUP.exists():
        BACKUP.write_bytes(SRC.read_bytes())
        print('backup ->', BACKUP)

    save_gif(seq, OUT, FRAME_MS)
    print('OK ->', OUT, OUT.stat().st_size)


if __name__ == '__main__':
    main()
