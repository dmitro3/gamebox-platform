# -*- coding: utf-8 -*-
from pathlib import Path
import math
import subprocess
import wave
import shutil
import numpy as np

SR = 44100
OUT = Path(r"C:\Users\pc\Desktop\gamebox-platform\client-app\public\audio\slots")
FF = r"C:\Users\pc\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"


def tone(freq, dur, vol=0.3, kind="square"):
    n = max(1, int(dur * SR))
    t = np.arange(n) / SR
    if kind == "square":
        sig = np.tanh(np.sign(np.sin(2 * math.pi * freq * t)) * 2.5)
    else:
        sig = np.sin(2 * math.pi * freq * t)
    env = np.ones(n)
    a = min(max(1, int(0.008 * SR)), n // 3 or 1)
    r = min(max(1, int(0.05 * SR)), n // 3 or 1)
    env[:a] = np.linspace(0, 1, a)
    if r < n:
        env[-r:] = np.linspace(1, 0, r)
    return (sig * env * vol).astype(np.float64)


def noise(dur, vol=0.15):
    n = int(dur * SR)
    sig = np.random.uniform(-1, 1, n)
    env = np.linspace(1, 0, n) ** 1.5
    return sig * env * vol


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
        [FF, "-y", "-loglevel", "error", "-i", str(wav), "-codec:a", "libmp3lame", "-qscale:a", "3", str(mp3)],
        check=True,
    )
    wav.unlink(missing_ok=True)
    print(name, round(len(audio) / SR, 3), "s", mp3.stat().st_size)


parts = []
for f, d, v in [
    (392, 0.09, 0.28),
    (523, 0.09, 0.3),
    (659, 0.09, 0.32),
    (784, 0.1, 0.34),
    (1046, 0.12, 0.36),
    (1318, 0.22, 0.4),
]:
    parts.append(tone(f, d, v))
    parts.append(np.zeros(int(0.02 * SR)))
impact = tone(180, 0.18, 0.35, "sine") + tone(360, 0.18, 0.22) + noise(0.18, 0.22)
parts.append(impact)
tail_n = int(0.55 * SR)
t = np.arange(tail_n) / SR
shimmer = (
    np.sin(2 * math.pi * 1046 * t) * 0.12
    + np.sin(2 * math.pi * 1318 * t) * 0.1
    + np.sin(2 * math.pi * 1568 * t) * 0.08
) * (np.linspace(1, 0, tail_n) ** 1.2)
parts.append(shimmer)
write_mp3("sfx-jackpot", np.concatenate(parts))

write_mp3(
    "sfx-wild",
    np.concatenate(
        [
            tone(1480, 0.04, 0.22),
            np.zeros(int(0.01 * SR)),
            tone(1200, 0.035, 0.18),
        ]
    ),
)

parts2 = []
for f in [523, 659, 784, 1046, 784, 1046, 1318]:
    parts2.append(tone(f, 0.11, 0.33))
    parts2.append(np.zeros(int(0.025 * SR)))
parts2.append(tone(1568, 0.35, 0.38))
write_mp3("sfx-bar-win", np.concatenate(parts2))

src = Path(r"C:\Users\pc\Desktop\gamebox-platform\scripts\_fru2_probe\sounds\++.mp3")
if src.exists() and src.stat().st_size > 500:
    shutil.copy(src, OUT / "sfx-score-up.mp3")
    print("sfx-score-up copied", (OUT / "sfx-score-up.mp3").stat().st_size)
