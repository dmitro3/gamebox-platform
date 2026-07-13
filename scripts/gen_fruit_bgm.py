# -*- coding: utf-8 -*-
"""老式水果柜机待机 BGM：快节奏方波循环，偏 90 年代玛丽机感觉。"""
from pathlib import Path
import math
import subprocess
import wave
import numpy as np

SR = 44100
OUT = Path(r"C:\Users\pc\Desktop\gamebox-platform\client-app\public\audio\slots\bgm-idle.mp3")
TMP = Path(r"C:\Users\pc\Desktop\gamebox-platform\client-app\public\audio\slots\_bgm.wav")


def sq(freq, dur, vol=0.2):
    n = max(1, int(dur * SR))
    t = np.arange(n) / SR
    sig = np.sign(np.sin(2 * math.pi * freq * t + 1e-9))
    sig = np.tanh(sig * 1.8)
    # 极短 attack/release，像柜机喇叭
    a = min(int(0.004 * SR), n // 4)
    r = min(int(0.02 * SR), n // 3)
    env = np.ones(n)
    if a > 0:
        env[:a] = np.linspace(0, 1, a)
    if r > 0:
        env[-r:] *= np.linspace(1, 0, r)
    return sig * env * vol


def tri(freq, dur, vol=0.15):
    n = max(1, int(dur * SR))
    t = np.arange(n) / SR
    sig = 2 * np.abs(2 * ((t * freq) % 1) - 1) - 1
    a = min(int(0.008 * SR), n // 4)
    env = np.ones(n)
    if a > 0:
        env[:a] = np.linspace(0, 1, a)
    env[-a:] *= np.linspace(1, 0, max(a, 1)) if a else 1
    return sig * env * vol


def noise_hat(dur, vol=0.04):
    n = max(1, int(dur * SR))
    rng = np.random.default_rng(42)
    x = rng.uniform(-1, 1, n)
    # 高通一点
    y = np.diff(x, prepend=0)
    env = np.linspace(1, 0, n) ** 2
    return y * env * vol


bpm = 132
beat = 60.0 / bpm
# 两小节循环（约 3.6s）
# 旋律：经典柜机上行琶音感
melody = [
    # bar1
    (523, 0.25), (659, 0.25), (784, 0.25), (1046, 0.25),
    (784, 0.25), (659, 0.25), (523, 0.25), (392, 0.25),
    # bar2
    (440, 0.25), (554, 0.25), (659, 0.25), (880, 0.25),
    (659, 0.25), (554, 0.25), (440, 0.25), (330, 0.25),
    # bar3
    (349, 0.25), (440, 0.25), (523, 0.25), (698, 0.25),
    (523, 0.25), (440, 0.25), (349, 0.25), (262, 0.25),
    # bar4
    (392, 0.25), (494, 0.25), (587, 0.25), (784, 0.25),
    (587, 0.5), (0, 0.5),
]

bass = [
    (131, 0.5), (131, 0.5), (147, 0.5), (147, 0.5),
    (110, 0.5), (110, 0.5), (98, 0.5), (98, 0.5),
    (87, 0.5), (87, 0.5), (98, 0.5), (98, 0.5),
    (110, 0.5), (110, 0.5), (131, 1.0),
]


def render_seq(notes, kind="sq", vol=0.18):
    parts = []
    for f, beats in notes:
        dur = beats * beat
        n = int(dur * SR)
        if f <= 0:
            parts.append(np.zeros(n))
            continue
        tone_dur = dur * 0.88
        if kind == "sq":
            tone = sq(f, tone_dur, vol=vol)
        else:
            tone = tri(f, tone_dur, vol=vol)
        pad = n - len(tone)
        if pad > 0:
            tone = np.concatenate([tone, np.zeros(pad)])
        parts.append(tone[:n])
    return np.concatenate(parts)


lead = render_seq(melody, "sq", 0.16)
bass_l = render_seq(bass, "tri", 0.2)

# 加一点点八度高音装饰
sparkle_notes = [
    (1046, 0.125), (0, 0.375), (1175, 0.125), (0, 0.375),
    (1319, 0.125), (0, 0.375), (1046, 0.125), (0, 0.375),
] * 4
spark = render_seq(sparkle_notes, "sq", 0.07)

# 军鼓式噪声踩点（每拍）
total_len = max(len(lead), len(bass_l), len(spark))
hats = np.zeros(total_len)
step = int(beat * SR)
for i in range(0, total_len, step):
    h = noise_hat(0.04, vol=0.035 if (i // step) % 2 == 0 else 0.02)
    end = min(i + len(h), total_len)
    hats[i:end] += h[: end - i]

n = total_len
mix = np.zeros(n)
mix[: len(lead)] += lead
mix[: len(bass_l)] += bass_l
mix[: len(spark)] += spark
mix += hats

# 轻微压缩感
peak = np.max(np.abs(mix)) or 1.0
mix = np.tanh(mix / peak * 1.35) * 0.85

# 循环淡入淡出极短，避免接缝爆音
fade = int(0.015 * SR)
mix[:fade] *= np.linspace(0, 1, fade)
mix[-fade:] *= np.linspace(1, 0, fade)

pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open(str(TMP), "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

subprocess.run(
    ["ffmpeg", "-y", "-loglevel", "error", "-i", str(TMP), "-codec:a", "libmp3lame", "-qscale:a", "3", str(OUT)],
    check=True,
)
TMP.unlink()
print("bgm", round(len(mix) / SR, 2), "s", OUT.stat().st_size)
