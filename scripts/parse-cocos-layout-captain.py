#!/usr/bin/env python3
"""从赏金船长 (PG game 54) 爬取 Cocos prefab/scene JSON 提取 UI 布局百分比。"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import importlib.util

ROOT = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("pcl", ROOT / "parse-cocos-layout.py")
pcl = importlib.util.module_from_spec(_spec)
assert _spec.loader
_spec.loader.exec_module(pcl)

DEFAULT_SCRAPE = Path(r"C:\Users\pc\Desktop\赏金船长")
FALLBACK_SCRAPE = ROOT / "赏金船长"
OUT = ROOT.parent / "client-app/src/games/captain/cocosLayout.json"

# 赏金船长 prefab 文件名（与麻将不同）
CAPTAIN_FILES = {
    "bg": "import__0c_0c5f57782.10a7e.json",
    "spin": "import__03_03c5e9142.57027.json",
    "info": "import__0d_0d2b959c5.85c74.json",
    "hud": "import__a8_a83465b4-233e-459a-862d-a76c1610c770.a040f.json",
    "menu": "import__df_dfce8cf6-ecd2-4f2b-a746-d86c5f78d472.0a8a5.json",
    "scene": "json__22_2240ef52-a95a-4531-b8da-ee56c962fb55.b66fd.json",
}


def resolve_files(scrape: Path) -> dict[str, Path]:
    out: dict[str, Path] = {}
    missing: list[str] = []
    for key, name in CAPTAIN_FILES.items():
        p = scrape / name
        if p.is_file():
            out[key] = p
        else:
            missing.append(name)
    if missing:
        raise SystemExit(
            f"缺少文件（--scrape-dir={scrape}）:\n  " + "\n  ".join(missing)
        )
    return out


def pct_box(p: dict) -> dict:
    return {
        "topPct": p["topPct"],
        "heightPct": p["heightPct"],
        "leftPct": p["leftPct"],
        "widthPct": p["widthPct"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="赏金船长 Cocos 布局 → cocosLayout.json")
    parser.add_argument(
        "--scrape-dir",
        default=str(DEFAULT_SCRAPE if DEFAULT_SCRAPE.is_dir() else FALLBACK_SCRAPE),
        help="爬取资源目录（默认 Desktop/赏金船长）",
    )
    args = parser.parse_args()
    scrape = Path(args.scrape_dir)
    files = resolve_files(scrape)
    texts = {k: v.read_text(encoding="utf-8", errors="ignore") for k, v in files.items()}

    footer_holder = pcl.find_node(texts["scene"], "setting_menu_footer_holder")
    menu_holder = (footer_holder["x"], footer_holder["y"]) if footer_holder else (0.0, -876.0)

    raw: dict[str, dict | None] = {
        "reelFrame": pcl.layout_from_chain(texts["bg"], ["ui_reel_frame"]),
        "playReels": pcl.layout_from_chain(texts["bg"], ["ui_reel_back_normal"]),
        "bottomFooter": pcl.layout_from_chain(texts["bg"], ["ui_footer"]),
        "message": (
            lambda n: pcl.tl_pct(
                n["x"], n["y"], n["w"], n["h"], n["ax"], n["ay"], n["sx"], n["sy"]
            )
        )(n)
        if (n := pcl.find_node(texts["info"], "info_board_message"))
        else None,
        "spinFrame": pcl.layout_from_chain(texts["spin"], ["spin_button_controller"]),
        "btnBar": pcl.layout_from_chain(texts["menu"], ["setting_menu"], holder=menu_holder),
        "gameInfo": pcl.layout_from_chain(texts["hud"], ["GameInfo"]),
        "walletTouch": pcl.layout_from_chain(texts["hud"], ["wallet_button_sensor"]),
    }

    msg, bar, footer = raw.get("message"), raw.get("btnBar"), raw.get("bottomFooter")
    if msg and bar and footer:
        raw["statusHud"] = {
            "topPct": round(msg["topPct"] + msg["heightPct"], 3),
            "heightPct": round(max(bar["topPct"] - (msg["topPct"] + msg["heightPct"]), 2.0), 3),
            "leftPct": footer["leftPct"],
            "widthPct": footer["widthPct"],
        }

    bg_path = ROOT.parent / "client-app/public/images/games/captain/pg/ui/bg-base.png"
    bg_w, bg_h = 918, 831
    if bg_path.is_file():
        try:
            from PIL import Image

            with Image.open(bg_path) as im:
                bg_w, bg_h = im.size
        except Exception:
            pass
    footer_box = raw.get("bottomFooter")
    bg_left = footer_box["leftPct"] if footer_box else 0.0
    bg_width = footer_box["widthPct"] if footer_box else round(bg_w / pcl.DESIGN_W * 100, 3)
    raw["bgImage"] = {
        "topPct": 0.0,
        "leftPct": bg_left,
        "widthPct": bg_width,
        "heightPct": round(bg_h / pcl.DESIGN_H * 100, 3),
        "pixelSize": [bg_w, bg_h],
    }

    print(f"Cocos design {pcl.DESIGN_W}x{pcl.DESIGN_H} (percentage layout)\n")
    for k, v in raw.items():
        if v:
            print(
                f"{k:14s} top={v['topPct']:6.2f}% h={v['heightPct']:5.2f}% "
                f"left={v['leftPct']:6.2f}% w={v['widthPct']:5.2f}%"
            )
        else:
            print(f"{k:14s} NOT FOUND")

    L = {
        k: pct_box(v)
        for k, v in raw.items()
        if v and k not in ("spinFrame", "btnBar", "bgImage", "playReels", "walletTouch")
    }
    if raw.get("reelFrame"):
        L["reelFrame"] = pct_box(raw["reelFrame"])
    if raw.get("playReels"):
        L["playReels"] = pct_box(raw["playReels"])

    spin_frame = pct_box(raw["spinFrame"]) if raw.get("spinFrame") else {}
    btn_bar = pct_box(raw["btnBar"]) if raw.get("btnBar") else {}
    if btn_bar:
        btn_bar["leftPct"] = 0.0
        btn_bar["widthPct"] = 100.0

    payload = {
        "source": f"{scrape} Cocos prefab + scene JSON",
        "design": [pcl.DESIGN_W, pcl.DESIGN_H],
        "L": L,
        "spinFrame": spin_frame,
        "btnBar": btn_bar,
        "bgImage": pct_box(raw["bgImage"]) if raw.get("bgImage") else {},
        "playReels": pct_box(raw["playReels"]) if raw.get("playReels") else {},
        "nodes": {k: v for k, v in raw.items() if v},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\n-> {OUT}")


if __name__ == "__main__":
    main()
