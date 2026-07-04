#!/usr/bin/env python3
"""清空项目内麻将图片资源，仅从 scripts/麻将胡了 正版爬取包重建。"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
SCRAPE = SCRIPTS / "麻将胡了"
MAHJONG = ROOT / "client-app/public/images/games/mahjong"
GAMES_IMG = ROOT / "client-app/public/images/games"
AUDIO = ROOT / "client-app/public/audio/mahjong"

# 仅保留爬取源，不删
KEEP_SCRAPE = SCRAPE

WIPE_DIRS = [
    MAHJONG / "classic",
    MAHJONG / "lingguang",
    MAHJONG / "pg",
]

WIPE_FILES = [
    MAHJONG / "ASSET_DEPLOY_REPORT.json",
    GAMES_IMG / "mahjong.png",
    GAMES_IMG / "mahjong.webp",
    GAMES_IMG / "mahjong-cover-custom.jpg",
]

# 仓库根临时帧（非游戏资源）
WIPE_TMP_GLOBS = [
    ROOT / ".tmp-video-frames",
    ROOT / ".tmp-video-frames-hi",
]


def wipe_runtime_assets() -> list[str]:
    removed: list[str] = []
    for d in WIPE_DIRS:
        if d.exists():
            shutil.rmtree(d)
            removed.append(str(d.relative_to(ROOT)))
    for f in WIPE_FILES:
        if f.exists():
            f.unlink()
            removed.append(str(f.relative_to(ROOT)))
    for pattern in WIPE_TMP_GLOBS:
        if pattern.exists():
            shutil.rmtree(pattern)
            removed.append(str(pattern.relative_to(ROOT)))
    return removed


def run_script(name: str, *args: str) -> None:
    path = SCRIPTS / name
    cmd = [sys.executable, str(path), "--scrape-dir", str(SCRAPE), *args]
    print(f"\n>>> {' '.join(cmd)}")
    subprocess.run(cmd, check=True, cwd=str(ROOT))


def write_report(removed: list[str]) -> None:
    manifest_path = MAHJONG / "pg/manifest.json"
    sprites_report = MAHJONG / "pg/sprites-report.json"
    summary: dict = {
        "rebuilt_at": datetime.now(timezone.utc).isoformat(),
        "scrape_source": str(SCRAPE),
        "removed_paths": removed,
    }
    if manifest_path.exists():
        m = json.loads(manifest_path.read_text(encoding="utf-8"))
        summary["manifest"] = {
            "symbols": len(m.get("symbols", {})),
            "symbols_golden": len(m.get("symbols_golden", {})),
            "ui": len(m.get("ui", {})),
            "ui_keys": sorted(m.get("ui", {}).keys()),
        }
    if sprites_report.exists():
        r = json.loads(sprites_report.read_text(encoding="utf-8"))
        summary["sprites"] = r.get("summary", {})
    report_path = MAHJONG / "ASSET_DEPLOY_REPORT.json"
    MAHJONG.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\n报告: {report_path}")


def main() -> None:
    if not SCRAPE.exists():
        raise SystemExit(f"找不到爬取目录: {SCRAPE}")

    print("=== 1/5 清空旧资源 ===")
    removed = wipe_runtime_assets()
    for p in removed:
        print(f"  删除: {p}")
    if not removed:
        print("  （无旧资源）")

    MAHJONG.mkdir(parents=True, exist_ok=True)

    print("\n=== 2/5 部署符号 + UI（deploy-pg-assets.py）===")
    run_script("deploy-pg-assets.py")

    print("\n=== 3/5 全量裁切精灵库（extract-all-sprites.py）===")
    run_script("extract-all-sprites.py")

    print("\n=== 4/5 对齐 manifest（sync-sprites-to-manifest.py）===")
    run_script("sync-sprites-to-manifest.py")

    write_report(removed)

    print("\n=== 5/5 收拢散落资源到 mahjong/ ===")
    run_script("organize-mahjong-assets.py")
    print("\n完成：麻将资源已从正版爬取包重建。")


if __name__ == "__main__":
    main()
