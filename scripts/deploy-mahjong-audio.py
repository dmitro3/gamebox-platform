#!/usr/bin/env python3
"""复制麻将胡了 PG 音效精灵到 client-app/public/audio/mahjong/"""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRAPE = next(
    d for d in (ROOT / "scripts").iterdir()
    if d.is_dir() and (d / "pg-assets-manifest.json").exists()
)
DST = ROOT / "client-app/public/audio/mahjong"

PAIRS = [
    ("native__67_671c5bc3-bbee-4aa1-b8dc-d32047af93f1.6dc1c.mp3", "general-audio.mp3"),
    ("native__35_35f37ba4-b805-4315-b9cd-37491e61ee25.54563.mp3", "vox.mp3"),
    ("native__70_707e06bc-e0fd-413c-8403-7ea54c9d9252.930a4.mp3", "main-bgm.mp3"),
    ("native__b8_b83a99d7-a5a6-4774-8747-9679a8750e7a.55d20.mp3", "free-spin-bgm.mp3"),
]


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)
    for src_name, dst_name in PAIRS:
        src = SCRAPE / src_name
        if not src.exists():
            raise SystemExit(f"missing: {src}")
        dst = DST / dst_name
        shutil.copy2(src, dst)
        print(f"copied {dst_name} ({dst.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
