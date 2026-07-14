#!/usr/bin/env python3
"""
正版底栏坐标：live 运行时 spin_button_controller 为父盒，
pg-cocos-dump 子节点 worldPct 换算相对比例后映射到 live 设计稿。

来源：
  - live-layout-dump.json  design 1080×2340（pgf-nvgais.com 运行时）
  - pg-cocos-dump.json     子节点 worldPct（仅取相对 spin_button_controller 比例）
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
LIVE = Path(__file__).parent / "live-layout-dump.json"
PG = Path(__file__).parent / "pg-cocos-dump.json"
OUT = ROOT / "client-app/src/games/mahjong/pgOfficialBottom.json"

# pg dump 节点名 → 本地 key（worldPct 来自 pg-cocos-dump 静态树）
PG_BTN_NODES: dict[str, str] = {
    "spin_base": "spinDisc",
    "arrow": "spinArrow",
    "auto_spin": "spinCountDisc",
    "number_display": "spinCountDigits",
    # DefaultMenuLayer 圆底 / 图标（chip_sprite 有多个，按父节点区分）
}

# 手动指定 pg dump 中带 sprite 的底栏节点（dump_btn_layout 已核对）
PG_MANUAL: dict[str, dict] = {
    "turboCircle": {"leftPct": 3.889, "topPct": 83.906, "widthPct": 16.667, "heightPct": 9.375},
    "turboIcon": {"leftPct": 8.056, "topPct": 86.25, "widthPct": 8.333, "heightPct": 4.688},
    "minusCircle": {"leftPct": 19.167, "topPct": 83.906, "widthPct": 16.667, "heightPct": 9.375},
    "minusIcon": {"leftPct": 22.5, "topPct": 85.781, "widthPct": 10, "heightPct": 5.625},
    "plusCircle": {"leftPct": 64.167, "topPct": 83.906, "widthPct": 16.667, "heightPct": 9.375},
    "plusIcon": {"leftPct": 67.5, "topPct": 85.781, "widthPct": 10, "heightPct": 5.625},
    "autoCircle": {"leftPct": 79.444, "topPct": 83.906, "widthPct": 16.667, "heightPct": 9.375},
    "autoIcon": {"leftPct": 83.611, "topPct": 86.25, "widthPct": 8.333, "heightPct": 4.688},
    "menuIcon": {"leftPct": 94.151, "topPct": 85.772, "widthPct": 9.662, "heightPct": 5.435},
    "menuCircle": {"leftPct": 93.519, "topPct": 83.906, "widthPct": 16.667, "heightPct": 9.375},
    "menuHit": {"leftPct": 92.11, "topPct": 83.906, "widthPct": 18.076, "heightPct": 9.375},
    "spinDisc": {"leftPct": 37.083, "topPct": 82.969, "widthPct": 25.833, "heightPct": 15.234},
    "spinCountDisc": {"leftPct": 37.083, "topPct": 82.747, "widthPct": 25.833, "heightPct": 15.234},
    "spinArrow": {"leftPct": 40.651, "topPct": 84.079, "widthPct": 18.512, "heightPct": 10.28},
}


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


def rel_in_parent(child: dict, parent: dict) -> dict:
    """子节点 worldPct → 在父盒内的 0~1 相对比例。"""
    return {
        "left": (child["leftPct"] - parent["leftPct"]) / parent["widthPct"],
        "top": (child["topPct"] - parent["topPct"]) / parent["heightPct"],
        "width": child["widthPct"] / parent["widthPct"],
        "height": child["heightPct"] / parent["heightPct"],
    }


def apply_rel(parent: dict, rel: dict) -> dict:
    return {
        "leftPct": round(parent["leftPct"] + rel["left"] * parent["widthPct"], 3),
        "topPct": round(parent["topPct"] + rel["top"] * parent["heightPct"], 3),
        "widthPct": round(rel["width"] * parent["widthPct"], 3),
        "heightPct": round(rel["height"] * parent["heightPct"], 3),
    }


def main() -> None:
    live = json.loads(LIVE.read_text(encoding="utf-8"))
    pg = json.loads(PG.read_text(encoding="utf-8"))

    design = live.get("design") or [1080, 2340]
    live_parent = live["nodes"]["spin_button_controller"]
    pg_parent = find_world_pct(pg, "spin_button_controller")
    if not pg_parent:
        raise SystemExit("pg-cocos-dump 缺少 spin_button_controller")

    mapped: dict[str, dict] = {}
    for key, pg_box in PG_MANUAL.items():
        rel = rel_in_parent(pg_box, pg_parent)
        mapped[key] = apply_rel(live_parent, rel)

    # live 直接量的 spin_base 优先（运行时 bbox）
    if "spin_base" in live["nodes"]:
        mapped["spinDisc"] = live["nodes"]["spin_base"]

    payload = {
        "source": "live spin_button_controller + pg relative ratios",
        "design": design,
        "liveParent": live_parent,
        "pgParent": pg_parent,
        "hits": {
            "turbo": mapped["turboCircle"],
            "minus": mapped["minusCircle"],
            "spin": mapped["spinDisc"],
            "plus": mapped["plusCircle"],
            "auto": mapped["autoCircle"],
            "menu": mapped["menuHit"],
        },
        "visuals": {
            "turbo": mapped["turboIcon"],
            "minus": mapped["minusIcon"],
            "plus": mapped["plusIcon"],
            "auto": mapped["autoIcon"],
            "menu": mapped["menuIcon"],
        },
        "circles": {
            "turbo": mapped["turboCircle"],
            "minus": mapped["minusCircle"],
            "plus": mapped["plusCircle"],
            "auto": mapped["autoCircle"],
            "menu": mapped["menuCircle"],
        },
        "spin": {
            "disc": mapped["spinDisc"],
            "countDisc": mapped["spinCountDisc"],
            "arrow": mapped["spinArrow"],
        },
        "all": mapped,
    }

    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"OK design={design[0]}x{design[1]}")
    print(f"  spinDisc   t={mapped['spinDisc']['topPct']} h={mapped['spinDisc']['heightPct']}")
    print(f"  spinArrow  t={mapped['spinArrow']['topPct']} h={mapped['spinArrow']['heightPct']}")
    print(f"  turboCircle t={mapped['turboCircle']['topPct']}")
    print(f"-> {OUT}")


if __name__ == "__main__":
    main()
