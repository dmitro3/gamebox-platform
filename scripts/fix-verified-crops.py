#!/usr/bin/env python3
"""用已验证的 native 大图精确裁切主界面分层素材。"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

from pg_atlas_utils import crop, parse_sprite_frames

ROOT = Path(__file__).resolve().parent
SCRAPE = ROOT / "麻将胡了"
PG_UI = ROOT.parent / "client-app/public/images/games/mahjong/pg/ui"
MANIFEST = ROOT.parent / "client-app/public/images/games/mahjong/pg/manifest.json"

# 手工验证过的 native 大图（避免 AtlasResolver 误匹配）
NATIVE = {
    "ui_main": SCRAPE / "native__67_6737e5a0-4b0b-4887-8c8b-de2915097fa8.f1b49.png",
    "reel_green": SCRAPE / "native__02_02186b2c-cd37-4300-9a31-0688800f79dc.8ee8b.jpg",
}

# import → [(sprite, out_name)]
JOBS: dict[str, list[tuple[str, str]]] = {
    "import__0d_0db702c18.4cf1c.json": [
        ("reel_a", "reel-green"),
        ("main_bottom_a", "bottom-wood"),
    ],
    "import__0b_0b0136117.63230.json": [
        ("main_top_b", "top-bar-orange"),
        ("main_top_c", "multiplier-bar-bg"),
        ("bonus_top_b", "multiplier-bar-bg-free"),
    ],
    "import__0e_0e310ade2.a8257.json": [
        ("main_top_a", "top-coins-bar"),
    ],
}


def crop_sprite(native: Path, imp_name: str, sprite: str) -> Image.Image | None:
    text = (SCRAPE / imp_name).read_text(encoding="utf-8")
    frames = {f["name"]: f for f in parse_sprite_frames(text)}
    frame = frames.get(sprite)
    if not frame:
        return None
    with Image.open(native) as atlas:
        return crop(atlas.convert("RGBA"), frame)


def main() -> None:
    PG_UI.mkdir(parents=True, exist_ok=True)

    reel = crop_sprite(NATIVE["reel_green"], "import__0d_0db702c18.4cf1c.json", "reel_a")
    bottom = crop_sprite(NATIVE["ui_main"], "import__0d_0db702c18.4cf1c.json", "main_bottom_a")
    mult = crop_sprite(NATIVE["ui_main"], "import__0b_0b0136117.63230.json", "main_top_c")
    top_orange = crop_sprite(NATIVE["ui_main"], "import__0b_0b0136117.63230.json", "main_top_b")

    writes = {
        "reel-green.png": reel,
        "bottom-wood.png": bottom,
        "multiplier-bar-bg.png": mult,
        "multiplier-bar-bg-free.png": crop_sprite(NATIVE["ui_main"], "import__0b_0b0136117.63230.json", "bonus_top_b"),
        "top-bar-orange.png": top_orange,
        "mult-bar-frame.png": mult,
    }
    for name, img in writes.items():
        if img is None:
            print("SKIP", name)
            continue
        img.save(PG_UI / name)
        print("OK", name, img.size)

    # 兼容旧 key
    if reel:
        reel.save(PG_UI / "reel-frame.png")

    if MANIFEST.is_file():
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        ui = data.setdefault("ui", {})
        for p in PG_UI.iterdir():
            if p.suffix.lower() == ".png" and not p.stem.startswith("_"):
                ui[p.stem] = f"pg/ui/{p.name}"
        MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
