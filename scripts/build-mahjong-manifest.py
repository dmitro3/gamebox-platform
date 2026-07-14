#!/usr/bin/env python3
"""正版 live-layout-dump → games-assets/mahjong/assets/layout.json（唯一布局源）。"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DUMP = Path(__file__).resolve().parent / "live-layout-dump.json"
OUT = ROOT / "games-assets/mahjong/assets/layout.json"

# 底栏按钮（有 dump 子节点坐标时自动挂上，src 来自 pg manifest）
CONTROLS = [
    ("spin_button_controller/turbo_button_sensor", "btn-turbo-bg", "/images/games/mahjong/pg/ui/btn-turbo-bg.png"),
    ("spin_button_controller/auto_button_sensor", "btn-auto", "/images/games/mahjong/pg/ui/btn-auto.png"),
    ("spin_button_controller/minus_button_sensor", "btn-minus", "/images/games/mahjong/pg/ui/btn-minus.png"),
    ("spin_button_controller/plus_button_sensor", "btn-plus", "/images/games/mahjong/pg/ui/btn-plus.png"),
    ("setting_menu/menu_button_sensor", "icon-menu", "/images/games/mahjong/pg/ui/icon-menu.png"),
]

# 图层顺序（底→顶）与素材路径（相对站点根 /images/...）
LAYERS = [
    ("reel_a", "reel-frame", "/images/games/mahjong/pg/ui/reel-frame.png"),
    ("main_bottom_a", "bottom-wood", "/images/games/mahjong/pg/ui/bottom-wood.png"),
    ("main_top_b", "multiplier-bar", "/images/games/mahjong/pg/ui/multiplier-bar-bg.png"),
    ("1024ways", "title-1024", "/images/games/mahjong/pg/ui/top-title-1024.png"),
    ("spin_base", "spin-frame", "/images/games/mahjong/pg/ui/btn-spin-frame.png"),
    ("content", "message-ribbon", "/images/games/mahjong/pg/ui/message-ribbon.png"),
]

MULT_KEYS = ["mult-x1", "mult-x2", "mult-x3", "mult-x5"]


def main() -> None:
    dump = json.loads(DUMP.read_text(encoding="utf-8"))
    nodes = dump["nodes"]
    dw, dh = dump["design"]

    layers = []
    for node_key, layer_id, src in LAYERS:
        box = nodes.get(node_key)
        if not box:
            continue
        layers.append({
            "id": layer_id,
            "node": node_key,
            "src": src,
            "box": box,
        })

    reels = []
    for i in range(1, 6):
        key = f"dark_reel_{i}"
        if key in nodes:
            reels.append({"col": i - 1, "node": key, "box": nodes[key]})

    payload = {
        "source": dump.get("source", "live-cocos-runtime"),
        "page": dump.get("page", ""),
        "design": [dw, dh],
        "layers": layers,
        "reels": reels,
        "hud": nodes.get("wallet_button_sensor"),
        "spinController": nodes.get("spin_button_controller"),
        "controls": [
            {"id": cid, "node": key, "src": src, "box": nodes[key]}
            for key, cid, src in CONTROLS
            if key in nodes
        ],
        "multSprites": [
            {"key": k, "src": f"/images/games/mahjong/pg/ui/{k}.png"} for k in MULT_KEYS
        ],
        "multBar": nodes.get("main_top_b"),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"OK layers={len(layers)} reels={len(reels)} controls={len(payload['controls'])} -> {OUT}")


if __name__ == "__main__":
    main()
