#!/usr/bin/env python3
"""将 lingguang 定稿素材合并进 pg/ui 并更新 manifest（爬取缺失层补齐）。"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LG = ROOT / "client-app/public/images/games/mahjong/lingguang"
PG_UI = ROOT / "client-app/public/images/games/mahjong/pg/ui"
MANIFEST = ROOT / "client-app/public/images/games/mahjong/pg/manifest.json"

# lingguang 相对路径 -> manifest ui key
LINGGUANG_MAP: dict[str, str] = {
    "bg-base.png": "bg-base",
    "bg-base-free.png": "bg-base-free",
    "multiplier-bar-bg.png": "multiplier-bar-bg",
    "multiplier-bar-bg-free.png": "multiplier-bar-bg-free",
    "multiplier-values.png": "multiplier-values",
    "multiplier-values-active.png": "multiplier-values-active",
    "multiplier-values-free.png": "multiplier-values-free",
    "multiplier-values-free-active.png": "multiplier-values-free-active",
    "wood-top-panel.png": "wood-top-panel",
    "bottom-frame-bar.png": "bottom-frame-bar",
    "bottom-control-bg.png": "bottom-control-bg",
    "message-ribbon.png": "message-ribbon",
    "top-title-1024.png": "top-title-1024",
    "fs-trigger-panel-bg.png": "fs-trigger-panel-bg",
    "fs-end-panel-bg.png": "fs-end-panel-bg",
    "buttons/btn-minus.png": "btn-minus",
    "buttons/btn-plus.png": "btn-plus",
    "buttons/btn-auto.png": "btn-auto",
    "buttons/btn-turbo.png": "btn-turbo",
    "buttons/btn-turbo-off.png": "btn-turbo-off",
    "buttons/btn-exit.png": "btn-exit",
    "buttons/btn-sound-on.png": "btn-sound-on",
    "buttons/btn-sound-off.png": "btn-sound-off",
    "buttons/btn-paytable.png": "btn-paytable",
    "buttons/btn-rules.png": "btn-rules",
    "buttons/btn-history.png": "btn-history",
    "buttons/btn-back.png": "btn-back",
    "buttons/btn-frame.png": "btn-frame",
    "buttons/btn-spin-frame.png": "btn-spin-frame",
    "buttons/btn-spin-arrows.png": "btn-spin-arrows",
    "icons/icon-menu.png": "icon-menu",
    "icons/icon-wallet.png": "icon-wallet",
    "icons/icon-bet.png": "icon-bet",
    "icons/icon-win.png": "icon-win",
    "icons/hud-panel-bg.png": "hud-panel-bg",
    "overlays/big-win-bw.png": "big-win-bw",
    "overlays/big-win-mw.png": "big-win-mw",
    "overlays/big-win-smw.png": "big-win-smw",
}


def main() -> None:
    PG_UI.mkdir(parents=True, exist_ok=True)
    manifest: dict = {"symbols": {}, "symbols_golden": {}, "ui": {}}
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    merged = 0
    for rel, key in LINGGUANG_MAP.items():
        src = LG / rel
        if not src.exists():
            continue
        dest_name = f"{key}.png"
        shutil.copy2(src, PG_UI / dest_name)
        manifest.setdefault("ui", {})[key] = f"pg/ui/{dest_name}"
        merged += 1

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"lingguang 合并: {merged} 项 -> manifest 共 {len(manifest.get('ui', {}))} UI")


if __name__ == "__main__":
    main()
