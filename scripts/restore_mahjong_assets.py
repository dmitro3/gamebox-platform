#!/usr/bin/env python3
"""恢复 deploy 误删/遗漏的麻将素材。"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MAHJONG = ROOT.parent / "client-app/public/images/games/mahjong"
SCRAPE = ROOT / "麻将胡了"
PG = MAHJONG / "pg"
PG_UI = PG / "ui"
PG_SYMBOLS = PG / "symbols"
PG_SYMBOLS_GOLD = PG / "symbols-golden"
CLASSIC_SYMBOLS = MAHJONG / "classic/symbols"
CLASSIC_GOLD = MAHJONG / "classic/symbols-golden"
MANIFEST = PG / "manifest.json"

sys.path.insert(0, str(ROOT))
from pg_atlas_utils import AtlasResolver  # noqa: E402


def copy_tree(src: Path, dest: Path) -> int:
    if not src.is_dir():
        return 0
    dest.mkdir(parents=True, exist_ok=True)
    n = 0
    for png in src.glob("*.png"):
        target = dest / png.name
        if not target.is_file() or target.stat().st_size != png.stat().st_size:
            shutil.copy2(png, target)
            n += 1
    return n


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.is_file() else {
        "symbols": {},
        "symbols_golden": {},
        "ui": {},
    }
    manifest.setdefault("symbols", {})
    manifest.setdefault("symbols_golden", {})
    manifest.setdefault("ui", {})

    copied = copy_tree(CLASSIC_SYMBOLS, PG_SYMBOLS)
    copied += copy_tree(CLASSIC_GOLD, PG_SYMBOLS_GOLD)
    print(f"copied {copied} symbol png -> pg/symbols*")

    for alias in ("fa", "zhong", "bai", "8w", "5t", "5s", "2t", "2s", "wild", "hu"):
        src = PG_SYMBOLS / f"{alias}.png"
        if src.is_file():
            manifest["symbols"][alias] = f"pg/symbols/{alias}.png"
        gsrc = PG_SYMBOLS_GOLD / f"{alias}.png"
        if gsrc.is_file():
            manifest["symbols_golden"][alias] = f"pg/symbols-golden/{alias}.png"

    resolver = AtlasResolver(SCRAPE)
    for sprite, fname in (
        ("symbol_base_white", "symbol_base_white.png"),
        ("symbol_base_gold", "symbol_base_gold.png"),
    ):
        img = resolver.extract_sprite(sprite)
        if img:
            for folder in (CLASSIC_SYMBOLS, PG_SYMBOLS):
                folder.mkdir(parents=True, exist_ok=True)
                img.save(folder / fname)
            print(f"saved {fname}")

    # 恢复 cover
    covers = list(SCRAPE.glob("images__*65*.jpg")) + list(SCRAPE.glob("images__65_*.jpg"))
    if covers:
        cover_src = max(covers, key=lambda p: p.stat().st_size)
        cover_dest = MAHJONG / "mahjong-cover-custom.jpg"
        shutil.copy2(cover_src, cover_dest)
        manifest["ui"]["cover"] = "mahjong-cover-custom.jpg"
        manifest["ui"]["cover-bg"] = "mahjong-cover-custom.jpg"
        print(f"restored cover -> mahjong/{cover_dest.name}")

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"symbols={len(manifest['symbols'])} golden={len(manifest['symbols_golden'])} ui={len(manifest['ui'])}")


if __name__ == "__main__":
    main()
