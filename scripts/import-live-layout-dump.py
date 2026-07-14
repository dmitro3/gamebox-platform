#!/usr/bin/env python3
"""把控制台复制的 live dump 转成标准 JSON 文件。"""
from __future__ import annotations

import json
import sys
from pathlib import Path

SRC = Path(r"C:\Users\pc\Desktop\gamebox-platformscriptslive-layout-dump-captain.json")
DEST = Path(__file__).parent / "live-layout-dump-captain.json"


def normalize(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("'") and text.endswith("'"):
        text = text[1:-1].encode("utf-8").decode("unicode_escape")
    elif text.startswith('"') and text.endswith('"'):
        text = json.loads(text)
    return json.loads(text)


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC
    dest = Path(sys.argv[2]) if len(sys.argv) > 2 else DEST
    data = normalize(src.read_text(encoding="utf-8"))
    dest.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"page: {data.get('page', '')[:90]}...")
    print(f"design: {data.get('design')}")
    print(f"nodes: {len(data.get('nodes', {}))}")
    print(f"-> {dest}")


if __name__ == "__main__":
    main()
