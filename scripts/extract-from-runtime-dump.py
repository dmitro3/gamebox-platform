#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
"""
从浏览器 scrape-cocos-runtime.js 导出的 pg-cocos-dump.json 精确提取所有精灵帧。

流程：
  1. 读取 pg-cocos-dump.json（放到 scripts/ 目录下）
  2. 下载所有 atlas 图集 PNG（按 URL → 本地缓存，避免重复下载）
  3. 按精确 rect 裁切每一帧，保存到 output/sprites/<atlas_stem>/<name>.png
  4. 输出 sprites-manifest.json：name → path + rect + size 信息
"""

import hashlib
import json
import re
import time
import urllib.request
import urllib.error
from pathlib import Path
from collections import defaultdict

from PIL import Image

ROOT   = Path(__file__).resolve().parent.parent
SCRIPTS = Path(__file__).resolve().parent

DUMP_FILE   = SCRIPTS / "pg-cocos-dump.json"
ATLAS_CACHE = SCRIPTS / "runtime-atlas-cache"      # 下载的原始图集缓存
OUT_DIR     = SCRIPTS / "runtime-sprites"           # 裁切后的精灵输出
MANIFEST    = SCRIPTS / "runtime-sprites-manifest.json"

ATLAS_CACHE.mkdir(exist_ok=True)
OUT_DIR.mkdir(exist_ok=True)


# ────────────────────────────────────────────────────────────────────────────
# 图集下载（带缓存 + 重试）
# ────────────────────────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/125.0.0.0 Safari/537.36",
    "Referer": "https://www.pgf-nvgais.com/",
}


def url_to_local(url: str) -> Path:
    """把 URL 映射为本地缓存路径，保留原始文件名 + 内容 hash 前缀。"""
    fname = url.split("/")[-1].split("?")[0]
    url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
    stem = re.sub(r"[^a-zA-Z0-9._\-]", "_", fname)
    return ATLAS_CACHE / f"{url_hash}_{stem}"


def download_atlas(url: str, retries: int = 3) -> Path | None:
    local = url_to_local(url)
    if local.exists() and local.stat().st_size > 100:
        return local
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
            local.write_bytes(data)
            print(f"  ↓ {url.split('/')[-1]} ({len(data)//1024} KB)")
            return local
        except Exception as e:
            wait = 2 ** attempt
            print(f"  ✗ 下载失败 attempt {attempt+1}/{retries}: {e} (等 {wait}s)")
            time.sleep(wait)
    return None


# ────────────────────────────────────────────────────────────────────────────
# 精灵裁切
# ────────────────────────────────────────────────────────────────────────────

def atlas_stem(url: str) -> str:
    fname = url.split("/")[-1].split("?")[0]
    return re.sub(r"[^a-zA-Z0-9._\-]", "_", fname).replace(".png", "").replace(".jpg", "")


def safe_name(s: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._\-]+", "_", s).strip("_") or "unnamed"


def crop_frame(atlas: Image.Image, rect: list[int], rotated: bool = False) -> Image.Image:
    x, y, w, h = rect
    if rotated:
        # Cocos 旋转精灵：在 atlas 里 w/h 互换存储，裁切时要交换回来
        # 实际在 atlas 里占的区域是 h×w，裁出后旋转 90° 还原为 w×h
        tile = atlas.crop((x, y, x + h, y + w))
        tile = tile.transpose(Image.Transpose.ROTATE_270)
    else:
        tile = atlas.crop((x, y, x + w, y + h))
    return tile


# ────────────────────────────────────────────────────────────────────────────
# 主流程
# ────────────────────────────────────────────────────────────────────────────

def main() -> None:
    if not DUMP_FILE.exists():
        raise SystemExit(
            f"找不到 {DUMP_FILE}\n"
            "请先在游戏页面控制台运行 scrape-cocos-runtime.js，"
            "把下载的 pg-cocos-dump.json 放到 scripts/ 目录。"
        )

    dump = json.loads(DUMP_FILE.read_text(encoding="utf-8"))
    frames   = dump.get("spriteFrames", {})
    textures = dump.get("textures", [])

    print(f"精灵帧: {len(frames)}  图集: {len(textures)}")

    # 1. 按 atlasUrl 分组帧
    by_atlas: dict[str, list[dict]] = defaultdict(list)
    no_atlas: list[dict] = []

    for key, fr in frames.items():
        if fr.get("atlasUrl"):
            by_atlas[fr["atlasUrl"]].append(fr)
        else:
            no_atlas.append(fr)

    print(f"有 atlas 的帧: {sum(len(v) for v in by_atlas.values())}  无 atlas: {len(no_atlas)}")

    # 2. 下载图集 + 裁切
    extracted: list[dict] = []
    failed: list[dict] = []
    atlas_cache_local: dict[str, Path] = {}

    total_atlases = len(by_atlas)
    for ai, (atlas_url, frame_list) in enumerate(by_atlas.items()):
        print(f"\n[{ai+1}/{total_atlases}] 图集: {atlas_url.split('/')[-1]} ({len(frame_list)} 帧)")

        local = download_atlas(atlas_url)
        if not local:
            print(f"  ✗ 无法下载，跳过 {len(frame_list)} 帧")
            for fr in frame_list:
                failed.append({"name": fr.get("name"), "reason": "atlas_download_failed", "url": atlas_url})
            continue

        atlas_cache_local[atlas_url] = local

        try:
            atlas_img = Image.open(local).convert("RGBA")
        except Exception as e:
            print(f"  ✗ 无法打开图集: {e}")
            for fr in frame_list:
                failed.append({"name": fr.get("name"), "reason": f"atlas_open_failed:{e}"})
            continue

        atlas_w, atlas_h = atlas_img.size
        stem = atlas_stem(atlas_url)
        out_folder = OUT_DIR / stem
        out_folder.mkdir(exist_ok=True)

        for fr in frame_list:
            name    = fr.get("name") or "unnamed"
            rect    = fr.get("rect")
            rotated = fr.get("rotated", False)

            if not rect or len(rect) < 4:
                failed.append({"name": name, "reason": "no_rect"})
                continue

            x, y, w, h = rect
            # 边界检查（rotated 时 atlas 里 w/h 已互换，需用 h,w 检查实际占用区域）
            cw, ch = (h, w) if rotated else (w, h)
            if x < 0 or y < 0 or x + cw > atlas_w or y + ch > atlas_h or w <= 0 or h <= 0:
                failed.append({
                    "name": name, "reason": "rect_out_of_bounds",
                    "rect": rect, "atlas_size": [atlas_w, atlas_h],
                })
                continue

            try:
                tile = crop_frame(atlas_img, rect, rotated)
                out_path = out_folder / f"{safe_name(name)}.png"
                tile.save(out_path)
                extracted.append({
                    "name": name,
                    "atlasUrl": atlas_url,
                    "atlasFile": local.name,
                    "rect": rect,
                    "originalSize": fr.get("originalSize"),
                    "offset": fr.get("offset"),
                    "rotated": rotated,
                    "size": list(tile.size),
                    "path": str(out_path.relative_to(ROOT)).replace("\\", "/"),
                    "folder": stem,
                })
            except Exception as e:
                failed.append({"name": name, "reason": f"crop_failed:{e}", "rect": rect})

        atlas_img.close()
        print(f"  ✓ 完成 {stem}")

    # 3. 无 atlas 的帧（记录但不裁切）
    for fr in no_atlas:
        failed.append({"name": fr.get("name"), "reason": "no_atlas_url", "uuid": fr.get("uuid")})

    # 4. 输出 manifest
    manifest = {
        "source": str(DUMP_FILE),
        "summary": {
            "total_frames": len(frames),
            "extracted": len(extracted),
            "failed": len(failed),
            "atlases_downloaded": len(atlas_cache_local),
        },
        "sprites": extracted,
        "failed": failed,
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n{'='*60}")
    print(f"精灵裁切完成")
    print(f"  成功: {len(extracted)}")
    print(f"  失败: {len(failed)}")
    print(f"  输出目录: {OUT_DIR}")
    print(f"  清单: {MANIFEST}")
    print(f"\n下一步: python deploy-from-runtime.py")


if __name__ == "__main__":
    main()
