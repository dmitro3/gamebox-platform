#!/usr/bin/env python3
"""Cocos 图集裁切工具：按 texture uuid 匹配正确的 native 大图。"""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageChops
UUID_NATIVE_HINTS: dict[str, str] = {
    # spin_button_controller 小圆钮 — 按 import 指定 native（755 uuid 图集爬取损坏）
    "755QemO8VKoYn/j8Mchu8M": "native__75_75e507a6-3bc5-4aa1-89ff-8fc31c86ef0c.f8847.png",
    # feature_symbols.plist（s_wild / s_scatter 百搭、胡字）
    "e3LeWoZ8RAAaV118CL0cC6": "native__a9_a9f0710a-15a5-48b3-8ac6-a5a40a520b1f.5f3fa.png",
    # spin_button_controller 图集（spin_base / arrow / auto_spin）
    "2fMu8VYqdIoaHGPxwsCtT4": "native__2f_2f32ef15-62a7-48a1-a1c6-3f1c2c0ad4f8.d10ff.png",
    # scatter 图集 22480547（scatter_glow_c 圆形底、scatter_bg 等）
    "22SAVHxIRFEaFyWF5tt8gK": "native__22_22480547-c484-4511-a172-585e6db7c80a.bf7c4.jpg",
    # setting_menu 文字标签（自动 / 极速）
    "873OkQSWVMYI2sOjIYfPfk": "native__73_73b542d8-1f8d-49be-9633-2f0866f9d766.82e71.png",
    # info_message.plist（赢得 / 共赢得 / 1024ways 等）
    "f3qr3J38pJ0LUii0m8IOJB": "native__f3_f3aabdc9-dfca-49d0-b522-8b49bc20e241.c86b2.png",
    # bonus_loading.plist 中文版（赢得免费旋转 / 开始）
    "38/78JoC5KbYY1CW6DLhPN": "native__38_38ffbf09-a02e-4a6d-8635-096e832e13cd.2dd2c.png",
    # total_win.plist 中文版（共赢得 / 领取）
    "eaojbPP+REHrgWpeL2Shb/": "native__ea_eaa236cf-3fe4-441e-b816-a5e2f64a16ff.85cc8.png",
    # total_win 背景叠层（e3 / cb / 15 / 3a 图集）
    "e3uHskpbJLJLtU7EaEN09u": "native__e3_e3b87b24-a5b2-4b24-bb54-ec4684374f6e.a429d.jpg",
    "cbcuU54rdBzpys6OfF4EHp": "native__cb_cb72e539-e2b7-41ce-9cac-e8e7c5e041e9.6bbc2.jpg",
    "15nRD8qW9CO6+SDBG9/LrV": "native__15_159d10fc-a96f-423b-af92-0c11bdfcbad5.6dbd6.jpg",
    "3ahkUs6pFILJlHm+hBKPIw": "native__3a_3a86452c-ea91-482c-9947-9be84128f230.76e69.png",
}


def parse_sprite_frames(text: str) -> list[dict]:
    frames = []
    for m in re.finditer(
        r'\{"name":"([^"]+)","rect":\[(\d+),(\d+),(\d+),(\d+)\][^}]*\}',
        text,
    ):
        chunk = m.group(0)
        tex_idx = 0
        tail = text[m.end() : m.end() + 40]
        idx_m = re.search(r"\],\[\d+\],\d+,\[\d+\],\[\d+\],\[\d+\]", tail)
        if idx_m:
            nums = re.findall(r"\[(\d+)\]", idx_m.group(0))
            if nums:
                tex_idx = int(nums[-1])
        frames.append({
            "name": m.group(1),
            "rect": list(map(int, m.groups()[1:5])),
            "rotated": '"rotated":1' in chunk,
            "texture_index": tex_idx,
        })
    return frames


def texture_uuids(text: str) -> list[str]:
    try:
        data = json.loads(text)
        if isinstance(data, list) and len(data) > 1 and isinstance(data[1], list):
            return [u for u in data[1] if isinstance(u, str)]
    except json.JSONDecodeError:
        pass
    return []


def texture_uuid(text: str) -> str | None:
    uuids = texture_uuids(text)
    return uuids[0] if uuids else None


def atlas_bounds(frames: list[dict]) -> tuple[int, int]:
    mx = my = 0
    for f in frames:
        x, y, w, h = f["rect"]
        if f.get("rotated"):
            w, h = h, w
        mx = max(mx, x + w)
        my = max(my, y + h)
    return mx, my


def add_blend_to_rgba(img: Image.Image, black_threshold: int = 8) -> Image.Image:
    """Cocos ADD 混合 JPG 精灵：黑底透明，亮度映射为 alpha。"""
    rgba = img.convert("RGBA")
    r, g, b, _ = rgba.split()
    lum = ImageChops.lighter(ImageChops.lighter(r, g), b)
    rgba.putalpha(lum.point(lambda v: 0 if v <= black_threshold else v))
    return rgba


def crop(atlas: Image.Image, f: dict) -> Image.Image:
    x, y, w, h = f["rect"]
    if f.get("rotated"):
        # Cocos 旋转帧：图集中占 h×w，导出为 w×h
        tile = atlas.crop((x, y, x + h, y + w))
        return tile.transpose(Image.Transpose.ROTATE_90)
    return atlas.crop((x, y, x + w, y + h))


class AtlasResolver:
    def __init__(self, scrape_dir: Path) -> None:
        self.scrape = scrape_dir
        self._natives = sorted(scrape_dir.glob("native__*"))
        self._image_natives = [
            p for p in self._natives if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
        ]
        self._uuid_bounds: dict[str, tuple[int, int]] = {}
        self._import_by_uuid: dict[str, list[Path]] = {}
        self._build_uuid_index()

    def _build_uuid_index(self) -> None:
        for imp in self.scrape.glob("import__*.json"):
            text = imp.read_text(encoding="utf-8", errors="ignore")
            uuids = texture_uuids(text)
            if not uuids:
                continue
            frames = parse_sprite_frames(text)
            if not frames:
                continue
            need = atlas_bounds(frames)
            for u in uuids:
                self._import_by_uuid.setdefault(u, []).append(imp)
                prev = self._uuid_bounds.get(u)
                if prev is None or need[0] > prev[0] or need[1] > prev[1]:
                    self._uuid_bounds[u] = (
                        max(need[0], prev[0] if prev else 0),
                        max(need[1], prev[1] if prev else 0),
                    )

    def native_for_uuid(self, uuid: str, frames: list[dict] | None = None) -> Path | None:
        if uuid in UUID_NATIVE_HINTS:
            hinted = self.scrape / UUID_NATIVE_HINTS[uuid]
            if hinted.is_file():
                if frames:
                    need_w, need_h = atlas_bounds(frames)
                    with Image.open(hinted) as im:
                        if im.size[0] >= need_w and im.size[1] >= need_h:
                            return hinted
                else:
                    return hinted

        need_w, need_h = atlas_bounds(frames) if frames else self._uuid_bounds.get(uuid, (0, 0))
        if need_w == 0 and need_h == 0:
            need_w, need_h = self._uuid_bounds.get(uuid, (1, 1))

        best: tuple[int, int, Path] | None = None
        for p in self._image_natives:
            try:
                with Image.open(p) as im:
                    w, h = im.size
            except Exception:
                continue
            if w >= need_w and h >= need_h:
                slack = (w - need_w) + (h - need_h)
                if best is None or slack < best[0]:
                    best = (slack, w * h, p)

        if best:
            return best[2]

        # 回退：import 与 native 前缀相同（如 75_xxx）
        for imp in self._import_by_uuid.get(uuid, []):
            stem = imp.name.replace("import__", "").split(".")[0]
            prefix = stem.split("_")[0]
            for p in self._image_natives:
                if p.name.startswith(f"native__{prefix}_"):
                    return p
        return None

    def extract_from_import(
        self,
        imp: Path,
        names: set[str] | None = None,
    ) -> dict[str, Image.Image]:
        text = imp.read_text(encoding="utf-8", errors="ignore")
        frames = parse_sprite_frames(text)
        uuids = texture_uuids(text)
        if not frames or not uuids:
            return {}

        out: dict[str, Image.Image] = {}
        by_tex: dict[int, list[dict]] = {}
        for f in frames:
            if names and f["name"] not in names:
                continue
            by_tex.setdefault(f.get("texture_index", 0), []).append(f)

        for tex_idx, group in by_tex.items():
            uuid = uuids[tex_idx] if tex_idx < len(uuids) else uuids[0]
            nat = self.native_for_uuid(uuid, group)
            if not nat:
                continue
            atlas = Image.open(nat).convert("RGBA")
            try:
                for f in group:
                    out[f["name"]] = crop(atlas, f)
            finally:
                atlas.close()
        return out

    def extract_sprite(self, sprite_name: str) -> Image.Image | None:
        for imp in self.scrape.glob("import__*.json"):
            found = self.extract_from_import(imp, {sprite_name})
            if sprite_name in found:
                return found[sprite_name]
        return None

    def plist_name(self, text: str) -> str | None:
        m = re.search(r'"([a-zA-Z0-9_]+\.plist)"', text)
        return m.group(1) if m else None

    def find_import_by_plist(self, name: str) -> Path | None:
        needle = f'"{name}"'
        hits = []
        for p in self.scrape.glob("import__*.json"):
            t = p.read_text(encoding="utf-8", errors="ignore")
            if needle in t and "_spriteFrames" in t:
                hits.append(p)
        return max(hits, key=lambda p: p.stat().st_size) if hits else None
