#!/usr/bin/env python3
"""从赏金船长 (PG game 54) 爬取资源裁切图集并部署到 client-app。"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from PIL import Image

from pg_atlas_utils import AtlasResolver

ROOT = Path(__file__).resolve().parent
DEFAULT_SCRAPE = ROOT / "赏金船长"
PG = ROOT.parent / "client-app/public/images/games/captain/pg"
PUBLIC = ROOT.parent / "client-app/public/images/games/captain"

SCRAPE: Path = DEFAULT_SCRAPE

SYMBOL_ALIAS = {
    "h_pirate": "pirate",
    "h_bottle": "bottle",
    "h_compass": "compass",
    "h_hook": "hook",
    "l_a": "a",
    "l_k": "k",
    "l_q": "q",
    "l_j": "j",
    "s_wild": "wild",
    "s_scatter": "scatter",
}

UI_SPRITE_MAP: dict[str, str] = {
    "btn_turbo_bg": "btn-turbo-bg",
    "center_turbo_off": "btn-turbo",
    "center_turbo_on": "btn-turbo-on",
    "ic_exit": "btn-exit",
    "ic_soundon": "btn-sound-on",
    "ic_soundoff": "btn-sound-off",
    "ic_paytable": "btn-paytable",
    "ic_rule": "btn-rules",
    "ic_hist": "btn-history",
    "ic_close": "btn-back",
    "btn_menu": "icon-menu",
    "ic_win": "icon-win",
    "ic_wallet_new": "icon-wallet",
    "ic_chip": "icon-bet",
    "start": "btn-start",
    "start_pressed": "btn-start-pressed",
    "free_spins_won": "fs-trigger-title",
    "bonus_loading_text": "fs-trigger-subtitle",
    "collect": "fs-end-collect",
    "total_win": "fs-end-title",
    "bw": "big-win-bw",
    "mw": "big-win-mw",
    "smw": "big-win-smw",
}

SETTING_MENU_IMPORT = "import__08_081c330e2.31869.json"
GENERAL_UI_IMPORT = "import__0c_0c5f57782.10a7e.json"
BONUS_UI_IMPORT = "import__0b_0b4a9a14d.654ee.json"
INFO_UI_IMPORT = "import__0a_0a1d233e0.02b60.json"

RESOLVER: AtlasResolver | None = None


def save_symbol(img: Image.Image, alias: str, manifest: dict) -> None:
    out = img.convert("RGBA")
    (PG / "symbols").mkdir(parents=True, exist_ok=True)
    out.save(PG / "symbols" / f"{alias}.png")
    out.save(PG / "ui" / f"symbol-{alias}.png")
    manifest["symbols"][alias] = f"pg/symbols/{alias}.png"


SYMBOL_PACKED_IMPORT = "import__05_0573ce8c3.09b8b.json"


def deploy_symbols(manifest: dict) -> None:
    assert RESOLVER is not None
    imp = SCRAPE / SYMBOL_PACKED_IMPORT
    if not imp.is_file():
        raise SystemExit(f"缺少 {SYMBOL_PACKED_IMPORT}")
    sprites = RESOLVER.extract_from_import(imp, set(SYMBOL_ALIAS.keys()))
    for pg_name, alias in SYMBOL_ALIAS.items():
        img = sprites.get(pg_name)
        if not img:
            print(f"  [symbol] 未找到: {pg_name}")
            continue
        save_symbol(img, alias, manifest)
        print(f"  [symbol] {alias} <- {pg_name}")

    j_imp = SCRAPE / "import__06_06702c3e4.8bb28.json"
    if j_imp.is_file():
        j_sprites = RESOLVER.extract_from_import(j_imp, {"l_j"})
        if j_sprites.get("l_j"):
            save_symbol(j_sprites["l_j"], "j", manifest)
            print("  [symbol] j <- l_j")


def deploy_ui_from_import(imp_name: str, mapping: dict[str, str], manifest: dict) -> None:
    assert RESOLVER is not None
    imp = SCRAPE / imp_name
    if not imp.is_file():
        print(f"  [ui] 跳过缺失: {imp_name}")
        return
    sprites = RESOLVER.extract_from_import(imp, set(mapping.keys()))
    for sprite_name, key in mapping.items():
        img = sprites.get(sprite_name)
        if not img:
            continue
        dest = PG / "ui" / f"{key}.png"
        img.save(dest)
        manifest["ui"][key] = f"pg/ui/{key}.png"
        print(f"  [ui] {key} <- {sprite_name}")


def deploy_covers(manifest: dict) -> None:
    covers = list(SCRAPE.glob("images__54_*.jpg")) + list(SCRAPE.glob("images__54_*.png"))
    if not covers:
        return
    cover = max(covers, key=lambda p: p.stat().st_size)
    dest = PUBLIC / "captain-cover-custom.jpg"
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(cover, dest)
    manifest["ui"]["cover-bg"] = "../captain-cover-custom.jpg"
    manifest["ui"]["cover"] = "../captain-cover-custom.jpg"
    manifest["ui"]["cover-bottom-bg"] = "../captain-cover-custom.jpg"
    print(f"  [cover] {dest.name} <- {cover.name}")

    icon_candidates = [p for p in covers if p.stat().st_size < 200_000]
    if icon_candidates:
        icon_src = max(icon_candidates, key=lambda p: p.stat().st_size)
        icon_dest = ROOT.parent / "client-app/public/images/games/captain.webp"
        shutil.copy2(icon_src, icon_dest)
        manifest["ui"]["lobby-icon"] = "../captain.webp"


def deploy_backgrounds(manifest: dict) -> None:
    natives = [
        ("native__77_7763a988-9ee9-4784-8b59-86e736eb5e51.3ea15.png", "bg-base"),
        ("native__15_1527d231-0048-446f-889a-91c6ab80803e.7ed66.png", "splash-paytable-bg"),
        ("native__28_28c1a3e2-f28d-4c81-8f77-97e349e7c6bd.8b153.png", "reel-frame"),
    ]
    for fname, key in natives:
        src = SCRAPE / fname
        if not src.is_file():
            continue
        dest = PG / "ui" / f"{key}.png" if fname.endswith(".png") else PG / "ui" / f"{key}.jpg"
        if fname.endswith(".png"):
            dest = PG / "ui" / f"{key}.png"
        else:
            dest = PG / "ui" / f"{key}.jpg"
        shutil.copy2(src, dest)
        manifest["ui"][key] = f"pg/ui/{dest.name}"
        print(f"  [bg] {key} <- {fname}")


def deploy_audio(manifest: dict) -> None:
    audio_out = ROOT.parent / "client-app/public/audio/captain"
    audio_out.mkdir(parents=True, exist_ok=True)
    mapping = {
        "native__82_820e82e0-7363-4e99-b302-93fd0217ab0e.c097a.mp3": "sfx-game.mp3",
        "native__40_40823840-36cc-4f98-836a-f6603d73414d.a2f6c.mp3": "bgm-main.mp3",
        "native__f8_f82afdef-ff32-4b9c-85af-02ab46ac6ff9.1dbc5.mp3": "bgm-bonus.mp3",
    }
    audio_manifest: dict[str, str] = {}
    for src_name, out_name in mapping.items():
        src = SCRAPE / src_name
        if not src.is_file():
            continue
        dest = audio_out / out_name
        shutil.copy2(src, dest)
        audio_manifest[out_name.replace(".mp3", "")] = f"/audio/captain/{out_name}"
        print(f"  [audio] {out_name}")
    manifest["audio"] = audio_manifest


def main() -> None:
    global SCRAPE, RESOLVER
    parser = argparse.ArgumentParser()
    parser.add_argument("--scrape-dir", default=str(DEFAULT_SCRAPE))
    args = parser.parse_args()
    SCRAPE = Path(args.scrape_dir)
    if not SCRAPE.exists():
        raise SystemExit(f"找不到: {SCRAPE}")

    PG.mkdir(parents=True, exist_ok=True)
    (PG / "ui").mkdir(parents=True, exist_ok=True)
    (PG / "symbols").mkdir(parents=True, exist_ok=True)

    RESOLVER = AtlasResolver(SCRAPE)
    manifest: dict = {"source": str(SCRAPE), "symbols": {}, "ui": {}}

    deploy_symbols(manifest)
    deploy_ui_from_import(SETTING_MENU_IMPORT, UI_SPRITE_MAP, manifest)
    deploy_ui_from_import(BONUS_UI_IMPORT, UI_SPRITE_MAP, manifest)
    deploy_ui_from_import(INFO_UI_IMPORT, UI_SPRITE_MAP, manifest)
    deploy_ui_from_import(GENERAL_UI_IMPORT, UI_SPRITE_MAP, manifest)
    deploy_covers(manifest)
    deploy_backgrounds(manifest)
    deploy_audio(manifest)

    # 补全底栏（755 图集 + ui_footer + 旋转钮）
    import fix_captain_bottom_ui as bottom_ui  # noqa: WPS433

    bottom_ui.SCRAPE = SCRAPE
    bottom_ui.extract_755_from_captain(manifest)
    bottom_ui.    extract_ui_footer(manifest)
    # copy_mahjong_spin_assets 已禁用：各游戏素材必须独立

    (PG / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"manifest -> {PG / 'manifest.json'}")


if __name__ == "__main__":
    main()
