#!/usr/bin/env python3
"""合并多批 PG 爬取资源（扁平 + 已整理）为统一扁平目录。"""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent

PREFIXES = ("native__", "import__", "config__", "images__", "audio__", "json__")


def organized_to_flat(rel: Path) -> str | None:
    parts = rel.as_posix().split("/")
    if len(parts) < 2:
        return None
    category = parts[0]
    if category == "native" and len(parts) == 3:
        return f"native__{parts[1]}_{parts[2]}"
    if category == "import" and len(parts) == 3:
        return f"import__{parts[1]}_{parts[2]}"
    if category in {"images", "audio", "json", "config"}:
        return f"{category}__{'_'.join(parts[1:])}"
    return None


def flat_name_from_item(item: dict) -> str | None:
    fn = item.get("filename", "").replace("\\", "/")
    if not fn:
        return None
    if "/" in fn:
        cat, rest = fn.split("/", 1)
        if cat in {"native", "import"}:
            seg = rest.split("_", 1)
            if len(seg) == 2:
                return f"{cat}__{seg[0]}_{seg[1]}"
        return f"{cat}__{rest.replace('/', '_')}"
    return fn.replace("/", "__")


def discover_sources(extra: list[str]) -> list[Path]:
    defaults = [ROOT / "麻将胡了", ROOT / "麻将胡了_已整理"]
    paths: list[Path] = []
    for p in defaults + [Path(x) for x in extra]:
        if p.exists() and p not in paths:
            paths.append(p)
    return paths


def build_file_index(source: Path) -> dict[str, Path]:
    """flat_name -> absolute path"""
    index: dict[str, Path] = {}
    if not source.exists():
        return index

    # flat layout
    for f in source.iterdir():
        if f.is_file() and any(f.name.startswith(p) for p in PREFIXES):
            index[f.name] = f

    # organized layout
    for cat in ("native", "import", "images", "audio", "json", "config"):
        base = source / cat
        if not base.exists():
            continue
        for f in base.rglob("*"):
            if not f.is_file():
                continue
            rel = f.relative_to(source)
            flat = organized_to_flat(rel)
            if flat:
                index.setdefault(flat, f)

    return index


def load_manifest(source: Path) -> dict | None:
    for name in ("pg-assets-manifest.json", "pg-assets-manifest.merged.json"):
        p = source / name
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
    return None


def merge_manifests(sources: list[Path]) -> dict:
    merged_items: dict[str, dict] = {}
    source_times: list[str] = []

    for src in sources:
        m = load_manifest(src)
        if not m:
            continue
        if m.get("collectedAt"):
            source_times.append(m["collectedAt"])
        for item in m.get("items", []):
            url = item.get("url")
            if not url:
                continue
            prev = merged_items.get(url)
            if prev is None:
                merged_items[url] = {**item, "_source": str(src)}
                continue
            # 优先 ok、更大 size、更新采集时间
            def score(it: dict) -> tuple:
                return (
                    1 if it.get("ok") else 0,
                    int(it.get("size") or 0),
                )

            if score(item) > score(prev):
                merged_items[url] = {**item, "_source": str(src)}

    items = []
    for url, item in sorted(merged_items.items(), key=lambda x: x[0]):
        row = {k: v for k, v in item.items() if not k.startswith("_")}
        items.append(row)

    return {
        "collectedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "mergedFrom": [str(s) for s in sources],
        "mergedAt": source_times,
        "gameId": "65",
        "summary": {
            "http": sum(1 for i in items if i.get("url", "").startswith("http")),
            "blob": sum(1 for i in items if i.get("url", "").startswith("blob:")),
            "total": len(items),
            "ok": sum(1 for i in items if i.get("ok")),
            "fail": sum(1 for i in items if not i.get("ok")),
        },
        "items": items,
    }


def merge_files(sources: list[Path], output: Path, manifest: dict) -> dict:
    indices = {src: build_file_index(src) for src in sources}
    output.mkdir(parents=True, exist_ok=True)

    copied = 0
    missing = 0
    extra = 0
    used_flat: set[str] = set()

    for item in manifest["items"]:
        flat = flat_name_from_item(item)
        if not flat:
            continue
        src_path = None
        for src in sources:
            idx = indices[src]
            if flat in idx:
                src_path = idx[flat]
                break
        if not src_path or not src_path.exists():
            missing += 1
            continue
        dest = output / flat
        if flat not in used_flat or dest.stat().st_size < src_path.stat().st_size:
            shutil.copy2(src_path, dest)
            used_flat.add(flat)
            copied += 1

    # 磁盘上额外文件（manifest 未列但另一批有）
    all_flat: dict[str, Path] = {}
    for src in sources:
        for flat, path in indices[src].items():
            if flat not in all_flat or path.stat().st_size > all_flat[flat].stat().st_size:
                all_flat[flat] = path

    for flat, path in all_flat.items():
        if flat in used_flat:
            continue
        shutil.copy2(path, output / flat)
        used_flat.add(flat)
        extra += 1

    (output / "pg-assets-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    report = {
        "output": str(output),
        "sources": [str(s) for s in sources],
        "manifest_urls": len(manifest["items"]),
        "copied_from_manifest": copied,
        "extra_orphan_files": extra,
        "missing_on_disk": missing,
        "total_files": len(list(output.glob("*"))) - 1,
    }
    (output / "merge-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="合并多批 PG 爬取资源")
    parser.add_argument(
        "--output",
        default=str(ROOT / "麻将胡了_合并"),
        help="合并输出目录（扁平）",
    )
    parser.add_argument("--source", action="append", default=[], help="额外源目录")
    args = parser.parse_args()

    sources = discover_sources(args.source)
    if not sources:
        raise SystemExit("找不到任何源目录（麻将胡了 / 麻将胡了_已整理）")

    output = Path(args.output)
    if output.exists():
        shutil.rmtree(output)

    manifest = merge_manifests(sources)
    report = merge_files(sources, output, manifest)

    print(f"源目录: {len(sources)} 个")
    for s in sources:
        print(f"  - {s}")
    print(f"合并 URL: {report['manifest_urls']}  成功条目: {manifest['summary']['ok']}")
    print(f"写入文件: {report['total_files']}")
    print(f"  来自 manifest: {report['copied_from_manifest']}")
    print(f"  额外磁盘文件: {report['extra_orphan_files']}")
    print(f"  manifest 无本地文件: {report['missing_on_disk']}")
    print(f"输出 -> {output}")


if __name__ == "__main__":
    main()
