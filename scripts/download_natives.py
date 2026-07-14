#!/usr/bin/env python3
"""Download native atlas files listed in pg-assets-manifest.json."""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCRAPE = ROOT / "麻将胡了"
HEADERS = {"User-Agent": "Mozilla/5.0"}


def main() -> None:
    manifest = json.loads((SCRAPE / "pg-assets-manifest.json").read_text(encoding="utf-8"))
    downloaded = skipped = failed = 0

    for item in manifest.get("items", []):
        fn = item.get("filename", "")
        if not fn.startswith("native/") or not item.get("ok"):
            continue
        out_name = "native__" + fn.replace("native/", "").replace("/", "_")
        out = SCRAPE / out_name
        if out.is_file() and out.stat().st_size > 100:
            skipped += 1
            continue
        url = item["url"]
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            data = urllib.request.urlopen(req, timeout=30).read()
            out.write_bytes(data)
            downloaded += 1
            print(f"OK {out_name} ({len(data)} bytes)")
        except Exception as exc:
            failed += 1
            print(f"FAIL {out_name}: {exc}")

    print(f"Done: downloaded={downloaded} skipped={skipped} failed={failed}")


if __name__ == "__main__":
    main()
