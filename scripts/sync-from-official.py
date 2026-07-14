#!/usr/bin/env python3
"""
对照正版 Mahjong Ways — 爬一个换一个。

流程（布局）：
  1. 打开正版页，等游戏进入主界面
  2. 控制台粘贴 scripts/live-cocos-dump.js 回车
     或在 Cursor 内置浏览器对正版 tab 执行 CDP Runtime.evaluate
  3. 把输出保存为 scripts/live-layout-dump.json
  4. python scripts/sync-from-official.py

流程（素材）：
  python scripts/sync-from-official.py --asset bg-base
  python scripts/sync-from-official.py --asset all-ui
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent.parent
SCRIPTS = Path(__file__).parent
DUMP = SCRIPTS / "live-layout-dump.json"
MANIFEST = SCRIPTS / "麻将胡了" / "pg-assets-manifest.json"
PG_UI = ROOT / "client-app/public/images/games/mahjong/pg/ui"

ASSET_MAP = {
    "bg-base": {
        "manifest_glob": "native/67/6737e5a0",
        "dest": "bg-base.png",
    },
}


def pull_asset(key: str) -> None:
    if key == "all-ui":
        subprocess.check_call([sys.executable, str(SCRIPTS / "deploy-pg-assets.py")])
        return
    spec = ASSET_MAP.get(key)
    if not spec:
        raise SystemExit(f"未知素材 key: {key}，可用: {', '.join(ASSET_MAP)} / all-ui")
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    needle = spec["manifest_glob"]
    item = next((i for i in data["items"] if needle in i.get("url", "")), None)
    if not item:
        raise SystemExit(f"manifest 中找不到: {needle}")
    PG_UI.mkdir(parents=True, exist_ok=True)
    dest = PG_UI / spec["dest"]
    print(f"下载 {item['url']}")
    urllib.request.urlretrieve(item["url"], dest)
    print(f"-> {dest}")


def main() -> None:
    parser = argparse.ArgumentParser(description="从正版同步布局/素材到本地")
    parser.add_argument("--dump", help="live dump json 路径", default=str(DUMP))
    parser.add_argument("--asset", help="拉取单个素材或 all-ui")
    parser.add_argument("--layout-only", action="store_true", help="仅同步布局")
    args = parser.parse_args()

    if args.asset:
        pull_asset(args.asset)

    if args.asset and not args.layout_only:
        if not Path(args.dump).is_file():
            print("未找到 layout dump，跳过布局同步")
            return

    if not args.asset or not args.layout_only:
        dump_path = Path(args.dump)
        if not dump_path.is_file():
            print(__doc__)
            raise SystemExit(f"\n缺少 {dump_path}\n请先在正版页执行 live-cocos-dump.js")
        subprocess.check_call([
            sys.executable,
            str(SCRIPTS / "sync-live-layout.py"),
            str(dump_path),
        ])


if __name__ == "__main__":
    main()
