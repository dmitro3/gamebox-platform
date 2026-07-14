#!/usr/bin/env python3
"""把 collect-pg-assets.js 下载的扁平文件整理到分类目录。"""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path

PREFIX_MAP = {
    "native__": "native",
    "import__": "import",
    "config__": "config",
    "images__": "images",
    "audio__": "audio",
    "json__": "json",
}


def category_from_name(name: str) -> str | None:
    for prefix, category in PREFIX_MAP.items():
        if name.startswith(prefix):
            return category
    return None


def restore_relative_path(name: str, category: str) -> Path:
    body = name.split("__", 1)[1]
    if category in {"native", "import"}:
        # native__38_uuid.hash.png -> native/38/uuid.hash.png
        first, rest = body.split("_", 1)
        return Path(category) / first / rest
    if category == "config":
        # config__resources_config.f413e.json -> config/resources/config.f413e.json
        if body.startswith("resources_"):
            body = body.replace("resources_", "resources/", 1)
        return Path("config") / body.replace("_", "/", 1) if "/" not in body else Path("config") / body
    return Path(category) / body


def organize_scrape(source_dir: Path, output_dir: Path, move: bool) -> dict:
    manifest_src = source_dir / "pg-assets-manifest.json"
    if not manifest_src.exists():
        raise FileNotFoundError(f"缺少清单: {manifest_src}")

    output_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(manifest_src, output_dir / "pg-assets-manifest.json")

    copied = 0
    skipped = 0
    for src in sorted(source_dir.iterdir()):
        if not src.is_file() or src.name == "pg-assets-manifest.json":
            continue
        category = category_from_name(src.name)
        if not category:
            skipped += 1
            continue
        rel = restore_relative_path(src.name, category)
        dest = output_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        if move:
            shutil.move(str(src), str(dest))
        else:
            shutil.copy2(src, dest)
        copied += 1

    summary = {"copied": copied, "skipped": skipped, "output": str(output_dir)}
    (output_dir / "organize-report.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="整理 PG 爬取资源到分类目录")
    parser.add_argument(
        "--source",
        default=str(Path(__file__).resolve().parent / "麻将胡了"),
        help="collect-pg-assets.js 下载目录",
    )
    parser.add_argument(
        "--output",
        default=str(Path(__file__).resolve().parent / "麻将胡了_已整理"),
        help="输出目录",
    )
    parser.add_argument("--move", action="store_true", help="移动而非复制")
    args = parser.parse_args()

    summary = organize_scrape(Path(args.source), Path(args.output), move=args.move)
    print(f"已整理 {summary['copied']} 个文件 -> {summary['output']}")
    if summary["skipped"]:
        print(f"跳过 {summary['skipped']} 个未识别文件")


if __name__ == "__main__":
    main()
