#!/usr/bin/env python3
"""验证并修复分层 UI 裁切：按 import 文件绑定的 native 大图精确裁切。"""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from PIL import Image

from pg_atlas_utils import AtlasResolver, crop, parse_sprite_frames, texture_uuids

ROOT = Path(__file__).resolve().parent
SCRAPE = ROOT / "麻将胡了"
PG_UI = ROOT.parent / "client-app/public/images/games/mahjong/pg/ui"
MANIFEST = ROOT.parent / "client-app/public/images/games/mahjong/pg/manifest.json"

# import 文件 → sprite名 → 输出文件名
LAYER_FIXES: dict[str, dict[str, str]] = {
    "import__0d_0db702c18.4cf1c.json": {
        "reel_a": "reel-frame",
        "main_bottom_a": "bottom-wood",
        "reel_glow": "reel-glow",
    },
    "import__0b_0b0136117.63230.json": {
        "main_top_b": "multiplier-bar-bg",
        "bonus_top_b": "multiplier-bar-bg-free",
        "x1": "mult-x1",
        "x2": "mult-x2",
        "x3": "mult-x3",
        "x4": "mult-x4",
        "x5": "mult-x5",
        "x6": "mult-x6",
        "x10": "mult-x10",
    },
    "import__0e_0e310ade2.a8257.json": {
        "main_top_a": "wood-top-panel",
    },
}


def extract_from_import_file(imp_path: Path, names: set[str]) -> dict[str, Image.Image]:
    text = imp_path.read_text(encoding="utf-8", errors="ignore")
    frames = {f["name"]: f for f in parse_sprite_frames(text) if f["name"] in names}
    if not frames:
        return {}

    uuids = texture_uuids(text)
    resolver = AtlasResolver(SCRAPE)
    out: dict[str, Image.Image] = {}

    for name, frame in frames.items():
        tex_idx = min(frame.get("texture_index", 0), max(len(uuids) - 1, 0))
        uuid = uuids[tex_idx] if uuids else None
        if not uuid:
            continue
        native = resolver.native_for_uuid(uuid, [frame])
        if not native:
            print(f"  ! 无 native: {name} uuid={uuid}")
            continue
        with Image.open(native) as atlas:
            atlas = atlas.convert("RGBA")
            out[name] = crop(atlas, frame)
    return out


def is_bad_layer(key: str, img: Image.Image) -> bool:
    """启发式：明显裁错（全绿毡、黑底金币条）。"""
    w, h = img.size
    px = img.convert("RGBA").resize((min(64, w), min(64, h))).getdata()
    greens = coins = dark = 0
    for r, g, b, a in px:
        if a < 20:
            dark += 1
        elif g > r + 30 and g > b + 30:
            greens += 1
        elif r > 180 and g > 140 and b < 80:
            coins += 1
    n = len(px)
    if key == "reel-frame" and greens / n > 0.55:
        return True
    if key == "bottom-wood" and coins / n > 0.08 and dark / n > 0.35:
        return True
    return False


def main() -> None:
    PG_UI.mkdir(parents=True, exist_ok=True)
    fixed = 0
    for imp_name, mapping in LAYER_FIXES.items():
        imp = SCRAPE / imp_name
        if not imp.is_file():
            print(f"skip missing {imp_name}")
            continue
        sprites = extract_from_import_file(imp, set(mapping.keys()))
        for sprite_name, out_key in mapping.items():
            img = sprites.get(sprite_name)
            if not img:
                print(f"  ! 未裁到 {sprite_name}")
                continue
            dest = PG_UI / f"{out_key}.png"
            img.save(dest)
            bad = is_bad_layer(out_key, img)
            print(f"  {'WARN' if bad else 'OK'} {out_key} <- {sprite_name} {img.size}")
            if not bad:
                fixed += 1

    # 背景：正版竖向红橙渐变（images__65 封面图裁切或 CSS）
    cover_candidates = list(SCRAPE.glob("images__*65*.jpg")) + list(SCRAPE.glob("images__65_*.jpg"))
    if cover_candidates:
        cover = max(cover_candidates, key=lambda p: p.stat().st_size)
        with Image.open(cover) as im:
            im = im.convert("RGB")
            # 取全图作为背景参考（1080 宽等比）
            tw = 1080
            th = int(im.height * tw / im.width)
            bg = im.resize((tw, th), Image.Resampling.LANCZOS)
            bg.save(PG_UI / "bg-main.jpg", quality=92)
            print(f"  OK bg-main.jpg <- {cover.name} {bg.size}")

    if MANIFEST.is_file():
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        ui = data.setdefault("ui", {})
        for png in PG_UI.glob("*"):
            if png.suffix.lower() in {".png", ".jpg", ".webp"} and not png.stem.startswith("_"):
                ui[png.stem] = f"pg/ui/{png.name}"
        MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"\n完成，写入 {PG_UI}")


if __name__ == "__main__":
    main()
