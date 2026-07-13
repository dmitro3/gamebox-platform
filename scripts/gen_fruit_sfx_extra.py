# -*- coding: utf-8 -*-
"""Extra short SFX: special award fanfare for 开火车 / 大三元 etc."""
from pathlib import Path
import math
import subprocess
import wave
import numpy as np

SR = 44100
OUT = Path(r"C:\Users\pc\Desktop\gamebox-platform\client-app\public\audio\slots")


def tone(freq, dur, vol=0.3, kind="square"):
    n = int(dur * SR)
    t = np.arange(n) / SR
    if kind == "square":
        sig = np.tanh(np.sign(np.sin(2 * math.pi * freq * t)) * 2)
    else:
        sig = np.sin(2 * math.pi * freq * t)
    env = np.ones(n)
    a, r = int(0.01 * SR), int(0.06 * SR)
    env[:a] = np.linspace(0, 1, a)
    env[-r:] = np.linspace(1, 0, r)
    return sig * env * vol


def mix(parts, gap=0.04):
    out = []
    for i, p in enumerate(parts):
        out.append(p)
        if i < len(parts) - 1:
            out.append(np.zeros(int(gap * SR)))
    return np.concatenate(out)


def write_mp3(name, audio):
    audio = np.clip(audio, -1, 1)
    wav = OUT / f"_{name}.wav"
    mp3 = OUT / f"{name}.mp3"
    pcm = (audio * 32767).astype(np.int16)
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-codec:a", "libmp3lame", "-qscale:a", "4", str(mp3)],
        check=True,
    )
    wav.unlink()
    print(name, round(len(audio) / SR, 3), "s")


# 特殊大奖提示（开火车/三元等）
write_mp3(
    "sfx-special",
    mix(
        [
            tone(523, 0.08),
            tone(659, 0.08),
            tone(784, 0.08),
            tone(1046, 0.18, vol=0.34),
        ],
        0.03,
    ),
)

# 开火车节拍（连续亮灯）
write_mp3("sfx-train-step", tone(880, 0.055, vol=0.28))
