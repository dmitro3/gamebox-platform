#!/usr/bin/env python3
"""将 manifest.ui 对齐 rebuild 产物：保留 pg/ui 全部已部署资源 + 麻将目录封面。"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAHJONG = ROOT / "client-app/public/images/games/mahjong"
MANIFEST = MAHJONG / "pg/manifest.json"
PG_UI = MAHJONG / "pg/ui"
FULL_IMAGES = MAHJONG / "pg/sprites/full-images"

SKIP_STEMS = frozenset({"_preview", "_debug"})


def pick_bg() -> str | None:
    cropped = PG_UI / "bg-base.jpg"
    if cropped.is_file():
        return "pg/ui/bg-base.jpg"
    cropped_png = PG_UI / "bg-base.png"
    if cropped_png.is_file():
        return "pg/ui/bg-base.png"
    if FULL_IMAGES.exists():
        files = sorted(FULL_IMAGES.glob("*.png"), key=lambda p: p.stat().st_size, reverse=True)
        if files:
            return f"pg/sprites/full-images/{files[0].name}"
    return None


def main() -> None:
    if not MANIFEST.exists():
        raise SystemExit("请先运行 rebuild-mahjong-from-scrape.py")

    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    ui: dict[str, str] = dict(data.get("ui") or {})

    bg = pick_bg()
    if bg:
        ui["bg-base"] = bg

    cover_custom = MAHJONG / "mahjong-cover-custom.jpg"
    cover_webp = MAHJONG / "mahjong.webp"
    cert = PG_UI / "cover-footer-cert.png"

    for path in sorted(PG_UI.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".png", ".jpg", ".webp"}:
            continue
        if any(part.startswith("_") for part in path.parts):
            continue
        if path.stem in SKIP_STEMS or path.stem.startswith("_"):
            continue
        rel = path.relative_to(MAHJONG).as_posix()
        ui[path.stem] = rel

    # 封面/认证条必须在全量扫描之后写入，避免 stem 键互相覆盖
    if cover_custom.is_file():
        ui["cover"] = "mahjong-cover-custom.jpg"
        ui["cover-bg"] = "mahjong-cover-custom.jpg"
    cover_bottom = PG_UI / "cover-bottom-bg.jpg"
    if cover_bottom.is_file():
        ui["cover-bottom-bg"] = "pg/ui/cover-bottom-bg.jpg"
    if cover_webp.is_file():
        ui["lobby-icon"] = "mahjong.webp"
    if cert.is_file():
        ui["cover-footer-cert"] = "pg/ui/cover-footer-cert.png"

    data["ui"] = ui
    data["sprites_source"] = "scripts/麻将胡了 only (no lingguang)"
    MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"manifest.ui: {len(ui)} 项（pg/ui 全量 + 封面）")


if __name__ == "__main__":
    main()
