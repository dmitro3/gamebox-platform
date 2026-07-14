#!/usr/bin/env python3
"""从 spin 图集正确裁切 spin_base / arrow（含 rotated 处理）。"""

from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from pg_atlas_utils import AtlasResolver  # noqa: E402

SPIN_URL = "https://www.pgf-nvgais.com/65/assets/resources/native/2f/2f32ef15-62a7-48a1-a1c6-3f1c2c0ad4f8.d10ff.png"
SPIN_LOCAL = ROOT / "atlas_spin.d10ff.png"
OUT = ROOT.parent / "client-app/public/images/games/mahjong/pg/ui"
SCRAPE = ROOT / "麻将胡了"


def main() -> None:
    if not SPIN_LOCAL.is_file():
        req = urllib.request.Request(SPIN_URL, headers={"User-Agent": "Mozilla/5.0"})
        SPIN_LOCAL.write_bytes(urllib.request.urlopen(req, timeout=20).read())

    resolver = AtlasResolver(SCRAPE)
    mapping = {"spin_base": "btn-spin-frame.png", "arrow": "btn-spin-arrows.png"}
    OUT.mkdir(parents=True, exist_ok=True)
    for sprite, filename in mapping.items():
        img = resolver.extract_sprite(sprite)
        if not img:
            raise SystemExit(f"missing {sprite}")
        dest = OUT / filename
        img.save(dest)
        print(f"saved {dest} {img.size}")


if __name__ == "__main__":
    main()
