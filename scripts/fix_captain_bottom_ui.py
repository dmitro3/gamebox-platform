#!/usr/bin/env python3
"""补全赏金船长底部栏 UI（共享 PG setting_menu 755 图集 + 麻将同源资源）。"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image

from pg_atlas_utils import AtlasResolver, crop, parse_sprite_frames

ROOT = Path(__file__).resolve().parent
SCRAPE = ROOT / "赏金船长"
MAHJONG = ROOT / "麻将胡了"
PG_UI = ROOT.parent / "client-app/public/images/games/captain/pg/ui"
MANIFEST = ROOT.parent / "client-app/public/images/games/captain/pg/manifest.json"
MAHJONG_UI = ROOT.parent / "client-app/public/images/games/mahjong/pg/ui"
ATLAS_UUID = "755QemO8VKoYn/j8Mchu8M"
NATIVE_75 = SCRAPE / "native__75_75e507a6-3bc5-4aa1-89ff-8fc31c86ef0c.f8847.png"

KEY_MAP = {
    "btn_add": "btn-plus",
    "btn_minus": "btn-minus",
    "btn_menu": "btn-menu",
    "center_autoplay": "btn-auto-center",
    "center_turbo_on": "btn-turbo-on",
    "center_turbo_off": "btn-turbo",
    "ic_chip": "icon-bet",
    "ic_wallet_new": "icon-wallet",
    "ic_win": "icon-win",
    "ic_spin": "icon-spin",
    "auto_arrow": "auto-arrow",
    "auto_shadow": "auto-shadow",
    "btn_turbo_bg": "btn-turbo-bg",
    "ic_rule": "btn-rules",
    "ic_paytable": "btn-paytable",
    "ic_hist": "btn-history",
    "ic_close": "btn-back",
    "ic_soundon": "btn-sound-on",
    "turbo_shadow": "turbo-shadow",
}

MAHJONG_RECT_IMPORTS = {
    "btn_add": MAHJONG / "import__f1_f1a769c6-dc02-4449-8a7d-fe71d099236e.d4a7b.json",
    "btn_minus": MAHJONG / "import__b2_b27b4d5a-660b-4efa-8cee-bfb5d5474be0.4482f.json",
    "center_turbo_off": MAHJONG / "import__07_0734a42bd.baf1c.json",
    "center_turbo_on": MAHJONG / "import__07_0734a42bd.baf1c.json",
    "turbo_shadow": MAHJONG / "import__07_0734a42bd.baf1c.json",
}

COPY_FROM_MAHJONG = {}
# 赏金船长必须使用 scripts/赏金船长 爬取包独立裁切，禁止从麻将目录复制。


def save(img: Image.Image, key: str, manifest: dict) -> None:
    PG_UI.mkdir(parents=True, exist_ok=True)
    dest = PG_UI / f"{key}.png"
    img.save(dest)
    manifest.setdefault("ui", {})[key] = f"pg/ui/{key}.png"
    print(f"  {key} ({img.size[0]}x{img.size[1]})")


def extract_755_from_captain(manifest: dict) -> None:
    frames_by_name: dict[str, dict] = {}
    for imp in SCRAPE.glob("import__*.json"):
        text = imp.read_text(encoding="utf-8", errors="ignore")
        if ATLAS_UUID not in text:
            continue
        for f in parse_sprite_frames(text):
            frames_by_name[f["name"]] = f

    if not NATIVE_75.is_file():
        print("  skip 755 atlas: native 75 missing")
        return

    with Image.open(NATIVE_75) as atlas_img:
        atlas = atlas_img.convert("RGBA")
        for sprite, key in KEY_MAP.items():
            f = frames_by_name.get(sprite)
            if not f:
                continue
            save(crop(atlas, f), key, manifest)

    with Image.open(NATIVE_75) as atlas_img:
        atlas = atlas_img.convert("RGBA")
        for sprite, imp in MAHJONG_RECT_IMPORTS.items():
            key = KEY_MAP.get(sprite)
            if not key or key in manifest.get("ui", {}):
                continue
            if not imp.is_file():
                continue
            frames = parse_sprite_frames(imp.read_text(encoding="utf-8"))
            f = next((x for x in frames if x["name"] == sprite), None)
            if not f:
                continue
            save(crop(atlas, f), key, manifest)
            print(f"    (mahjong rect) {sprite}")


def extract_ui_footer(manifest: dict) -> None:
    imp = SCRAPE / "import__0c_0c5f57782.10a7e.json"
    if not imp.is_file():
        return
    resolver = AtlasResolver(SCRAPE)
    sprites = resolver.extract_from_import(imp, {"ui_footer", "bg_window"})
    if sprites.get("ui_footer"):
        save(sprites["ui_footer"], "ui-footer", manifest)
    if sprites.get("bg_window"):
        save(sprites["bg_window"], "bg-window", manifest)


def copy_mahjong_spin_assets(manifest: dict) -> None:
    for fname, key in COPY_FROM_MAHJONG.items():
        src = MAHJONG_UI / fname
        if not src.is_file():
            continue
        dest = PG_UI / fname
        shutil.copy2(src, dest)
        manifest.setdefault("ui", {})[key] = f"pg/ui/{fname}"
        print(f"  copy {key} <- mahjong")


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    extract_755_from_captain(manifest)
    extract_ui_footer(manifest)
    copy_mahjong_spin_assets(manifest)
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"manifest ui keys: {len(manifest.get('ui', {}))}")


if __name__ == "__main__":
    main()
