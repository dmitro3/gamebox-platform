#!/usr/bin/env python3
"""识别 PG 游戏缓存文件的真实类型，并整理到带正确扩展名的目录。"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

MAGIC = [
    (b"\xFF\xD8\xFF", "image/jpeg", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
    (b"GIF87a", "image/gif", ".gif"),
    (b"GIF89a", "image/gif", ".gif"),
    (b"RIFF", "audio/wav", ".wav"),  # 需进一步判断 WEBP/AVI，下面单独处理
    (b"ID3", "audio/mpeg", ".mp3"),
    (b"\x1a\x45\xdf\xa3", "video/webm", ".webm"),
    (b"OggS", "audio/ogg", ".ogg"),
    (b"PK\x03\x04", "application/zip", ".zip"),
    (b"\x7B\x22", "application/json", ".json"),
    (b"<!DO", "text/html", ".html"),
    (b"<htm", "text/html", ".html"),
    (b"<HTM", "text/html", ".html"),
]

TEXT_SIGNATURES = [
    (re.compile(rb"^\s*//"), "text/javascript", ".js"),
    (re.compile(rb"^\s*/\*"), "text/javascript", ".js"),
    (re.compile(rb"^\s*!\s*function"), "text/javascript", ".js"),
    (re.compile(rb"^\s*!\(function"), "text/javascript", ".js"),
    (re.compile(rb"^\s*\(function"), "text/javascript", ".js"),
    (re.compile(rb"^System\.register"), "text/javascript", ".js"),
    (re.compile(rb"^<\?xml"), "application/xml", ".xml"),
    (re.compile(rb"^\s*\{"), "application/json", ".json"),
]


@dataclass
class FileInfo:
    source: str
    size: int
    mime: str
    ext: str
    category: str
    target_name: str
    note: str = ""


def read_head(path: Path, n: int = 512) -> bytes:
    with path.open("rb") as f:
        return f.read(n)


def detect_webp(head: bytes) -> tuple[str, str] | None:
    if head.startswith(b"RIFF") and len(head) >= 12 and head[8:12] == b"WEBP":
        return "image/webp", ".webp"
    return None


def detect_type(path: Path) -> tuple[str, str, str, str]:
    head = read_head(path)

    webp = detect_webp(head)
    if webp:
        mime, ext = webp
        return mime, ext, "images", "WEBP 文件头"

    for magic, mime, ext in MAGIC:
        if head.startswith(magic):
            category = category_for_mime(mime)
            note = f"文件头 {magic[:8]!r}"
            if magic == b"RIFF":
                return mime, ext, category, "RIFF 容器，默认按 wav 处理"
            return mime, ext, category, note

    for pattern, mime, ext in TEXT_SIGNATURES:
        if pattern.search(head[:256]):
            return mime, ext, category_for_mime(mime), "文本特征匹配"

    if b"<html" in head[:200].lower() or b"<!doctype html" in head[:200].lower():
        return "text/html", ".html", "html", "HTML 文本特征"

    return "application/octet-stream", ".bin", "unknown", "未能识别，保留为二进制"


def category_for_mime(mime: str) -> str:
    if mime.startswith("image/"):
        return "images"
    if mime.startswith("audio/"):
        return "audio"
    if mime.startswith("video/"):
        return "video"
    if mime in {"text/html"}:
        return "html"
    if mime in {"text/javascript", "application/javascript"}:
        return "scripts"
    if mime in {"application/json", "application/xml"}:
        return "config"
    return "unknown"


def safe_stem(name: str) -> str:
    cleaned = re.sub(r'[<>:"/\\|?*]+', "_", name).strip(" .")
    return cleaned or "unnamed"


def build_target_name(src: Path, ext: str, used: set[str]) -> str:
    stem = safe_stem(src.stem)
    if src.suffix.lower() in {".js", ".html", ".htm", ".json", ".css"}:
        candidate = f"{stem}{src.suffix.lower()}"
    else:
        candidate = f"{stem}{ext}"

    if candidate not in used:
        used.add(candidate)
        return candidate

    digest = hashlib.md5(src.name.encode("utf-8")).hexdigest()[:8]
    candidate = f"{stem}_{digest}{ext}"
    while candidate in used:
        digest = hashlib.md5((candidate + digest).encode("utf-8")).hexdigest()[:8]
        candidate = f"{stem}_{digest}{ext}"
    used.add(candidate)
    return candidate


def analyze_folder(source_dir: Path) -> list[FileInfo]:
    used_names: set[str] = set()
    results: list[FileInfo] = []

    for src in sorted(source_dir.iterdir()):
        if not src.is_file():
            continue
        mime, ext, category, note = detect_type(src)
        target_name = build_target_name(src, ext, used_names)
        results.append(
            FileInfo(
                source=src.name,
                size=src.stat().st_size,
                mime=mime,
                ext=ext,
                category=category,
                target_name=target_name,
                note=note,
            )
        )
    return results


def organize(source_dir: Path, output_dir: Path, move: bool) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    items = analyze_folder(source_dir)
    actions = []

    for item in items:
        src = source_dir / item.source
        dest_dir = output_dir / item.category
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / item.target_name

        if move:
            shutil.move(str(src), str(dest))
            action = "moved"
        else:
            shutil.copy2(src, dest)
            action = "copied"

        actions.append({**asdict(item), "destination": str(dest), "action": action})

    report = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "source_dir": str(source_dir),
        "output_dir": str(output_dir),
        "mode": "move" if move else "copy",
        "summary": summarize(items),
        "files": actions,
    }

    report_path = output_dir / "organize-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def summarize(items: list[FileInfo]) -> dict[str, int]:
    summary: dict[str, int] = {}
    for item in items:
        key = f"{item.category} ({item.ext})"
        summary[key] = summary.get(key, 0) + 1
    return summary


def print_report(report: dict) -> None:
    print(f"源目录: {report['source_dir']}")
    print(f"输出目录: {report['output_dir']}")
    print(f"模式: {'移动' if report['mode'] == 'move' else '复制'}")
    print("\n分类统计:")
    for key, count in sorted(report["summary"].items()):
        print(f"  - {key}: {count}")

    print("\n文件明细:")
    for item in report["files"]:
        size_kb = round(item["size"] / 1024, 1)
        print(
            f"  [{item['category']}] {item['source']} -> {item['target_name']} "
            f"({size_kb} KB, {item['mime']})"
        )
        if item.get("note"):
            print(f"      说明: {item['note']}")

    print(f"\n报告已保存: {Path(report['output_dir']) / 'organize-report.json'}")


def main() -> None:
    parser = argparse.ArgumentParser(description="识别并整理 PG 缓存文件")
    parser.add_argument(
        "--source",
        default=r"C:\Users\pc\Desktop\麻将胡了1",
        help="待整理的源目录",
    )
    parser.add_argument(
        "--output",
        default="",
        help="输出目录，默认在源目录旁创建“源目录名_已整理”",
    )
    parser.add_argument(
        "--move",
        action="store_true",
        help="移动文件而不是复制（默认复制，更安全）",
    )
    args = parser.parse_args()

    source_dir = Path(args.source)
    if not source_dir.exists():
        raise SystemExit(f"源目录不存在: {source_dir}")

    output_dir = Path(args.output) if args.output else source_dir.parent / f"{source_dir.name}_已整理"
    report = organize(source_dir, output_dir, move=args.move)
    print_report(report)


if __name__ == "__main__":
    main()
