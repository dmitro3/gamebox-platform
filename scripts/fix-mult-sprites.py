#!/usr/bin/env python3
"""Re-extract multiplier dark/active sprites from correct atlases and strip white tile fill."""
from __future__ import annotations

import hashlib
import json
import sys
import urllib.request
from pathlib import Path

from pg_atlas_utils import parse_sprite_frames
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = Path(__file__).resolve().parent
UI = ROOT / "client-app/public/images/games/mahjong/pg/ui"
PREVIEW = Path(r"c:\Users\pc\AppData\Local\Temp\cursor\screenshots")

ATLAS_UI = "https://www.pgf-nvgais.com/65/assets/resources/native/67/6737e5a0-4b0b-4887-8c8b-de2915097fa8.f1b49.png"
ATLAS_MULT = "https://www.pgf-nvgais.com/65/assets/resources/native/78/787f8e24-049a-47eb-8b06-6c30aaaf4c8e.0baf3.png"
ATLAS_WAYS = "https://www.pgf-nvgais.com/65/assets/resources/native/f3/f3aabdc9-dfca-49d0-b522-8b49bc20e241.c86b2.png"
HEADERS = {"User-Agent": "Mozilla/5.0", "Referer": "https://www.pgf-nvgais.com/"}


def download(url: str) -> Image.Image:
    cache = SCRIPTS / "runtime-atlas-cache"
    cache.mkdir(exist_ok=True)
    local = cache / f"{hashlib.md5(url.encode()).hexdigest()[:8]}_{url.split('/')[-1]}"
    if not local.exists() or local.stat().st_size < 100:
        req = urllib.request.Request(url, headers=HEADERS)
        local.write_bytes(urllib.request.urlopen(req, timeout=30).read())
    return Image.open(local).convert("RGBA")


def crop(atlas: Image.Image, rect: list[int], rotated: bool = False) -> Image.Image:
    x, y, w, h = rect
    if rotated:
        return atlas.crop((x, y, x + h, y + w)).transpose(Image.Transpose.ROTATE_270)
    return atlas.crop((x, y, x + w, y + h))


def prepare_multiplier_glow(img: Image.Image) -> Image.Image:
    """正版 additive：保留原色 RGB，亮度作 alpha；底行加强以突出横向金线。"""
    arr = np.array(img.convert("RGBA"), dtype=np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    h, w = arr.shape[:2]
    lum = r * 0.299 + g * 0.587 + b * 0.114
    maxc = np.maximum(np.maximum(r, g), b)
    alpha = np.clip(maxc * 1.35 - 10, 0, 255)
    # 暗部透明（模拟 Cocos additive，避免暗红污块）
    alpha[maxc < 12] = 0
    muddy = (lum < 42) & (r > 70) & (g < 48)
    alpha[muddy] = 0
    # 底部金线：越靠下越亮
    row_boost = np.linspace(0.55, 1.45, h, dtype=np.float32)[:, np.newaxis]
    alpha = np.clip(alpha * row_boost, 0, 255)
    arr[:, :, 3] = alpha
    return Image.fromarray(arr.astype(np.uint8))


def strip_black_bg(img: Image.Image) -> Image.Image:
    arr = np.array(img, dtype=np.uint8).copy()
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    # 只去掉纯黑底，保留暗棕刻字边缘（阈值过低会把 x2 笔画吃掉）
    arr[(r < 12) & (g < 12) & (b < 12), 3] = 0
    return Image.fromarray(arr)


def strip_halo(img: Image.Image) -> Image.Image:
    arr = np.array(img, dtype=np.uint8).copy()
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    is_gold = (a > 50) & (r > 110) & (g > 85) & (b < 140) & (r + g > b + 80)
    is_red_halo = (a > 15) & (r > 95) & (g < 85) & (b < 75)
    is_white = (a > 40) & (r > 210) & (g > 210) & (b > 210)
    arr[(is_red_halo | is_white) & ~is_gold, 3] = 0
    return Image.fromarray(arr)


def extract_dark_sprites(_dump_frames: dict, scrape_dir: Path) -> dict[str, Image.Image]:
    """暗刻 ×：import__0b texture_index=0（native 13 小图集），与 Cocos xN_dark 节点一致。"""
    from pg_atlas_utils import AtlasResolver, crop as atlas_crop, parse_sprite_frames, texture_uuids

    imp_path = scrape_dir / "import__0b_0b0136117.63230.json"
    if not imp_path.is_file():
        return {}

    text = imp_path.read_text(encoding="utf-8")
    uuids = texture_uuids(text)
    mult_names = {"x1", "x2", "x3", "x4", "x5", "x6", "x10"}
    by_name: dict[str, dict] = {}
    for f in parse_sprite_frames(text):
        if f["name"] in mult_names and f["texture_index"] == 0:
            by_name[f["name"]] = f

    resolver = AtlasResolver(scrape_dir)
    out: dict[str, Image.Image] = {}
    for name, imf in by_name.items():
        uuid = uuids[imf["texture_index"]]
        native = resolver.native_for_uuid(uuid, [imf])
        if not native:
            print(f"⚠ dark {name} native missing for {uuid}")
            continue
        with Image.open(native) as atlas:
            out[name] = strip_black_bg(atlas_crop(atlas.convert("RGBA"), imf))
    return out


def main() -> None:
    dump = json.loads((SCRIPTS / "pg-cocos-dump.json").read_text(encoding="utf-8"))
    frames = dump["spriteFrames"]

    mult_atlas = download(ATLAS_MULT)
    ways_atlas = download(ATLAS_WAYS)
    scrape_dir = SCRIPTS / "麻将胡了"

    active_rects = {
        "x1": (781, 1, 106, 87),
        "x2": (660, 1, 119, 89),
        "x3": (291, 1, 122, 90),
        "x5": (538, 1, 120, 90),
        "x4": (165, 1, 124, 92),
        "x6": (415, 1, 121, 91),
        "x10": (1, 1, 162, 90),
    }

    dark_imgs = extract_dark_sprites(frames, scrape_dir)

    pairs = [
        ("mult-x1-dark", "x1"),
        ("mult-x2-dark", "x2"),
        ("mult-x3-dark", "x3"),
        ("mult-x5-dark", "x5"),
        ("mult-x4-dark", "x4"),
        ("mult-x6-dark", "x6"),
        ("mult-x10-dark", "x10"),
        ("mult-x1", "x1"),
        ("mult-x2", "x2"),
        ("mult-x3", "x3"),
        ("mult-x5", "x5"),
        ("mult-x4", "x4"),
        ("mult-x6", "x6"),
        ("mult-x10", "x10"),
    ]

    for out, src in pairs:
        if out.endswith("-dark"):
            img = dark_imgs.get(src)
            if img is None:
                print(f"✗ {out} missing")
                continue
        else:
            x, y, w, h = active_rects[src]
            img = strip_halo(mult_atlas.crop((x, y, x + w, y + h)))
        dest = UI / f"{out}.png"
        img.save(dest)
        print(f"✓ {dest.name} {img.size}")

    ways = ways_atlas.crop((0, 0, 442, 62))
    ways.save(UI / "top-title-1024.png")
    ways.save(UI / "ways-label.png")
    print("✓ top-title-1024.png")

    # multiplier_glow 在独立 native 图集
    from pg_atlas_utils import AtlasResolver, crop as atlas_crop, parse_sprite_frames, texture_uuids
    imp_path = SCRIPTS / "麻将胡了" / "import__0b_0b0136117.63230.json"
    if imp_path.is_file():
        imp_text = imp_path.read_text(encoding="utf-8", errors="ignore")
        glow_fr = next((f for f in parse_sprite_frames(imp_text) if f["name"] == "multiplier_glow"), None)
        if glow_fr:
            uuids = texture_uuids(imp_text)
            resolver = AtlasResolver(SCRIPTS / "麻将胡了")
            native = resolver.native_for_uuid(uuids[glow_fr["texture_index"]], [glow_fr])
            if native:
                with Image.open(native) as atlas:
                    glow = prepare_multiplier_glow(atlas_crop(atlas.convert("RGBA"), glow_fr))
                    glow.save(UI / "mult-glow.png")
                    print("✓ mult-glow.png", glow.size, "(additive rgb+alpha)")


if __name__ == "__main__":
    main()
