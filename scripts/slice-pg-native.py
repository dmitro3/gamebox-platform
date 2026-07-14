#!/usr/bin/env python3
"""根据 Cocos import JSON + native 图集，裁切 PG 麻将胡了符号 PNG。"""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path

from PIL import Image

# PG 内部名 -> 项目符号 ID
SYMBOL_ALIAS: dict[str, str] = {
    "h_green": "fa",
    "h_red": "zhong",
    "h_white": "bai",
    "h_char_8": "8w",
    "l_ball_5": "5t",
    "l_bamboo_5": "5s",
    "l_ball_2": "2t",
    "l_bamboo_2": "2s",
    "s_wild": "wild",
    "s_scatter": "hu",
}

SKIP_SUFFIXES = ("_blur", "_ingot", "symbol_base_")


def parse_sprite_frames(import_path: Path) -> list[dict]:
    data = json.loads(import_path.read_text(encoding="utf-8"))
    text = import_path.read_text(encoding="utf-8")
    frames: list[dict] = []
    for m in re.finditer(
        r'\{"name":"([^"]+)","rect":\[(\d+),(\d+),(\d+),(\d+)\][^}]*?(?:"rotated":1)?[^}]*\}',
        text,
    ):
        name = m.group(1)
        if any(name.startswith(p) or p in name for p in SKIP_SUFFIXES):
            continue
        if name.endswith("_blur"):
            continue
        x, y, w, h = map(int, m.groups()[1:5])
        rotated = '"rotated":1' in m.group(0)
        frames.append({"name": name, "rect": [x, y, w, h], "rotated": rotated})
    plist = "symbols.plist" if "symbols.plist" in text else ""
    if "feature_symbols.plist" in text:
        plist = "feature_symbols.plist"
    return frames, plist


def crop_frame(atlas: Image.Image, rect: list[int], rotated: bool) -> Image.Image:
    x, y, w, h = rect
    tile = atlas.crop((x, y, x + w, y + h))
    if rotated:
        tile = tile.transpose(Image.Transpose.ROTATE_90)
    return tile


def slice_atlas(
    import_path: Path,
    native_path: Path,
    out_dir: Path,
    size: int = 512,
) -> list[str]:
    frames, plist = parse_sprite_frames(import_path)
    if not frames:
        raise ValueError(f"未在 {import_path.name} 中解析到 SpriteFrame")

    atlas = Image.open(native_path).convert("RGBA")
    out_dir.mkdir(parents=True, exist_ok=True)
    written: list[str] = []

    for frame in frames:
        pg_name = frame["name"]
        alias = SYMBOL_ALIAS.get(pg_name, pg_name)
        tile = crop_frame(atlas, frame["rect"], frame["rotated"])
        if size > 0:
            tile = tile.resize((size, size), Image.Resampling.LANCZOS)
        dest = out_dir / f"{alias}.png"
        tile.save(dest, "PNG")
        written.append(f"{pg_name} -> {dest.name}")

    atlas.save(out_dir / "sheet-source.png", "PNG")
    meta = {
        "plist": plist,
        "import": import_path.name,
        "native": native_path.name,
        "atlas_size": list(atlas.size),
        "sprites": written,
    }
    (out_dir / "slice-meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return written


def main() -> None:
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="裁切 PG native 图集为单张符号")
    parser.add_argument(
        "--scrape-dir",
        default=str(root / "麻将胡了"),
        help="爬取资源目录（扁平或已整理均可）",
    )
    parser.add_argument(
        "--output",
        default=str(
            root.parent
            / "client-app/public/images/games/mahjong/classic/symbols/_variants/pg-official"
        ),
        help="输出目录",
    )
    parser.add_argument("--size", type=int, default=512, help="输出边长，0 表示保持原始尺寸")
    args = parser.parse_args()

    scrape = Path(args.scrape_dir)
    organized = root / "麻将胡了_已整理"

    def pick(imp_flat, nat_flat, imp_org, nat_org, out_sub: str):
        out = Path(args.output) / out_sub
        if (scrape / imp_flat).exists() and (scrape / nat_flat).exists():
            return scrape / imp_flat, scrape / nat_flat, out
        if (organized / imp_org).exists() and (organized / nat_org).exists():
            return organized / imp_org, organized / nat_org, out
        return scrape / imp_flat, scrape / nat_flat, out

    pairs = [
        pick(
            "import__02_02ba035c3.2f82f.json",
            "native__38_3856b7c5-0c59-4514-9770-eb3e800f4e09.a7dd8.png",
            "import/02/02ba035c3.2f82f.json",
            "native/38/3856b7c5-0c59-4514-9770-eb3e800f4e09.a7dd8.png",
            "regular",
        ),
        pick(
            "import__02_025c23820.3d0d0.json",
            "native__a9_a9f0710a-15a5-48b3-8ac6-a5a40a520b1f.5f3fa.png",
            "import/02/025c23820.3d0d0.json",
            "native/a9/a9f0710a-15a5-48b3-8ac6-a5a40a520b1f.5f3fa.png",
            "feature",
        ),
    ]

    for imp, nat, out in pairs:
        if not imp.exists() or not nat.exists():
            print(f"跳过（文件不存在）: {imp.name} + {nat.name}")
            continue
        sprites = slice_atlas(imp, nat, out, size=args.size)
        print(f"\n{imp.name} + {nat.name}")
        for line in sprites:
            print(f"  {line}")
        print(f"  -> {out}")

    merged = Path(args.output) / "all"
    merged.mkdir(parents=True, exist_ok=True)
    for sub in ("regular", "feature"):
        src_dir = Path(args.output) / sub
        if not src_dir.exists():
            continue
        for png in src_dir.glob("*.png"):
            if png.name == "sheet-source.png":
                continue
            shutil.copy2(png, merged / png.name)
    if any(merged.glob("*.png")):
        print(f"\n合并 10 张符号 -> {merged}")


if __name__ == "__main__":
    main()
