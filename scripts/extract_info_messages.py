#!/usr/bin/env python3
"""从 info_message 图集按精确坐标裁切 4 条广告文案 PNG（含百搭/胡图标）。"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / "client-app/public/images/games/mahjong/pg/ui"
MANIFEST = ROOT.parent / "client-app/public/images/games/mahjong/pg/manifest.json"

ATLAS_URL = (
    "https://www.pgf-nvgais.com/65/assets/resources/native/f3/"
    "f3aabdc9-dfca-49d0-b522-8b49bc20e241.c86b2.png"
)
ATLAS_LOCAL = ROOT / "atlas_info_message.c86b2.png"

# 与已验证的正版裁切一致（见对话中 atlas 分析）
CROPS = {
    "info2-msg1.png": (1019, 0, 1019 + 434, 62),       # 赢得高达1024路！
    "info2-msg2.png": (1268, 64, 1268 + 724, 148),     # 获得镀金符号…百搭（图标）
    "info2-msg3.png": (340, 62, 1268, 136),            # 3个或更多胡…免费旋转（胡图标）
    "info2-msg4.png": (0, 136, 936, 208),            # 免费旋转：10倍奖金倍数
}

MANIFEST_KEYS = {
    "info2-msg1": "pg/ui/info2-msg1.png",
    "info2-msg2": "pg/ui/info2-msg2.png",
    "info2-msg3": "pg/ui/info2-msg3.png",
    "info2-msg4": "pg/ui/info2-msg4.png",
}


def load_atlas() -> Image.Image:
    candidates = [
        ROOT / "pg_assets" / "texture__info_message__zh__info_message.png",
        ATLAS_LOCAL,
    ]
    sys.path.insert(0, str(ROOT))
    try:
        from pg_atlas_utils import AtlasResolver  # noqa: E402

        nat = AtlasResolver(ROOT / "麻将胡了").native_for_uuid("f3qr3J38pJ0LUii0m8IOJB")
        if nat and nat.is_file():
            candidates.insert(0, nat)
    except Exception:
        pass

    for path in candidates:
        if path.is_file():
            return Image.open(path).convert("RGBA")

    if not ATLAS_LOCAL.is_file():
        req = urllib.request.Request(ATLAS_URL, headers={"User-Agent": "Mozilla/5.0"})
        ATLAS_LOCAL.write_bytes(urllib.request.urlopen(req, timeout=30).read())

    return Image.open(ATLAS_LOCAL).convert("RGBA")


def main() -> None:
    atlas = load_atlas()
    OUT.mkdir(parents=True, exist_ok=True)

    for filename, box in CROPS.items():
        img = atlas.crop(box)
        dest = OUT / filename
        img.save(dest)
        print(f"saved {dest} {img.size}")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest.setdefault("ui", {}).update(MANIFEST_KEYS)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("manifest updated")


if __name__ == "__main__":
    main()
