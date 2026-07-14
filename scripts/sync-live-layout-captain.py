#!/usr/bin/env python3
"""正版运行时 dump → captain/cocosLayout.json（保留已有 L，写入 liveNodes 参考）。"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
DUMP_DEFAULT = Path(__file__).parent / "live-layout-dump-captain.json"
OUT = ROOT / "client-app/src/games/captain/cocosLayout.json"

MAP = {
    "ui_reel_frame": "reelFrame",
    "ui_reel_back_normal": "playReels",
    "ui_footer": "bottomFooter",
    "background_controller": "bgImage",
    "info_board_message": "message",
    "content": "message",
    "spin_button_controller": "spinFrame",
    "spin_button_controller/spin_button": "spinButton",
    "spin_base": "spinFrame",
    "setting_menu": "btnBar",
    "setting_menu/black_tint_background": "btnBarDark",
    "wallet_button_sensor/menus_layer_holder": "menusLayer",
    "GameInfo": "gameInfo",
    "wallet_button_sensor": "walletTouch",
}


def pct_box(b: dict) -> dict:
    return {
        "topPct": b["topPct"],
        "heightPct": b["heightPct"],
        "leftPct": b["leftPct"],
        "widthPct": b["widthPct"],
    }


def build_live_mapped(nodes: dict) -> dict[str, dict]:
    mapped: dict[str, dict] = {}
    for src, dst in MAP.items():
        if src in nodes:
            mapped[dst] = pct_box(nodes[src])
    if mapped.get("btnBarDark"):
        mapped["btnBar"] = mapped["btnBarDark"]
    elif mapped.get("menusLayer"):
        mapped["btnBar"] = mapped["menusLayer"]
    if mapped.get("btnBar"):
        mapped["btnBar"]["leftPct"] = 0.0
        mapped["btnBar"]["widthPct"] = 100.0
    if mapped.get("spinButton"):
        mapped["spinFrame"] = mapped["spinButton"]
    msg, bar, footer = mapped.get("message"), mapped.get("btnBar"), mapped.get("bottomFooter")
    if msg and bar and footer:
        mapped["statusHud"] = {
            "topPct": round(msg["topPct"] + msg["heightPct"], 3),
            "heightPct": round(max(bar["topPct"] - (msg["topPct"] + msg["heightPct"]), 2.0), 3),
            "leftPct": footer["leftPct"],
            "widthPct": footer["widthPct"],
        }
    return mapped


def main() -> None:
    dump_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DUMP_DEFAULT
    dump = json.loads(dump_path.read_text(encoding="utf-8"))
    if dump.get("error"):
        raise SystemExit(dump["error"])

    nodes: dict = dump["nodes"]
    design = dump.get("design") or [1080, 2340]
    live_mapped = build_live_mapped(nodes)

    existing: dict = {}
    if OUT.is_file():
        existing = json.loads(OUT.read_text(encoding="utf-8"))

    # 用 live 坐标覆盖 L / playReels / btnBar 等（比 prefab 推算更准）
    L = dict(existing.get("L") or {})
    for key, box in live_mapped.items():
        if key in (
            "reelFrame",
            "bottomFooter",
            "message",
            "gameInfo",
            "statusHud",
            "playReels",
            "bgImage",
        ):
            L[key] = box

    payload = {
        **existing,
        "source": existing.get("source") or f"live-cocos-runtime ({dump.get('page', dump_path.name)})",
        "liveDesign": design,
        "L": L,
        "spinFrame": live_mapped.get("spinFrame") or existing.get("spinFrame") or {},
        "btnBar": live_mapped.get("btnBar") or existing.get("btnBar") or {},
        "playReels": live_mapped.get("playReels") or existing.get("playReels") or {},
        "liveNodes": nodes,
        "liveMapped": live_mapped,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"OK liveDesign={design[0]}x{design[1]} liveNodes={len(nodes)}")
    for key in ("playReels", "bottomFooter", "btnBar", "statusHud"):
        box = L.get(key) or live_mapped.get(key) or {}
        if box:
            print(f"  {key:14s} t={box['topPct']:6.2f} h={box['heightPct']:5.2f}")
    print(f"-> {OUT}")


if __name__ == "__main__":
    main()
