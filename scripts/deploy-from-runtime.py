#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import sys, io
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'buffer'):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
"""
把 extract-from-runtime-dump.py 裁切好的精灵，按麻将游戏的素材逻辑合成部署。

规则（与正版一致）：
  - 普通牌面：symbol_base_white + 符号叠层  → pg/symbols/<key>.png
  - 金色牌面：symbol_base_gold  + 符号叠层  → pg/symbols-golden/<key>.png
  - 野牌 wild：symbol_base_ingot + 百搭叠层  → pg/symbols/wild.png
  - 散花 hu：  scatter_bg（或 white 底）+ 胡字叠层 → pg/symbols/hu.png
  - UI 元素：  直接按名称映射复制              → pg/ui/<key>.png

使用方法：
  python deploy-from-runtime.py [--dump scripts/runtime-sprites-manifest.json]
"""

import argparse
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT    = Path(__file__).resolve().parent.parent
SCRIPTS = Path(__file__).resolve().parent

# 输出目录
PG          = ROOT / "client-app/public/images/games/mahjong/pg"
SYMBOLS_OUT = PG / "symbols"
GOLDEN_OUT  = PG / "symbols-golden"
UI_OUT      = PG / "ui"

# 符号对照：精灵帧名 → 游戏 key
SYMBOL_MAP = {
    "h_char_8":   "8w",
    "h_green":    "fa",
    "h_red":      "zhong",
    "h_white":    "bai",
    "l_ball_2":   "2t",
    "l_ball_5":   "5t",
    "l_bamboo_2": "2s",
    "l_bamboo_5": "5s",
    "s_wild":     "wild",
    "s_scatter":  "hu",
}

# UI 元素：精灵帧名 → pg/ui 文件名
UI_MAP = {
    "btn_turbo_bg":       "btn-turbo-bg",
    "center_turbo_off":   "btn-turbo",
    "ic_exit":            "btn-exit",
    "ic_soundon":         "btn-sound-on",
    "ic_soundoff_off":    "btn-sound-off",
    "ic_paytable":        "btn-paytable",
    "ic_rule":            "btn-rules",
    "ic_hist":            "btn-history",
    "ic_close":           "btn-back",
    "btn_menu":           "icon-menu",
    "win_info":           "icon-win",
    "ic_wallet_new":      "icon-wallet",
    "ic_chip":            "icon-bet",
    "freespin_won":       "fs-trigger-panel-bg",
    "totalwin":           "fs-end-panel-bg",
    "1024ways":           "top-title-1024",
    "collect_pressed":    "fs-end-collect",
    "bw":                 "big-win-bw",
    "mw":                 "big-win-mw",
    "smw":                "big-win-smw",
    "start":              "btn-start",
    "start_pressed":      "btn-start-pressed",
    "spin_base":          "btn-spin-frame",
    "arrow":              "btn-spin-arrows",
    "center_autoplay":    "btn-auto",
    "auto_arrow":         "btn-auto-arrow",
    "btn_add":            "btn-plus",
    "btn_minus":          "btn-minus",
    "auto_spin":          "label-auto",
    "ic_toast_turbo_on":  "label-turbo-on",
    "ic_toast_turbo_off": "label-turbo-off",
    "reel_a":             "reel-green",
    "main_bottom_a":      "bottom-wood",
    "main_top_b":         "top-bar-orange",
    "main_top_c":         "multiplier-bar-bg",
    "bonus_top_b":        "multiplier-bar-bg-free",
    "x1":  "mult-x1",
    "x2":  "mult-x2",
    "x3":  "mult-x3",
    "x4":  "mult-x4",
    "x5":  "mult-x5",
    "x6":  "mult-x6",
    "x10": "mult-x10",
}


def open_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def composite(base: Image.Image, overlay: Image.Image) -> Image.Image:
    """将 overlay 按原点叠加到 base 上（Porter-Duff Over）。"""
    result = base.copy()
    if overlay.size != base.size:
        overlay = overlay.resize(base.size, Image.Resampling.LANCZOS)
    result.alpha_composite(overlay, (0, 0))
    return result


def main(dump_file: Path) -> None:
    if not dump_file.exists():
        raise SystemExit(
            f"找不到 {dump_file}\n"
            "请先运行 extract-from-runtime-dump.py"
        )

    manifest = json.loads(dump_file.read_text(encoding="utf-8"))
    sprites_list: list[dict] = manifest.get("sprites", [])

    # 建立 name → path 的快速索引
    by_name: dict[str, Path] = {}
    for s in sprites_list:
        name = s.get("name", "")
        path = ROOT / s["path"]
        by_name[name] = path

    if not by_name:
        raise SystemExit("manifest 里没有精灵，请先运行 extract-from-runtime-dump.py")

    print(f"读取精灵清单: {len(by_name)} 个精灵帧")

    # 准备输出目录
    SYMBOLS_OUT.mkdir(parents=True, exist_ok=True)
    GOLDEN_OUT.mkdir(parents=True, exist_ok=True)
    UI_OUT.mkdir(parents=True, exist_ok=True)

    # ── 读取基础牌面底图 ─────────────────────────────────────────────────
    def get(name: str) -> Image.Image | None:
        p = by_name.get(name)
        if p and p.exists():
            return open_rgba(p)
        # 模糊匹配（大小写、下划线变体）
        for k, v in by_name.items():
            if k.lower().replace("-", "_") == name.lower().replace("-", "_"):
                return open_rgba(v)
        return None

    base_white  = get("symbol_base_white")
    base_gold   = get("symbol_base_gold")
    base_ingot  = get("symbol_base_ingot")   # 金元宝底（野牌用）
    scatter_bg  = get("scatter_bg")          # 胡字特殊底（可能没有）

    if not base_white:
        print("⚠  未找到 symbol_base_white，将尝试不使用底图合成")

    deployed_symbols = 0
    deployed_ui = 0
    missing = []

    # ── 部署普通符号 ─────────────────────────────────────────────────────
    for sprite_name, game_key in SYMBOL_MAP.items():
        sym = get(sprite_name)
        if not sym:
            missing.append(sprite_name)
            continue

        if game_key == "wild":
            # 野牌：百搭叠在金元宝底（或金底）上
            wild_base = base_ingot or base_gold or base_white
            if wild_base:
                out_img = composite(wild_base, sym)
            else:
                out_img = sym
            out_img.save(SYMBOLS_OUT / "wild.png")
            # golden 版本：同样用 ingot 底（视觉不变）
            out_img.save(GOLDEN_OUT / "wild.png")
            deployed_symbols += 1
            continue

        if game_key == "hu":
            # 胡字：优先用 scatter_bg，没有就用白底
            hu_base = scatter_bg or base_white
            if hu_base:
                out_img = composite(hu_base, sym)
            else:
                out_img = sym
            out_img.save(SYMBOLS_OUT / "hu.png")
            # golden 版本：用金底
            if base_gold:
                out_img_g = composite(base_gold, sym)
            else:
                out_img_g = out_img
            out_img_g.save(GOLDEN_OUT / "hu.png")
            deployed_symbols += 1
            continue

        # 普通牌：symbol 叠在 white_base 上
        if base_white:
            std_img = composite(base_white, sym)
        else:
            std_img = sym
        std_img.save(SYMBOLS_OUT / f"{game_key}.png")
        deployed_symbols += 1

        # 金色版本：叠在 gold_base 上
        if base_gold:
            gld_img = composite(base_gold, sym)
            gld_img.save(GOLDEN_OUT / f"{game_key}.png")

    print(f"✓ 符号部署: {deployed_symbols}/{len(SYMBOL_MAP)}")

    # ── 部署 UI 元素 ─────────────────────────────────────────────────────
    for sprite_name, ui_key in UI_MAP.items():
        img = get(sprite_name)
        if not img:
            missing.append(f"UI:{sprite_name}")
            continue
        dest = UI_OUT / f"{ui_key}.png"
        img.save(dest)
        deployed_ui += 1

    print(f"✓ UI 部署: {deployed_ui}/{len(UI_MAP)}")

    # ── 更新 manifest.json ────────────────────────────────────────────────
    manifest_path = PG / "manifest.json"
    existing = {}
    if manifest_path.exists():
        try:
            existing = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception:
            pass

    symbols_map = {k: f"pg/symbols/{k}.png" for k in SYMBOL_MAP.values() if (SYMBOLS_OUT / f"{k}.png").exists()}
    golden_map  = {k: f"pg/symbols-golden/{k}.png" for k in SYMBOL_MAP.values() if (GOLDEN_OUT / f"{k}.png").exists()}
    ui_map_out  = {v: f"pg/ui/{v}.png" for v in UI_MAP.values() if (UI_OUT / f"{v}.png").exists()}

    new_manifest = {
        **existing,
        "symbols":        symbols_map,
        "symbols_golden": golden_map,
        "ui":             {**existing.get("ui", {}), **ui_map_out},
    }
    manifest_path.write_text(json.dumps(new_manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ manifest.json 更新: {manifest_path}")

    if missing:
        print(f"\n⚠  未找到 {len(missing)} 个精灵: {missing[:20]}")

    print(f"\n🎉 部署完成！")
    print(f"   符号: {SYMBOLS_OUT}")
    print(f"   金色: {GOLDEN_OUT}")
    print(f"   UI:   {UI_OUT}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dump",
        default=str(SCRIPTS / "runtime-sprites-manifest.json"),
        help="extract-from-runtime-dump.py 输出的 manifest 文件",
    )
    args = parser.parse_args()
    main(Path(args.dump))
