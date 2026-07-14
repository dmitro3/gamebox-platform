#!/usr/bin/env python3
"""根据浏览器导出的资源清单，批量下载 PG 麻将胡了静态资源。"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"
)


def safe_name(name: str) -> str:
    name = name.replace("\\", "/").split("/")[-1]
    return re.sub(r'[<>:"/\\|?*]+', "_", name).strip(" .") or "unnamed"


def guess_ext(url: str, content_type: str | None) -> str:
    path = url.split("?", 1)[0]
    for ext in (".png", ".jpg", ".jpeg", ".webp", ".mp3", ".ogg", ".wav", ".json"):
        if path.lower().endswith(ext):
            return ext
    if not content_type:
        return ".bin"
    mapping = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
        "audio/mpeg": ".mp3",
        "audio/ogg": ".ogg",
        "application/json": ".json",
    }
    return mapping.get(content_type.split(";")[0].strip(), ".bin")


def categorize(url: str, fallback: str = "other") -> str:
    if "/assets/resources/native/" in url:
        return "native"
    if "/assets/resources/import/" in url:
        return "import"
    if "config." in url and url.endswith(".json"):
        return "config"
    if re.search(r"\.(png|jpg|jpeg|webp)$", url, re.I):
        return "images"
    if re.search(r"\.(mp3|ogg|wav)$", url, re.I):
        return "audio"
    if url.endswith(".json"):
        return "json"
    return fallback


def load_urls(manifest_path: Path, only_ok: bool) -> list[dict]:
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    items = data.get("items")
    if isinstance(items, list) and items:
        rows = []
        for item in items:
            if only_ok and not item.get("ok", True):
                continue
            url = item.get("url")
            if url and url.startswith("http"):
                rows.append(item)
        return rows

    urls = data.get("urls")
    if isinstance(urls, list):
        return [{"url": u, "category": categorize(u)} for u in urls if isinstance(u, str)]

    if isinstance(data, list):
        return [
            {"url": u, "category": categorize(u)}
            for u in data
            if isinstance(u, str) and u.startswith("http")
        ]

    raise ValueError("清单格式不支持，需要 items[] 或 urls[]")


def fetch(url: str, timeout: int) -> tuple[bytes, str | None]:
    req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urlopen(req, timeout=timeout) as resp:
        return resp.read(), resp.headers.get("Content-Type")


def build_target(category: str, url: str, ext: str, used: set[str]) -> Path:
    parts = url.split("/")
    if category == "native" and len(parts) >= 2:
        base = f"{parts[-2]}_{safe_name(parts[-1])}"
    else:
        base = safe_name(parts[-1])

    if not base.lower().endswith(ext):
        base += ext

    candidate = f"{category}/{base}"
    if candidate not in used:
        used.add(candidate)
        return Path(candidate)

    stem = Path(base).stem
    idx = 2
    while True:
        candidate = f"{category}/{stem}_{idx}{ext}"
        if candidate not in used:
            used.add(candidate)
            return Path(candidate)
        idx += 1


def download_all(manifest_path: Path, output_dir: Path, delay_ms: int, only_ok: bool, timeout: int) -> dict:
    rows = load_urls(manifest_path, only_ok=only_ok)
    output_dir.mkdir(parents=True, exist_ok=True)
    used: set[str] = set()
    results = []

    for i, row in enumerate(rows, start=1):
        url = row["url"]
        category = row.get("category") or categorize(url)
        try:
            content, content_type = fetch(url, timeout=timeout)
            ext = guess_ext(url, content_type)
            rel = build_target(category, url, ext, used)
            dest = output_dir / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(content)
            results.append(
                {
                    "url": url,
                    "category": category,
                    "path": str(dest),
                    "size": len(content),
                    "ok": True,
                }
            )
            print(f"[{i}/{len(rows)}] OK {rel} ({len(content)} bytes)")
        except (HTTPError, URLError, TimeoutError) as err:
            results.append({"url": url, "category": category, "ok": False, "error": str(err)})
            print(f"[{i}/{len(rows)}] FAIL {url} -> {err}")

        if delay_ms > 0:
            time.sleep(delay_ms / 1000)

    summary = {
        "total": len(rows),
        "ok": sum(1 for r in results if r.get("ok")),
        "fail": sum(1 for r in results if not r.get("ok")),
    }
    report = {
        "manifest": str(manifest_path),
        "output_dir": str(output_dir),
        "summary": summary,
        "files": results,
    }
    (output_dir / "download-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return report


def export_urls_template(path: Path) -> None:
    template = {
        "collectedAt": "",
        "page": "https://www.pgf-nvgais.com/65/index.html",
        "items": [
            {
                "url": "https://www.pgf-nvgais.com/65/assets/resources/config.f413e.json",
                "category": "config",
                "ok": true,
            }
        ],
    }
    path.write_text(json.dumps(template, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="批量下载 PG 游戏静态资源")
    parser.add_argument(
        "--manifest",
        default=r"C:\Users\pc\Desktop\pg-assets-manifest.json",
        help="浏览器导出的 pg-assets-manifest.json",
    )
    parser.add_argument(
        "--output",
        default=r"C:\Users\pc\Desktop\pg-assets-downloaded",
        help="下载输出目录",
    )
    parser.add_argument("--delay-ms", type=int, default=150, help="每个请求间隔")
    parser.add_argument("--timeout", type=int, default=30, help="请求超时秒数")
    parser.add_argument("--include-failed", action="store_true", help="包含 manifest 中 ok=false 的项")
    parser.add_argument("--init-template", action="store_true", help="生成 manifest 模板文件")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if args.init_template:
        export_urls_template(manifest_path)
        print(f"已生成模板: {manifest_path}")
        return

    if not manifest_path.exists():
        raise SystemExit(
            f"找不到清单文件: {manifest_path}\n"
            "请先在游戏页面运行 scripts/collect-pg-assets.js 导出 pg-assets-manifest.json"
        )

    report = download_all(
        manifest_path=manifest_path,
        output_dir=Path(args.output),
        delay_ms=args.delay_ms,
        only_ok=not args.include_failed,
        timeout=args.timeout,
    )
    print("\n下载完成")
    print(f"成功: {report['summary']['ok']}")
    print(f"失败: {report['summary']['fail']}")
    print(f"输出目录: {report['output_dir']}")


if __name__ == "__main__":
    main()
