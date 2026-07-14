#!/usr/bin/env python3
"""从 pg/sprites 复制正版分层 UI 到 pg/ui，并刷新 manifest。"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PG_UI = ROOT / "client-app/public/images/games/mahjong/pg/ui"
SPRITES = ROOT / "client-app/public/images/games/mahjong/pg/sprites"
MANIFEST = ROOT / "client-app/public/images/games/mahjong/pg/manifest.json"

LAYER_COPIES: list[tuple[str, str, str]] = [
    ("atlas_0e_0e310ade2.a8257/main_top_a.png", "wood-top-panel.png", "wood-top-panel"),
    ("atlas_0b_0b0136117.63230/main_top_b.png", "multiplier-bar-bg.png", "multiplier-bar-bg"),
    ("atlas_0b_0b0136117.63230/bonus_top_b.png", "multiplier-bar-bg-free.png", "multiplier-bar-bg-free"),
    ("atlas_0d_0db702c18.4cf1c/main_bottom_a.png", "bottom-wood.png", "bottom-wood"),
    ("atlas_0d_0db702c18.4cf1c/reel_a.png", "reel-frame.png", "reel-frame"),
    ("atlas_0b_0b0136117.63230/x1.png", "mult-x1.png", "mult-x1"),
    ("atlas_0b_0b0136117.63230/x2.png", "mult-x2.png", "mult-x2"),
    ("atlas_0b_0b0136117.63230/x3.png", "mult-x3.png", "mult-x3"),
    ("atlas_0b_0b0136117.63230/x5.png", "mult-x5.png", "mult-x5"),
    ("atlas_0b_0b0136117.63230/x4.png", "mult-x4.png", "mult-x4"),
    ("atlas_0b_0b0136117.63230/x6.png", "mult-x6.png", "mult-x6"),
    ("atlas_0b_0b0136117.63230/x10.png", "mult-x10.png", "mult-x10"),
]


def main() -> None:
    PG_UI.mkdir(parents=True, exist_ok=True)
    copied = 0
    for rel, dest_name, _key in LAYER_COPIES:
        src = SPRITES / rel
        if not src.is_file():
            print(f"  skip (missing): {rel}")
            continue
        shutil.copy2(src, PG_UI / dest_name)
        copied += 1
        print(f"  {dest_name}")

    if MANIFEST.is_file():
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    else:
        data = {"source": "scripts/麻将胡了", "symbols": {}, "symbols_golden": {}}

    ui: dict[str, str] = {}
    for png in sorted(PG_UI.glob("*.png")):
        if png.stem.startswith("_"):
            continue
        ui[png.stem] = f"pg/ui/{png.name}"

    data["ui"] = ui
    data["sprites_source"] = "scripts/麻将胡了 layered + deploy"
    MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nmanifest.ui: {len(ui)} 项（复制分层 {copied}）")


if __name__ == "__main__":
    main()
