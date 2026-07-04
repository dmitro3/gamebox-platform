#!/usr/bin/env python3
"""把散在 games/ 根目录的麻将资源收拢到 games/mahjong/，并只修正 manifest 里指向旧路径的字符串。"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GAMES = ROOT / "client-app/public/images/games"
MAHJONG = GAMES / "mahjong"
MANIFEST = MAHJONG / "pg/manifest.json"

# games/ 根 → mahjong/ 内（同名）
MOVE_MAP = {
    "mahjong-cover-custom.jpg": "mahjong-cover-custom.jpg",
    "mahjong.webp": "mahjong.webp",
    "mahjong.png": "mahjong.png",
}

# 文件移动后，manifest 里旧的外部引用 → 麻将目录内相对路径
PATH_FIX = {
    "../mahjong-cover-custom.jpg": "mahjong-cover-custom.jpg",
    "../mahjong.png": "mahjong.png",
    "../mahjong.webp": "mahjong.webp",
}


def move_loose_files() -> list[str]:
    moved: list[str] = []
    MAHJONG.mkdir(parents=True, exist_ok=True)
    for src_name, dest_name in MOVE_MAP.items():
        src = GAMES / src_name
        dest = MAHJONG / dest_name
        if not src.is_file():
            continue
        if dest.is_file() and src.resolve() == dest.resolve():
            continue
        if dest.is_file():
            dest.unlink()
        shutil.move(str(src), str(dest))
        moved.append(f"{src_name} -> mahjong/{dest_name}")
    return moved


def fix_manifest_paths() -> int:
    if not MANIFEST.is_file():
        return 0
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    changed = 0

    def walk(obj):
        nonlocal changed
        if isinstance(obj, dict):
            for key, val in obj.items():
                if isinstance(val, str) and val in PATH_FIX:
                    obj[key] = PATH_FIX[val]
                    changed += 1
                else:
                    walk(val)
        elif isinstance(obj, list):
            for item in obj:
                walk(item)

    walk(data)
    if changed:
        MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return changed


def main() -> None:
    moved = move_loose_files()
    path_fixes = fix_manifest_paths()
    print("收拢完成:")
    for line in moved:
        print(f"  {line}")
    if not moved:
        print("  （根目录无散落麻将文件）")
    print(f"manifest 路径修正: {path_fixes} 处")
    print(f"manifest -> {MANIFEST}")


if __name__ == "__main__":
    main()
