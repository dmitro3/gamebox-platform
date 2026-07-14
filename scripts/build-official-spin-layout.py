#!/usr/bin/env python3
"""
正版中间旋转钮：pg-cocos-dump.json normal_spin_holder 子节点 worldPct。
设计稿 1080×1920，与底栏圆钮 83.9% 同系；仅输出 spin 相关坐标，不碰其他图层。
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
PG = Path(__file__).parent / "pg-cocos-dump.json"
LIVE = Path(__file__).parent / "live-layout-dump.json"
OUT = ROOT / "client-app/src/games/mahjong/pgSpinLayout.json"


def find_world_pct(obj, name: str, depth: int = 0) -> dict | None:
    if depth > 40:
        return None
    if isinstance(obj, dict):
        if obj.get("name") == name and "worldPct" in obj:
            return obj["worldPct"]
        for v in obj.values():
            hit = find_world_pct(v, name, depth + 1)
            if hit:
                return hit
    elif isinstance(obj, list):
        for v in obj:
            hit = find_world_pct(v, name, depth + 1)
            if hit:
                return hit
    return None


def rel_in_holder(child: dict, holder: dict) -> dict:
    return {
        "leftPct": round((child["leftPct"] - holder["leftPct"]) / holder["widthPct"] * 100, 3),
        "topPct": round((child["topPct"] - holder["topPct"]) / holder["heightPct"] * 100, 3),
        "widthPct": round(child["widthPct"] / holder["widthPct"] * 100, 3),
        "heightPct": round(child["heightPct"] / holder["heightPct"] * 100, 3),
    }


def pct_box(b: dict) -> dict:
    return {
        "leftPct": b["leftPct"],
        "topPct": b["topPct"],
        "widthPct": b["widthPct"],
        "heightPct": b["heightPct"],
    }


def main() -> None:
    pg = json.loads(PG.read_text(encoding="utf-8"))
    live = json.loads(LIVE.read_text(encoding="utf-8")) if LIVE.is_file() else {}

    holder = find_world_pct(pg, "normal_spin_holder")
    count_holder = find_world_pct(pg, "auto_spin_holder")
    if not holder or not count_holder:
        raise SystemExit("pg-cocos-dump 缺少 normal_spin_holder / auto_spin_holder")

    spin_base = find_world_pct(pg, "spin_base")
    arrow = find_world_pct(pg, "button")  # sprite: arrow
    auto_btn = find_world_pct(pg, "auto_button")
    number_display = find_world_pct(pg, "number_display")
    digit_container = find_world_pct(pg, "container")  # first under number_display

    payload = {
        "source": "pg-cocos-dump normal_spin_holder + auto_spin_holder",
        "design": [1080, 1920],
        "liveDesign": live.get("design") or [1080, 2340],
        "liveSpinBase": live.get("nodes", {}).get("spin_base"),
        "holder": pct_box(holder),
        "countHolder": pct_box(count_holder),
        "hit": pct_box(spin_base or holder),
        "disc": {**rel_in_holder(spin_base or holder, holder), "anchorY": 0.6},
        "arrow": rel_in_holder(arrow, holder) if arrow else {},
        "countDisc": rel_in_holder(auto_btn or count_holder, count_holder),
        "countDigits": rel_in_holder(number_display, count_holder) if number_display else {},
        "digitContainer": rel_in_holder(digit_container, count_holder) if digit_container else {},
        "sprites": {
            "spin_base": {"size": [186, 195], "scale": 1.5, "anchor": [0.5, 0.6]},
            "arrow": {"size": [118, 116], "scale": 1.5, "anchor": [0.5, 0.5]},
            "auto_spin": {"size": [186, 195], "scale": 1.5, "anchor": [0.5, 0.5]},
        },
    }

    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"OK holder top={holder['topPct']} h={holder['heightPct']}")
    print(f"   countHolder top={count_holder['topPct']}")
    if arrow:
        print(f"   arrow in_holder top={payload['arrow']['topPct']}% h={payload['arrow']['heightPct']}%")
    print(f"-> {OUT}")


if __name__ == "__main__":
    main()
