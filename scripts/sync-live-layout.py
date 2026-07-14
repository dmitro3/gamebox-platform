#!/usr/bin/env python3
"""正版 Cocos 运行时 dump → cocosLayout.json。

手调布局（L / playReels / spinFrame / btnBar / bgImage / nodes）保留不动；
仅更新 liveDesign + liveNodes 作正版参考，叠层从 overlays 合并进 L。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
DUMP_DEFAULT = Path(__file__).parent / "live-layout-dump.json"
OUT = ROOT / "client-app/src/games/mahjong/cocosLayout.json"
OVERLAYS = ROOT / "client-app/src/games/mahjong/cocosLayout.overlays.json"
CLIENT_DESIGN = [579, 1031]

# 正版节点名 → 本地图层 key（仅写入 liveMapped 参考，不覆盖 L）
MAP = {
    "main_top_a": "woodTop",
    "main_top_b": "multBar",
    "1024ways": "title1024",
    "content": "message",
    "main_bottom_a": "bottomWood",
    "wallet_button_sensor": "statusHudTouch",
    "GameInfo": "statusHud",
    "spin_base": "spinFrame",
    "background_controller": "background",
    "reel_a": "reelFrame",
}


def pct_box(b: dict) -> dict:
    return {
        "topPct": b["topPct"],
        "heightPct": b["heightPct"],
        "leftPct": b["leftPct"],
        "widthPct": b["widthPct"],
    }


def union_boxes(boxes: list[dict]) -> dict | None:
    if not boxes:
        return None
    left = min(b["leftPct"] for b in boxes)
    right = max(b["leftPct"] + b["widthPct"] for b in boxes)
    top = min(b["topPct"] for b in boxes)
    bottom = max(b["topPct"] + b["heightPct"] for b in boxes)
    return {
        "leftPct": round(left, 3),
        "topPct": round(top, 3),
        "widthPct": round(right - left, 3),
        "heightPct": round(bottom - top, 3),
    }


def build_live_mapped(nodes: dict) -> dict[str, dict]:
    mapped: dict[str, dict] = {}
    for src, dst in MAP.items():
        if src in nodes:
            mapped[dst] = pct_box(nodes[src])

    reels = [nodes.get(f"dark_reel_{i}") for i in range(1, 6)]
    play_reels = union_boxes([r for r in reels if r])
    if play_reels:
        mapped["playReels"] = play_reels
        mapped["board"] = play_reels

    spin = nodes.get("spin_base")
    if spin:
        top = round(max(spin["topPct"] - 1.5, 0), 3)
        mapped["btnBar"] = {
            "leftPct": 0.0,
            "topPct": top,
            "widthPct": 100.0,
            "heightPct": round(100 - top, 3),
        }

    bg = nodes.get("background_controller")
    if bg:
        box = pct_box(bg)
        bg_path = ROOT / "client-app/public/images/games/mahjong/pg/ui/bg-base.png"
        if bg_path.is_file():
            from PIL import Image

            with Image.open(bg_path) as im:
                box["pixelSize"] = list(im.size)
        mapped["bgImage"] = box

    return mapped


def merge_overlays(L: dict) -> dict:
    if not OVERLAYS.is_file():
        return L
    overlays = json.loads(OVERLAYS.read_text(encoding="utf-8"))
    out = dict(L)
    for key, box in overlays.items():
        if key == "comment" or not isinstance(box, dict):
            continue
        out[key] = pct_box(box)
    return out


def main() -> None:
    dump_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DUMP_DEFAULT
    dump = json.loads(dump_path.read_text(encoding="utf-8"))
    if dump.get("error"):
        raise SystemExit(dump["error"])

    nodes: dict = dump["nodes"]
    design = dump.get("design") or [1080, 1920]
    live_mapped = build_live_mapped(nodes)

    existing: dict = {}
    if OUT.is_file():
        existing = json.loads(OUT.read_text(encoding="utf-8"))

    L = merge_overlays(existing.get("L") or {})

    payload = {
        "source": existing.get("source") or f"live-cocos-runtime ({dump.get('page', dump_path.name)})",
        "design": existing.get("design") or CLIENT_DESIGN,
        "liveDesign": design,
        "L": L,
        "spinFrame": existing.get("spinFrame") or live_mapped.get("spinFrame") or {},
        "btnBar": existing.get("btnBar") or live_mapped.get("btnBar") or {},
        "bgImage": existing.get("bgImage") or live_mapped.get("bgImage") or {},
        "playReels": existing.get("playReels") or live_mapped.get("playReels") or {},
        "nodes": existing.get("nodes") or live_mapped,
        "liveNodes": nodes,
        "liveMapped": live_mapped,
    }

    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"OK liveDesign={design[0]}x{design[1]} liveNodes={len(nodes)} (L preserved)")
    for key in ("woodTop", "title1024", "reelFrame", "statusHud", "bottomWood", "infoboard"):
        box = L.get(key) or {}
        if box:
            print(f"  L.{key:12s} t={box['topPct']:6.2f} h={box['heightPct']:5.2f}")
    print("  liveMapped (reference only):")
    for key in ("title1024", "reelFrame", "statusHud", "spinFrame"):
        box = live_mapped.get(key) or {}
        if box:
            print(f"    {key:12s} t={box['topPct']:6.2f} h={box['heightPct']:5.2f}")
    print(f"-> {OUT}")

    manifest_script = Path(__file__).parent / "build-mahjong-manifest.py"
    if manifest_script.is_file():
        import subprocess

        subprocess.run([sys.executable, str(manifest_script)], check=False)


if __name__ == "__main__":
    main()
