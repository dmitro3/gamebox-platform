#!/usr/bin/env python3
"""从全部 import__*.json 裁切图集精灵，按 plist/图集分目录存放，并生成缺失报告。"""

from __future__ import annotations

import argparse
import json
import re
import shutil
from collections import defaultdict
from pathlib import Path

from PIL import Image

from pg_atlas_utils import AtlasResolver

ROOT = Path(__file__).resolve().parent
DEFAULT_SCRAPE = ROOT / "麻将胡了"
OUT_ROOT = ROOT.parent / "client-app/public/images/games/mahjong/pg/sprites"
REPORT = ROOT.parent / "client-app/public/images/games/mahjong/pg/sprites-report.json"

SCRAPE: Path = DEFAULT_SCRAPE

SAFE = re.compile(r"[^a-zA-Z0-9._\-]+")


def safe_name(s: str) -> str:
    return SAFE.sub("_", s).strip("_") or "unnamed"


def parse_sprite_frames(text: str) -> list[dict]:
    frames = []
    for m in re.finditer(
        r'\{"name":"([^"]+)","rect":\[(\d+),(\d+),(\d+),(\d+)\][^}]*\}',
        text,
    ):
        chunk = m.group(0)
        frames.append({
            "name": m.group(1),
            "rect": list(map(int, m.groups()[1:5])),
            "rotated": '"rotated":1' in chunk,
        })
    return frames


def plist_names(text: str) -> list[str]:
    return re.findall(r'"([a-zA-Z0-9_]+\.plist)"', text)


def texture_uuid(text: str) -> str | None:
    try:
        data = json.loads(text)
        if isinstance(data, list) and len(data) > 1 and isinstance(data[1], list) and data[1]:
            u = data[1][0]
            return u if isinstance(u, str) else None
    except json.JSONDecodeError:
        pass
    return None


def import_kind(text: str) -> str:
    if "cc.AudioClip" in text:
        return "audio"
    if "cc.SpriteFrame" in text or "_spriteFrames" in text or "SpriteAtlas" in text:
        return "sprite"
    return "other"


def atlas_bounds(frames: list[dict]) -> tuple[int, int]:
    mx = my = 0
    for f in frames:
        x, y, w, h = f["rect"]
        if f["rotated"]:
            w, h = h, w
        mx = max(mx, x + w)
        my = max(my, y + h)
    return mx, my


def find_native_for_frames(frames: list[dict], natives: list[Path]) -> Path | None:
    if not frames:
        return None
    need_w, need_h = atlas_bounds(frames)
    best: tuple[int, int, Path] | None = None
    for p in natives:
        if p.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
            continue
        try:
            with Image.open(p) as im:
                w, h = im.size
        except Exception:
            continue
        if w >= need_w and h >= need_h:
            slack = (w - need_w) + (h - need_h)
            score = slack
            # 尺寸越接近越好
            if best is None or score < best[0]:
                best = (score, w * h, p)
    return best[2] if best else None


def crop(atlas: Image.Image, f: dict) -> Image.Image:
    x, y, w, h = f["rect"]
    tile = atlas.crop((x, y, x + w, y + h))
    if f["rotated"]:
        tile = tile.transpose(Image.Transpose.ROTATE_90)
    return tile


def import_stem(path: Path) -> str:
    return path.name.replace("import__", "").replace(".json", "")


def main() -> None:
    global SCRAPE
    parser = argparse.ArgumentParser()
    parser.add_argument("--scrape-dir", default=str(DEFAULT_SCRAPE))
    parser.add_argument("--out", default=str(OUT_ROOT))
    args = parser.parse_args()
    SCRAPE = Path(args.scrape_dir)
    out_root = Path(args.out)

    if not SCRAPE.exists():
        raise SystemExit(f"找不到: {SCRAPE}")

    if out_root.exists():
        shutil.rmtree(out_root)
    out_root.mkdir(parents=True)

    natives = list(SCRAPE.glob("native__*"))
    image_natives = [p for p in natives if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}]

    extracted: list[dict] = []
    missing_atlas: list[dict] = []
    skipped_audio: list[dict] = []
    skipped_other: list[dict] = []
    duplicate_names: dict[str, list[str]] = defaultdict(list)

    # plist -> set of sprite names expected from imports
    plist_sprites: dict[str, set[str]] = defaultdict(set)

    import_files = sorted(SCRAPE.glob("import__*.json"))
    print(f"扫描 import 文件: {len(import_files)}")

    resolver = AtlasResolver(SCRAPE)

    for imp in import_files:
        text = imp.read_text(encoding="utf-8", errors="ignore")
        kind = import_kind(text)
        stem = import_stem(imp)
        uuid = texture_uuid(text) or ""
        plists = plist_names(text)

        if kind == "audio":
            m = re.search(r'"_name","([^"]+)","_native","([^"]+)"', text)
            skipped_audio.append({
                "import": imp.name,
                "audio": m.group(1) if m else None,
                "ext": m.group(2) if m else None,
            })
            continue

        if kind != "sprite":
            skipped_other.append({"import": imp.name, "kind": kind})
            continue

        frames = parse_sprite_frames(text)
        if not frames:
            skipped_other.append({"import": imp.name, "kind": "sprite-empty"})
            continue

        for pl in plists:
            for f in frames:
                plist_sprites[pl].add(f["name"])

        sprites = resolver.extract_from_import(imp)
        if not sprites:
            missing_atlas.append({
                "import": imp.name,
                "plist": plists,
                "uuid": uuid,
                "frame_count": len(frames),
                "sprites": [f["name"] for f in frames],
                "need_size": atlas_bounds(frames),
                "reason": "no_matching_native_image",
            })
            continue

        nat_key = resolver.native_for_uuid(uuid, frames)
        nat_key_name = nat_key.name if nat_key else "unknown"

        folder = out_root / (safe_name(plists[0].replace(".plist", "")) if plists else f"atlas_{safe_name(stem)}")
        folder.mkdir(parents=True, exist_ok=True)

        for name, tile in sprites.items():
            out_name = safe_name(name) + ".png"
            dest = folder / out_name
            try:
                tile.save(dest)
            except Exception as e:
                missing_atlas.append({
                    "import": imp.name,
                    "sprite": name,
                    "native": nat_key_name,
                    "reason": f"crop_failed:{e}",
                })
                continue

            key = f"{folder.name}/{name}"
            duplicate_names[name].append(key)

            f = next((x for x in frames if x["name"] == name), frames[0])
            extracted.append({
                "sprite": name,
                "plist": plists[0] if plists else None,
                "folder": folder.name,
                "path": f"pg/sprites/{folder.name}/{out_name}",
                "import": imp.name,
                "native": nat_key_name,
                "rect": f["rect"],
                "rotated": f.get("rotated", False),
                "size": list(tile.size),
            })

    # 去重统计：同名精灵出现在多个图集
    dup_report = {k: v for k, v in duplicate_names.items() if len(v) > 1}

    # 已知游戏常用 plist（对照缺什么）
    EXPECTED_PLISTS = [
        "symbols.plist",
        "feature_symbols.plist",
        "bonus_loading.plist",
        "total_win.plist",
        "info_message.plist",
        "setting_menu_locale.plist",
        "big_win.plist",
    ]

    found_plists = sorted(plist_sprites.keys())
    missing_plists = [p for p in EXPECTED_PLISTS if p not in plist_sprites]

    # UI 大图 atlas（无 plist 名）里常见但可能没爬到完整 native 的精灵
    UI_SPRITES_WANT = {
        "btn_minus", "btn_add", "center_autoplay", "btn_turbo_bg", "ic_exit",
        "ic_soundon", "ic_soundoff", "ic_paytable", "ic_rule", "ic_hist",
        "ic_close", "btn_menu", "ic_win", "bg_round_border", "auto_arrow",
        "bg_round_solid", "ic_wallet", "ic_bet",
    }
    extracted_names = {e["sprite"] for e in extracted}
    missing_ui_sprites = sorted(UI_SPRITES_WANT - extracted_names)

    # 整图 native 没有对应 import 裁切（可能是纯背景/封面）
    used_natives = {e["native"] for e in extracted}
    orphan_natives = sorted(
        p.name for p in image_natives if p.name not in used_natives
    )

    # 按文件夹汇总
    by_folder: dict[str, int] = defaultdict(int)
    for e in extracted:
        by_folder[e["folder"]] += 1

    # 整图 native：无 import 裁切或仅作背景，原样保留
    full_dir = out_root / "full-images"
    full_dir.mkdir(parents=True, exist_ok=True)
    copied_full: list[dict] = []
    for p in image_natives:
        if p.name in used_natives:
            continue
        dest = full_dir / p.name.replace("native__", "")
        shutil.copy2(p, dest)
        copied_full.append({
            "native": p.name,
            "path": f"pg/sprites/full-images/{dest.name}",
            "note": "整图未裁切（多为背景/封面/特效序列帧）",
        })

    report = {
        "source": str(SCRAPE),
        "output": str(out_root),
        "summary": {
            "import_files": len(import_files),
            "extracted_sprites": len(extracted),
            "missing_atlas_groups": len(missing_atlas),
            "audio_imports": len(skipped_audio),
            "other_skipped": len(skipped_other),
            "folders": len(by_folder),
            "duplicate_sprite_names": len(dup_report),
            "orphan_native_images": len(orphan_natives),
            "full_images_copied": len(copied_full),
        },
        "by_folder": dict(sorted(by_folder.items())),
        "found_plists": found_plists,
        "missing_plists": missing_plists,
        "missing_ui_sprites": missing_ui_sprites,
        "missing_atlas": missing_atlas,
        "duplicate_sprites": dup_report,
        "orphan_natives": orphan_natives[:80],
        "orphan_natives_total": len(orphan_natives),
        "full_images": copied_full,
        "audio_imports": skipped_audio,
        "sprites": extracted,
    }

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    # 轻量 manifest 供前端浏览
    index_path = out_root / "index.json"
    index_path.write_text(
        json.dumps(
            {
                "total": len(extracted),
                "folders": by_folder,
                "sprites": [
                    {"name": e["sprite"], "folder": e["folder"], "path": e["path"]}
                    for e in extracted
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print("=== 裁切完成 ===")
    print(f"精灵总数: {len(extracted)}")
    print(f"目录数: {len(by_folder)}")
    for folder, cnt in sorted(by_folder.items()):
        print(f"  {folder}: {cnt}")
    print(f"缺失图集组: {len(missing_atlas)}")
    print(f"缺失 plist: {missing_plists}")
    print(f"缺失 UI 精灵名: {len(missing_ui_sprites)} -> {missing_ui_sprites}")
    print(f"未匹配的大图 native: {len(orphan_natives)}（已复制到 full-images/）")
    print(f"报告: {REPORT}")


if __name__ == "__main__":
    main()
