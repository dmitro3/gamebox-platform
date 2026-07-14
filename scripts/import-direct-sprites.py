"""
把 pg-sprites-direct.json 里的 dataUrl 直接存成 PNG 文件
用法: python import-direct-sprites.py [json路径]
"""
from __future__ import annotations
import sys, io, json, base64, os, re, shutil
from pathlib import Path
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── 路径配置 ──────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
ROOT         = SCRIPT_DIR.parent
CLIENT_IMG   = ROOT / "client-app/public/images/games/mahjong"
OUT_DIR      = CLIENT_IMG / "classic"
MANIFEST_PTH = CLIENT_IMG / "pg/manifest.json"

JSON_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads/pg-sprites-direct.json"

# ── 精灵名 → 部署目标 映射 ────────────────────────────────────────────────
# 格式: "sprite名(支持*通配)" -> ("子目录", "文件名.png")
SYMBOL_MAP = {
    # 普通符号 (162×190)  — 场景扫描直接渲染，不含底板
    "l_ball_2":      ("symbols", "2s.png"),
    "l_ball_5":      ("symbols", "5s.png"),
    "l_bamboo_2":    ("symbols", "2t.png"),
    "l_bamboo_5":    ("symbols", "5t.png"),
    "h_char_8":      ("symbols", "8w.png"),
    "h_white":       ("symbols", "bai.png"),
    "h_green":       ("symbols", "fa.png"),
    "h_red":         ("symbols", "zhong.png"),
    # scatter / hu
    "s_scatter":     ("symbols", "hu.png"),
    # 底板
    "symbol_base_white":      ("symbols", "symbol_base_white.png"),
    "symbol_base_gold":       ("symbols", "symbol_base_gold.png"),
    "symbol_base_gold_ingot": ("symbols", "symbol_base_ingot.png"),
}

# UI 元素 → pg/ui/ 目录
UI_MAP = {
    # 转轴背景
    "reel_a":            "reel-green.png",
    "reel_glow":         "reel-glow.png",
    # 主界面背景
    "main_bottom_a":     "bg-bottom.png",
    "main_bottom_b":     "bg-bottom-bar.png",
    "main_top_a":        "bg-top-left.png",
    "main_top_b":        "bg-top.png",
    "main_top_c":        "bg-top-right.png",
    # 按钮
    "spin_base":         "btn-spin.png",
    "auto_spin":         "btn-auto.png",
    "center_autoplay":   "btn-autoplay.png",
    "btn_menu":          "icon-menu.png",
    "btn_turbo_bg":      "btn-turbo-bg.png",
    "btn_add":           "btn-add.png",
    "btn_minus":         "btn-minus.png",
    "bonus_button":      "btn-collect.png",
    "collect_pressed":   "btn-collect-pressed.png",
    "start_pressed":     "btn-spin-pressed.png",
    # 图标（设置面板）
    "ic_chip":           "icon-bet.png",
    "ic_close":          "icon-close.png",
    "ic_hist":           "icon-history.png",
    "ic_win":            "icon-win.png",
    "ic_paytable":       "icon-paytable.png",
    "ic_rule":           "icon-rules.png",
    "ic_soundon":        "icon-sound.png",
    "ic_soundoff_off":   "icon-sound-off.png",
    "ic_toast_turbo_on": "icon-turbo-on.png",
    "ic_wallet_new":     "icon-wallet.png",
    "ic_wallet_open":    "icon-wallet-open.png",
    "txt_auto":          "txt-auto.png",
    "txt_turbo_on":      "txt-turbo-on.png",
    "multiplier_glow":   "mult-glow.png",
    # 大奖 / 胡
    "bw":                "big-win-bw.png",
    "scatter_bg":        "scatter-bg.png",
    "freespin_won":      "free-spin-title.png",
    "win_info":          "win-info.png",
    # 倍率条
    "x1":               "mult-x1.png",
    "x2":               "mult-x2.png",
    "x3":               "mult-x3.png",
    "x4":               "mult-x4.png",
    "x5":               "mult-x5.png",
    "x6":               "mult-x6.png",
    "x10":              "mult-x10.png",
    # 其他 UI
    "1024ways":          "ways-label.png",
    "payout_window":     "payout-window.png",
    "info2":             "info-line.png",
    "infoboard_a":       "infoboard-a.png",
    "infoboard_b":       "infoboard-b.png",
    "infoboard_c":       "infoboard-c.png",
    "total_bg":          "total-bg.png",
    "total_fg":          "total-fg.png",
    "totalwin":          "totalwin.png",
    "totalwin_info":     "totalwin-info.png",
    "freature_loading":  "feature-loading.png",
    "bonus_lading":      "bonus-loading.png",
}


def dataurl_to_pil(data_url: str) -> Image.Image | None:
    m = re.match(r"data:image/\w+;base64,(.+)", data_url, re.DOTALL)
    if not m:
        return None
    raw = base64.b64decode(m.group(1))
    return Image.open(io.BytesIO(raw)).convert("RGBA")


def save(img: Image.Image, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG")
    print(f"  ✓ {dest.relative_to(ROOT)}")


def main():
    if not JSON_PATH.exists():
        print(f"[ERROR] 找不到文件: {JSON_PATH}")
        print("请先在 PG 游戏控制台运行 direct-render-export.js，再把下载的 JSON 拖到这里")
        sys.exit(1)

    print(f"读取 {JSON_PATH} ...")
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    sprites: dict = data.get("sprites", data)   # 兼容两种格式
    print(f"共 {len(sprites)} 个精灵\n")

    deployed_symbols = 0
    deployed_ui = 0
    skipped = 0

    for name, info in sprites.items():
        data_url = info.get("dataUrl") if isinstance(info, dict) else None
        if not data_url:
            continue

        # ── 符号 ──────────────────────────────────────────────────────────
        if name in SYMBOL_MAP:
            sub, fname = SYMBOL_MAP[name]
            img = dataurl_to_pil(data_url)
            if img:
                save(img, OUT_DIR / sub / fname)
                deployed_symbols += 1
            continue

        # ── UI 元素 ────────────────────────────────────────────────────────
        if name in UI_MAP:
            img = dataurl_to_pil(data_url)
            if img:
                save(img, CLIENT_IMG / "pg/ui" / UI_MAP[name])
                deployed_ui += 1
            continue

        skipped += 1

    print(f"\n=== 部署完成 ===")
    print(f"  符号: {deployed_symbols}")
    print(f"  UI:   {deployed_ui}")
    print(f"  跳过: {skipped} (未在映射表中)")

    # ── 生成剩余 sprite 列表，方便手动补充映射 ────────────────────────────
    unmatched = [n for n in sprites if n not in SYMBOL_MAP and n not in UI_MAP]
    if unmatched:
        report = OUT_DIR.parent / "pg/unmatched-sprites.txt"
        report.parent.mkdir(parents=True, exist_ok=True)
        report.write_text("\n".join(sorted(unmatched)), encoding="utf-8")
        print(f"\n未映射精灵已记录到: {report.relative_to(ROOT)}")
        print("前20个:", unmatched[:20])


if __name__ == "__main__":
    main()
