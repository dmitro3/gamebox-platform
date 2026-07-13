# -*- coding: utf-8 -*-
"""Generate short arcade-style electronic SFX for fruit machine (slots)."""
from __future__ import annotations

import math
import struct
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 44100
OUT_DIR = Path(r"C:\Users\pc\Desktop\gamebox-platform\client-app\public\audio\slots")
TMP_DIR = OUT_DIR / "_tmp_wav"


def env_adsr(
    n: int,
    attack: float = 0.005,
    decay: float = 0.05,
    sustain: float = 0.5,
    release: float = 0.05,
) -> np.ndarray:
    a = max(1, int(attack * SR))
    d = max(1, int(decay * SR))
    r = max(1, int(release * SR))
    s = max(0, n - a - d - r)
    parts = [
        np.linspace(0.0, 1.0, a, endpoint=False),
        np.linspace(1.0, sustain, d, endpoint=False),
        np.full(s, sustain, dtype=np.float64),
        np.linspace(sustain, 0.0, r, endpoint=True),
    ]
    e = np.concatenate(parts)
    if len(e) < n:
        e = np.pad(e, (0, n - len(e)))
    return e[:n]


def tone(
    freq: float,
    dur: float,
    *,
    wave_type: str = "square",
    vol: float = 0.35,
    attack: float = 0.004,
    decay: float = 0.03,
    sustain: float = 0.55,
    release: float = 0.04,
) -> np.ndarray:
    n = max(1, int(dur * SR))
    t = np.arange(n, dtype=np.float64) / SR
    if wave_type == "square":
        sig = np.sign(np.sin(2 * math.pi * freq * t))
        # soft clip edges a bit
        sig = np.tanh(sig * 2.2)
    elif wave_type == "triangle":
        sig = 2 * np.abs(2 * ((t * freq) % 1) - 1) - 1
    elif wave_type == "saw":
        sig = 2 * ((t * freq) % 1) - 1
    else:  # sine
        sig = np.sin(2 * math.pi * freq * t)
    sig *= env_adsr(n, attack, decay, sustain, release) * vol
    return sig


def sweep(
    f0: float,
    f1: float,
    dur: float,
    *,
    wave_type: str = "square",
    vol: float = 0.35,
    **env,
) -> np.ndarray:
    n = max(1, int(dur * SR))
    t = np.arange(n, dtype=np.float64) / SR
    # instantaneous phase from linear freq sweep
    freqs = np.linspace(f0, f1, n)
    phase = 2 * math.pi * np.cumsum(freqs) / SR
    if wave_type == "square":
        sig = np.tanh(np.sign(np.sin(phase)) * 2.2)
    elif wave_type == "triangle":
        # approximate via sine harmonics-ish: use phase mod
        sig = 2 * np.abs(2 * ((phase / (2 * math.pi)) % 1) - 1) - 1
    else:
        sig = np.sin(phase)
    sig *= env_adsr(n, **env) * vol
    return sig


def noise_burst(dur: float, vol: float = 0.2, filter_alpha: float = 0.2) -> np.ndarray:
    n = max(1, int(dur * SR))
    rng = np.random.default_rng(7)
    x = rng.uniform(-1, 1, n)
    # simple one-pole lowpass
    y = np.zeros(n)
    for i in range(1, n):
        y[i] = y[i - 1] + filter_alpha * (x[i] - y[i - 1])
    y *= env_adsr(n, 0.001, 0.02, 0.35, 0.06) * vol
    return y


def mix(*parts: np.ndarray, gaps: list[float] | None = None) -> np.ndarray:
    if not parts:
        return np.zeros(1)
    if gaps is None:
        gaps = [0.0] * (len(parts) - 1)
    out = parts[0]
    for g, p in zip(gaps, parts[1:]):
        pad = np.zeros(int(g * SR))
        out = np.concatenate([out, pad, p])
    return out


def overlay(*layers: np.ndarray) -> np.ndarray:
    n = max(len(x) for x in layers)
    out = np.zeros(n)
    for x in layers:
        out[: len(x)] += x
    peak = np.max(np.abs(out)) or 1.0
    if peak > 0.95:
        out *= 0.95 / peak
    return out


def write_wav(path: Path, mono: np.ndarray) -> None:
    mono = np.clip(mono, -1.0, 1.0)
    pcm = (mono * 32767.0).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def wav_to_mp3(wav: Path, mp3: Path) -> None:
    mp3.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(wav),
            "-codec:a",
            "libmp3lame",
            "-qscale:a",
            "4",
            str(mp3),
        ],
        check=True,
    )


def build_all() -> dict[str, np.ndarray]:
    sounds: dict[str, np.ndarray] = {}

    # 跑灯每格「嗒」
    sounds["sfx-tick"] = tone(1480, 0.045, wave_type="square", vol=0.28, attack=0.001, decay=0.02, sustain=0.25, release=0.02)

    # 停格刹住
    sounds["sfx-stop"] = overlay(
        sweep(520, 180, 0.12, wave_type="square", vol=0.4, attack=0.002, decay=0.05, sustain=0.35, release=0.06),
        noise_burst(0.08, vol=0.12, filter_alpha=0.35),
    )

    # 落空
    sounds["sfx-lose"] = mix(
        tone(360, 0.12, wave_type="square", vol=0.3, sustain=0.4, release=0.05),
        tone(240, 0.18, wave_type="square", vol=0.28, sustain=0.3, release=0.08),
        gaps=[0.04],
    )

    # 大 / 小 按键
    sounds["sfx-big"] = tone(880, 0.08, wave_type="square", vol=0.32, attack=0.002, decay=0.03, sustain=0.45, release=0.03)
    sounds["sfx-small"] = tone(554, 0.08, wave_type="square", vol=0.32, attack=0.002, decay=0.03, sustain=0.45, release=0.03)

    # 大小猜中 / 猜错
    sounds["sfx-gamble-win"] = mix(
        tone(660, 0.07, wave_type="square", vol=0.3),
        tone(880, 0.07, wave_type="square", vol=0.3),
        tone(1175, 0.12, wave_type="square", vol=0.32, sustain=0.5, release=0.06),
        gaps=[0.03, 0.03],
    )
    sounds["sfx-gamble-lose"] = mix(
        tone(500, 0.09, wave_type="square", vol=0.28),
        tone(300, 0.16, wave_type="square", vol=0.26, sustain=0.3, release=0.08),
        gaps=[0.05],
    )

    # 退币
    coin = []
    for i, f in enumerate([1200, 1350, 1500, 1650, 1800]):
        coin.append(tone(f, 0.045, wave_type="triangle", vol=0.22 - i * 0.015, attack=0.001, decay=0.02, sustain=0.3, release=0.02))
    sounds["sfx-cashout"] = mix(*coin, gaps=[0.025] * 4)

    # 倍数切换
    sounds["sfx-mult"] = mix(
        tone(740, 0.04, wave_type="square", vol=0.26, attack=0.001, decay=0.015, sustain=0.35, release=0.02),
        tone(988, 0.055, wave_type="square", vol=0.28, attack=0.001, decay=0.02, sustain=0.4, release=0.025),
        gaps=[0.02],
    )

    # 通用 / 押分按键
    sounds["sfx-click"] = tone(1250, 0.035, wave_type="square", vol=0.24, attack=0.001, decay=0.015, sustain=0.2, release=0.015)
    sounds["sfx-bet"] = tone(980, 0.05, wave_type="square", vol=0.28, attack=0.001, decay=0.02, sustain=0.3, release=0.02)

    # 短循环待机 BGM（约 4 秒，可 loop）
    # 简单 8-bit 琶音 + 低音
    bpm = 110
    beat = 60.0 / bpm
    melody_notes = [
        (392, 0.5), (494, 0.5), (587, 0.5), (494, 0.5),
        (440, 0.5), (523, 0.5), (659, 0.5), (523, 0.5),
        (392, 0.5), (494, 0.5), (587, 0.75), (0, 0.25),
        (349, 0.5), (440, 0.5), (523, 0.75), (0, 0.25),
    ]
    bass_notes = [
        (98, 1.0), (110, 1.0), (98, 1.0), (87, 1.0),
    ]
    mel = []
    for f, beats in melody_notes:
        dur = beats * beat
        if f <= 0:
            mel.append(np.zeros(int(dur * SR)))
        else:
            mel.append(tone(f, dur * 0.92, wave_type="square", vol=0.14, attack=0.004, decay=0.04, sustain=0.45, release=0.05))
            # pad rest of beat
            rest = max(0, int(dur * SR) - len(mel[-1]))
            if rest:
                mel[-1] = np.concatenate([mel[-1], np.zeros(rest)])
    melody = np.concatenate(mel) if mel else np.zeros(1)

    bass_parts = []
    for f, beats in bass_notes:
        dur = beats * beat
        bass_parts.append(tone(f, dur * 0.95, wave_type="triangle", vol=0.16, attack=0.01, decay=0.08, sustain=0.55, release=0.08))
        rest = max(0, int(dur * SR) - len(bass_parts[-1]))
        if rest:
            bass_parts[-1] = np.concatenate([bass_parts[-1], np.zeros(rest)])
    bass = np.concatenate(bass_parts)

    # soft hat on eighths
    hats = []
    total_beats = 8.0
    step = beat / 2
    n_steps = int(total_beats / 0.5)
    for i in range(n_steps):
        h = noise_burst(0.03, vol=0.05 if i % 2 == 0 else 0.03, filter_alpha=0.55)
        pad_before = np.zeros(int(i * step * SR))
        layer = np.concatenate([pad_before, h])
        hats.append(layer)
    hat = overlay(*hats) if hats else np.zeros(1)

    n = max(len(melody), len(bass), len(hat))
    bgm = np.zeros(n)
    bgm[: len(melody)] += melody
    bgm[: len(bass)] += bass
    bgm[: len(hat)] += hat
    # fade edges slightly for cleaner loop
    fade = int(0.02 * SR)
    bgm[:fade] *= np.linspace(0, 1, fade)
    bgm[-fade:] *= np.linspace(1, 0, fade)
    peak = np.max(np.abs(bgm)) or 1.0
    bgm *= 0.85 / peak
    sounds["bgm-idle"] = bgm

    return sounds


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    sounds = build_all()
    for name, audio in sounds.items():
        wav = TMP_DIR / f"{name}.wav"
        mp3 = OUT_DIR / f"{name}.mp3"
        write_wav(wav, audio)
        wav_to_mp3(wav, mp3)
        dur = len(audio) / SR
        print(f"ok {mp3.name}  {dur:.3f}s  {mp3.stat().st_size} bytes")

    # cleanup wavs
    for p in TMP_DIR.glob("*.wav"):
        p.unlink()
    TMP_DIR.rmdir()
    print("done ->", OUT_DIR)


if __name__ == "__main__":
    main()
