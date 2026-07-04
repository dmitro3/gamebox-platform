#!/usr/bin/env python3
"""从 225 爬取资源裁切图集并部署；仅使用存在的素材。"""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path

from PIL import Image

from pg_atlas_utils import AtlasResolver, add_blend_to_rgba, crop, parse_sprite_frames

ROOT = Path(__file__).resolve().parent
DEFAULT_SCRAPE = ROOT / "麻将胡了"
PG = ROOT.parent / "client-app/public/images/games/mahjong/pg"
SYMBOLS_OUT = ROOT.parent / "client-app/public/images/games/mahjong/classic/symbols"
GOLDEN_OUT = ROOT.parent / "client-app/public/images/games/mahjong/classic/symbols-golden"

SCRAPE: Path = DEFAULT_SCRAPE

SYMBOL_ALIAS = {
    "h_green": "fa", "h_red": "zhong", "h_white": "bai", "h_char_8": "8w",
    "l_ball_5": "5t", "l_bamboo_5": "5s", "l_ball_2": "2t", "l_bamboo_2": "2s",
    "s_wild": "wild", "s_scatter": "hu",
}
PAY_PG = ("h_green", "h_red", "h_white", "h_char_8", "l_ball_5", "l_bamboo_5", "l_ball_2", "l_bamboo_2")

# PG sprite名 -> 游戏 manifest key
UI_SPRITE_MAP: dict[str, str] = {
    "btn_turbo_bg": "btn-turbo-bg",
    "center_turbo_off": "btn-turbo",
    "center_turbo_on": "btn-turbo-on",
    "ic_exit": "btn-exit",
    "ic_soundon": "btn-sound-on",
    "ic_soundoff": "btn-sound-off",
    "ic_paytable": "btn-paytable",
    "ic_rule": "btn-rules",
    "ic_hist": "btn-history",
    "ic_close": "btn-back",
    "btn_menu": "icon-menu",
    "ic_win": "icon-win",
    "ic_wallet_new": "icon-wallet",
    "ic_chip": "icon-bet",
    "1024ways": "top-title-1024",
    "bw": "big-win-bw",
    "mw": "big-win-mw",
    "smw": "big-win-smw",
}

# 分散在其它 import 文件中的 UI 精灵
EXTRA_UI_SPRITES: dict[str, str] = {
    "spin_base": "btn-spin-frame",
    "arrow": "btn-spin-arrows",
    "auto_spin": "btn-spin-count",
}

# 手工验证 native（import 内 uuid 索引 → 大图）
VERIFIED_NATIVE: dict[str, Path] = {
    "import__0d_0db702c18.4cf1c.json": SCRAPE / "native__67_6737e5a0-4b0b-4887-8c8b-de2915097fa8.f1b49.png",
    "import__0b_0b0136117.63230.json": SCRAPE / "native__67_6737e5a0-4b0b-4887-8c8b-de2915097fa8.f1b49.png",
    "import__04_0491c2e84.148c4.json": SCRAPE / "native__73_73b542d8-1f8d-49be-9633-2f0866f9d766.82e71.png",
}
REEL_GREEN_NATIVE: Path | None = None
for stem in (
    "native__02_02186b2c-cd37-4300-9a31-0688800f79dc.8ee8b.jpg",
    "native__02_02186b2c-cd37-4300-9a31-0688800f79dc.8ee8b.png",
):
    p = SCRAPE / stem
    if p.is_file():
        REEL_GREEN_NATIVE = p
        break

# 正版分层 UI — 必须指定 import，避免 AtlasResolver 匹配到错误 native 图集
LAYER_BY_IMPORT: dict[str, dict[str, str]] = {
    "import__0d_0db702c18.4cf1c.json": {
        "reel_a": "reel-green",
        "main_bottom_a": "bottom-wood",
    },
    "import__0b_0b0136117.63230.json": {
        "main_top_c": "multiplier-bar-bg",
        "main_top_b": "top-bar-orange",
        "bonus_top_b": "multiplier-bar-bg-free",
        "x1": "mult-x1",
        "x2": "mult-x2",
        "x3": "mult-x3",
        "x4": "mult-x4",
        "x5": "mult-x5",
        "x6": "mult-x6",
        "x10": "mult-x10",
    },
}
# main_top_a 是 247px 宽竖条装饰，不是全屏红云纹，主界面不单独铺

PLIST_UI_SPRITES: dict[str, dict[str, str]] = {
    "info_message.plist": {"1024ways": "top-title-1024"},
    "setting_menu_locale.plist": {
        "ic_win": "icon-win", "ic_hist": "btn-history",
        "txt_auto": "label-auto", "txt_turbo_on": "label-turbo-on", "txt_turbo_off": "label-turbo-off",
    },
    "big_win.plist": {"bw": "big-win-bw", "mw": "big-win-mw", "smw": "big-win-smw"},
}

# 免费旋转触发：必须用中文版 import（import__0a 为英文）
BONUS_LOADING_ZH_IMPORT = "import__01_014aab3a8.d3275.json"
FS_TRIGGER_SPRITES: dict[str, str] = {
    "freespin_won": "fs-trigger-title",
    "freature_loading": "fs-trigger-subtitle",
    "start": "btn-start",
    "start_pressed": "btn-start-pressed",
}
FS_TRIGGER_BG_SPRITES: dict[str, str] = {
    "bonus_transition_d": "fs-trigger-bg-gradient",
    "bonus_transition_a": "fs-trigger-bg-rays",
    "bonus_transition_b": "fs-trigger-bg-tiles",
    "bonus_transition_c": "fs-trigger-bg-coins",
    "bonus_button": "fs-trigger-btn-bg",
}

# 免费旋转结束：中文版 total_win.plist
TOTAL_WIN_ZH_IMPORT = "import__01_01beca5b1.473b7.json"
FS_END_SPRITES: dict[str, str] = {
    "totalwin": "fs-end-title",
    "collect": "fs-end-collect",
    "collect_pressed": "fs-end-collect-pressed",
}
FS_END_BG_SPRITES: dict[str, str] = {
    "total_bg": "fs-end-bg-total",
    "total_glow_a_01": "fs-end-bg-glow-top",
    "total_glow_b": "fs-end-bg-glow-bottom",
    "info_flare_a": "fs-end-bg-flare",
    "total_fg": "fs-end-bg-fg",
}
FS_END_BG_IMPORT = "import__06_06ab31cf7.27bdd.json"
FS_END_FLARE_IMPORT = "import__07_0728dc570.ab99b.json"
FS_END_BLEND_SPRITES = frozenset({"total_glow_a_01", "total_glow_b", "info_flare_a"})

OUT_SIZE = 512
RESOLVER: AtlasResolver | None = None


def compose_tile(base: Image.Image, sym: Image.Image) -> Image.Image:
    canvas = base.copy()
    canvas.alpha_composite(sym, ((canvas.width - sym.width) // 2, (canvas.height - sym.height) // 2))
    return canvas


def compose_tile_origin(base: Image.Image, sym: Image.Image) -> Image.Image:
    """同尺寸精灵按原点叠放（百搭/胡 overlay 已含牌面布局）"""
    canvas = base.copy()
    if sym.size != canvas.size:
        sym = sym.resize(canvas.size, Image.Resampling.LANCZOS)
    canvas.alpha_composite(sym, (0, 0))
    return canvas


def pick_sprite_frames(text: str, names: set[str]) -> dict[str, dict]:
    """同名精灵取 texture_index 最小者（避免 x1 被错误纹理覆盖）"""
    picked: dict[str, dict] = {}
    for f in parse_sprite_frames(text):
        if f["name"] not in names:
            continue
        prev = picked.get(f["name"])
        if prev is None or f.get("texture_index", 0) < prev.get("texture_index", 0):
            picked[f["name"]] = f
    return picked


TILE_W, TILE_H = 162, 190


def clean_add_glow(img: Image.Image, lum_min: int = 110, alpha_min: int = 50) -> Image.Image:
    """去掉 ADD 光晕/纹章在绿毡上的半透明暗边（否则会形成矩形遮罩）。"""
    import numpy as np

    arr = np.array(img.convert("RGBA"))
    lum = arr[:, :, :3].max(axis=2)
    bad = (arr[:, :, 3] < alpha_min) | (lum < lum_min)
    arr[bad] = (0, 0, 0, 0)
    return Image.fromarray(arr)


def strip_red_halo(img: Image.Image) -> Image.Image:
    """scatter_bg 正版纹章：保留金黄线（约 RGB 255,230,139），去掉外层红橙光晕。"""
    import numpy as np

    arr = np.array(img.convert("RGBA"))
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    is_red = (a > 0) & (r > g + 22) & (g < 130)
    keep = (a > 0) & ~is_red & ((r > 45) | (g > 40))
    arr[~keep] = (0, 0, 0, 0)
    return Image.fromarray(arr)


def clean_symbol_fringe(img: Image.Image, alpha_min: int = 50) -> Image.Image:
    """去掉精灵图集边缘极低 alpha 的矩形外框。"""
    import numpy as np

    arr = np.array(img.convert("RGBA"))
    arr[arr[:, :, 3] < alpha_min] = (0, 0, 0, 0)
    return Image.fromarray(arr)


def add_composite_at(canvas: Image.Image, src: Image.Image, x: int, y: int) -> Image.Image:
    """Cocos ADD 混合：黑底透明，亮色叠加（比 alpha_over 更少暗边）。"""
    import numpy as np

    out = np.array(canvas.convert("RGBA"), dtype=np.float32)
    s = np.array(src.convert("RGBA"), dtype=np.float32)
    sw, sh = s.shape[1], s.shape[0]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(out.shape[1], x + sw), min(out.shape[0], y + sh)
    sx0, sy0 = x0 - x, y0 - y
    sx1, sy1 = sx0 + (x1 - x0), sy0 + (y1 - y0)
    if x1 <= x0 or y1 <= y0:
        return canvas
    dst = out[y0:y1, x0:x1]
    src_slice = s[sy0:sy1, sx0:sx1]
    sa = src_slice[:, :, 3:4] / 255.0
    dst[:, :, :3] = np.minimum(255.0, dst[:, :, :3] + src_slice[:, :, :3] * sa)
    dst[:, :, 3:4] = np.maximum(dst[:, :, 3:4], src_slice[:, :, 3:4])
    out[y0:y1, x0:x1] = dst
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def place_add_effect_sprite(
    sprite: Image.Image,
    scale: float,
    cy_ratio: float = 0.50,
) -> Image.Image:
    """将 ADD 混合特效精灵居中放入牌面格（仅光晕/纹章层，不含胡字）。"""
    canvas = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
    nw = max(1, round(sprite.width * scale))
    nh = max(1, round(sprite.height * scale))
    scaled = sprite.resize((nw, nh), Image.Resampling.LANCZOS)
    cx, cy = TILE_W / 2, TILE_H * cy_ratio
    return add_composite_at(canvas, scaled, round(cx - nw / 2), round(cy - nh / 2))


def build_hu_emblem(scatter_bg: Image.Image) -> Image.Image:
    """正版 scatter_bg 纹章：仅金黄图案，不含 scatter_glow_a 光晕。"""
    return place_add_effect_sprite(strip_red_halo(scatter_bg), 0.96)


def fit_scatter_bg(bg: Image.Image) -> Image.Image:
    """兼容旧调用：仅 scatter_bg 时仍走 build_hu_emblem。"""
    return build_hu_emblem(bg)


def fit_hu_glow_bg(bg: Image.Image) -> Image.Image:
    """scatter_glow_c 整体圆形底：Cocos 子节点 scale 约 2.5×4，居中叠入牌面格"""
    canvas = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
    nw = max(1, round(bg.width * 2.5))
    nh = max(1, round(bg.height * 4))
    scaled = bg.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.alpha_composite(scaled, ((TILE_W - nw) // 2, (TILE_H - nh) // 2))
    return canvas


def normalize_tile(img: Image.Image) -> Image.Image:
    """保持正版 162×190 满格，不再塞进 512 方形画布。"""
    rgba = img.convert("RGBA")
    if rgba.size == (TILE_W, TILE_H):
        return rgba
    return rgba.resize((TILE_W, TILE_H), Image.Resampling.LANCZOS)


def save_symbol(img: Image.Image, alias: str, manifest: dict) -> None:
    out = normalize_tile(img)
    SYMBOLS_OUT.mkdir(parents=True, exist_ok=True)
    GOLDEN_OUT.mkdir(parents=True, exist_ok=True)
    (PG / "symbols").mkdir(parents=True, exist_ok=True)
    (PG / "ui").mkdir(parents=True, exist_ok=True)
    out.save(SYMBOLS_OUT / f"{alias}.png")
    out.save(PG / "symbols" / f"{alias}.png")
    out.save(PG / "ui" / f"symbol-{alias}.png")
    manifest["symbols"][alias] = f"pg/symbols/{alias}.png"


def clear_outputs() -> None:
    """只清空会重新生成的符号目录，保留 pg/ui 里手工/增量素材。"""
    PG.mkdir(parents=True, exist_ok=True)
    (PG / "ui").mkdir(parents=True, exist_ok=True)
    (PG / "sprites").mkdir(parents=True, exist_ok=True)
    (PG / "symbols").mkdir(parents=True, exist_ok=True)
    (PG / "symbols-golden").mkdir(parents=True, exist_ok=True)

    for folder in (SYMBOLS_OUT, GOLDEN_OUT, PG / "symbols", PG / "symbols-golden"):
        if folder.is_dir():
            for png in folder.glob("*.png"):
                png.unlink()

    for png in (PG / "ui").glob("symbol-*.png"):
        png.unlink()


def deploy_symbols(manifest: dict) -> None:
    assert RESOLVER is not None
    imp = RESOLVER.find_import_by_plist("symbols.plist")
    feat = RESOLVER.find_import_by_plist("feature_symbols.plist")
    if not imp:
        raise SystemExit("缺少 symbols.plist")
    regular = RESOLVER.extract_from_import(imp)
    feature = RESOLVER.extract_from_import(feat, {"s_wild", "s_scatter"}) if feat else {}

    white_base = regular.get("symbol_base_white")
    gold_base = regular.get("symbol_base_gold")
    if not white_base:
        raise SystemExit("缺少 symbol_base_white")

    for pg_name, alias in SYMBOL_ALIAS.items():
        if pg_name in ("s_wild", "s_scatter"):
            continue
        sym = regular.get(pg_name)
        if not sym:
            continue
        save_symbol(compose_tile(white_base, sym), alias, manifest)

    wild_sym = feature.get("s_wild")
    ingot_base = regular.get("symbol_base_ingot")
    if wild_sym and ingot_base:
        ingot_base.save(PG / "symbols" / "wild-ingot.png")
        wild_sym.save(PG / "symbols" / "wild-overlay.png")
        manifest["symbols"]["wild-ingot"] = "pg/symbols/wild-ingot.png"
        manifest["symbols"]["wild-overlay"] = "pg/symbols/wild-overlay.png"
        save_symbol(compose_tile_origin(ingot_base, wild_sym), "wild", manifest)

    scatter_sym = feature.get("s_scatter")
    scatter_bg_raw = RESOLVER.extract_sprite("scatter_bg")
    scatter_bg = add_blend_to_rgba(scatter_bg_raw, black_threshold=25) if scatter_bg_raw else None
    if scatter_sym:
        scatter_sym = clean_symbol_fringe(scatter_sym)
        scatter_sym.save(PG / "symbols" / "hu-overlay.png")
        manifest["symbols"]["hu-overlay"] = "pg/symbols/hu-overlay.png"
        hu_canvas = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
        if scatter_bg:
            hu_emblem = build_hu_emblem(scatter_bg)
            hu_emblem.save(PG / "symbols" / "hu-emblem.png")
            hu_emblem.save(SYMBOLS_OUT / "hu-emblem.png")
            manifest["symbols"]["hu-emblem"] = "pg/symbols/hu-emblem.png"
            hu_canvas = compose_tile_origin(hu_canvas, hu_emblem)
        # hu.png = 纹章+胡字（无光晕）；牌面光晕由 CSS .hu-scatter-glow 单独叠加
        save_symbol(clean_symbol_fringe(compose_tile_origin(hu_canvas, scatter_sym)), "hu", manifest)
        stale = PG / "symbols" / "hu-pattern.png"
        if stale.is_file():
            stale.unlink()
        manifest["symbols"].pop("hu-pattern", None)
        stale_hu_bg = PG / "symbols" / "hu-bg.png"
        if stale_hu_bg.is_file():
            stale_hu_bg.unlink()
        manifest["symbols"].pop("hu-bg", None)

    if gold_base:
        (PG / "symbols-golden").mkdir(parents=True, exist_ok=True)
        for pg_name in PAY_PG:
            sym = regular.get(pg_name)
            if not sym:
                continue
            alias = SYMBOL_ALIAS[pg_name]
            out = normalize_tile(compose_tile(gold_base, sym))
            out.save(GOLDEN_OUT / f"{alias}.png")
            out.save(PG / "symbols-golden" / f"{alias}.png")
            manifest["symbols_golden"][alias] = f"pg/symbols-golden/{alias}.png"
        wild_src = PG / "symbols" / "wild.png"
        if wild_src.exists():
            shutil.copy2(wild_src, GOLDEN_OUT / "wild.png")
            shutil.copy2(wild_src, PG / "symbols-golden" / "wild.png")
            manifest["symbols_golden"]["wild"] = "pg/symbols-golden/wild.png"
        if scatter_sym:
            hu_golden = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
            if scatter_bg:
                hu_golden = compose_tile_origin(hu_golden, build_hu_emblem(scatter_bg))
            hu_golden = normalize_tile(clean_symbol_fringe(compose_tile_origin(hu_golden, scatter_sym)))
            hu_golden.save(GOLDEN_OUT / "hu.png")
            hu_golden.save(PG / "symbols-golden" / "hu.png")
            manifest["symbols_golden"]["hu"] = "pg/symbols-golden/hu.png"


def save_ui_sprite(img: Image.Image, key: str, manifest: dict) -> None:
    dest = PG / "ui" / f"{key}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest)
    manifest["ui"][key] = f"pg/ui/{key}.png"


def deploy_fs_trigger_ui(manifest: dict) -> None:
    """免费旋转触发屏：中文 bonus_loading + 全屏 transition 叠层。"""
    assert RESOLVER is not None
    imp = SCRAPE / BONUS_LOADING_ZH_IMPORT
    if imp.is_file():
        sprites = RESOLVER.extract_from_import(imp, set(FS_TRIGGER_SPRITES.keys()))
        for sprite_name, key in FS_TRIGGER_SPRITES.items():
            img = sprites.get(sprite_name)
            if img:
                save_ui_sprite(img, key, manifest)
                print(f"  [fs-trigger] {key} <- {sprite_name} (zh)")
    else:
        print(f"  [fs-trigger] 缺少 {BONUS_LOADING_ZH_IMPORT}")

    for sprite_name, key in FS_TRIGGER_BG_SPRITES.items():
        img = RESOLVER.extract_sprite(sprite_name)
        if not img:
            print(f"  [fs-trigger] 未找到 {sprite_name}")
            continue
        if sprite_name in ("bonus_transition_a",):
            img = add_blend_to_rgba(img)
        save_ui_sprite(img, key, manifest)
        print(f"  [fs-trigger] {key} <- {sprite_name}")

    stale = PG / "ui" / "fs-trigger-panel-bg.png"
    if stale.is_file():
        stale.unlink()
    manifest["ui"].pop("fs-trigger-panel-bg", None)


def deploy_fs_end_ui(manifest: dict) -> None:
    """免费旋转结束屏：中文 total_win + 全屏 total 背景叠层。"""
    assert RESOLVER is not None
    imp = SCRAPE / TOTAL_WIN_ZH_IMPORT
    if imp.is_file():
        sprites = RESOLVER.extract_from_import(imp, set(FS_END_SPRITES.keys()))
        for sprite_name, key in FS_END_SPRITES.items():
            img = sprites.get(sprite_name)
            if img:
                save_ui_sprite(img, key, manifest)
                print(f"  [fs-end] {key} <- {sprite_name} (zh)")
    else:
        print(f"  [fs-end] 缺少 {TOTAL_WIN_ZH_IMPORT}")

    bg_specs: list[tuple[str, set[str]]] = [
        (FS_END_BG_IMPORT, set(FS_END_BG_SPRITES.keys()) - {"info_flare_a"}),
        (FS_END_FLARE_IMPORT, {"info_flare_a"}),
    ]
    for imp_name, sprite_names in bg_specs:
        imp = SCRAPE / imp_name
        if not imp.is_file():
            print(f"  [fs-end] 缺少 {imp_name}")
            continue
        sprites = RESOLVER.extract_from_import(imp, sprite_names)
        for sprite_name in sprite_names:
            key = FS_END_BG_SPRITES[sprite_name]
            img = sprites.get(sprite_name)
            if not img:
                print(f"  [fs-end] 未找到 {sprite_name} ({imp_name})")
                continue
            if sprite_name in FS_END_BLEND_SPRITES:
                img = add_blend_to_rgba(img)
            if sprite_name == "total_bg":
                # 裁掉左右 1px 黄边与底部过亮条带（cover 时会在屏底两角露出）
                w, h = img.size
                trim_x = max(1, min(3, w // 80))
                trim_bottom = max(1, int(h * 0.06))
                img = img.crop((trim_x, 0, w - trim_x, h - trim_bottom))
            save_ui_sprite(img, key, manifest)
            print(f"  [fs-end] {key} <- {sprite_name} ({imp_name})")

    stale = PG / "ui" / "fs-end-panel-bg.png"
    if stale.is_file():
        stale.unlink()
    manifest["ui"].pop("fs-end-panel-bg", None)
    stale_main = PG / "ui" / "fs-end-bg-main.png"
    if stale_main.is_file():
        stale_main.unlink()
    manifest["ui"].pop("fs-end-bg-main", None)
    stale_grad = PG / "ui" / "fs-end-bg-gradient.png"
    if stale_grad.is_file():
        stale_grad.unlink()
    manifest["ui"].pop("fs-end-bg-gradient", None)


def deploy_button_ui(manifest: dict) -> None:
    """小圆钮：auto/turbo/minus/plus 按 import 裁切正确 native。"""
    assert RESOLVER is not None
    nat75 = SCRAPE / "native__75_75e507a6-3bc5-4aa1-89ff-8fc31c86ef0c.f8847.png"
    nat2f = SCRAPE / "native__2f_2f32ef15-62a7-48a1-a1c6-3f1c2c0ad4f8.d10ff.png"
    specs: list[tuple[Path, str, dict[str, str]]] = [
        (nat2f, "import__01_017be2b58.105bc.json", {"center_autoplay": "btn-auto", "auto_arrow": "btn-auto-arrow"}),
        (nat75, "import__b2_b27b4d5a-660b-4efa-8cee-bfb5d5474be0.4482f.json", {"btn_minus": "btn-minus"}),
        (nat75, "import__f1_f1a769c6-dc02-4449-8a7d-fe71d099236e.d4a7b.json", {"btn_add": "btn-plus"}),
        (nat2f, "import__08_081c330e2.31869.json", {"btn_turbo_bg": "btn-turbo-bg"}),
        (nat75, "import__07_0734a42bd.baf1c.json", {"center_turbo_off": "btn-turbo", "center_turbo_on": "btn-turbo-on"}),
    ]
    for native, imp_name, mapping in specs:
        imp = SCRAPE / imp_name
        if not imp.is_file() or not native.is_file():
            continue
        frames = pick_sprite_frames(imp.read_text(encoding="utf-8", errors="ignore"), set(mapping.keys()))
        with Image.open(native) as atlas:
            atlas = atlas.convert("RGBA")
            for sprite_name, key in mapping.items():
                frame = frames.get(sprite_name)
                if not frame:
                    continue
                img = crop(atlas, frame)
                dest = PG / "ui" / f"{key}.png"
                img.save(dest)
                manifest["ui"][key] = f"pg/ui/{key}.png"
                print(f"  [btn] {key} <- {sprite_name} ({native.name[:20]})")

    # auto/turbo 小圆底：用 spin_base 缩放到 90px（图集坐标损坏时的可靠回退）
    spin_base = RESOLVER.extract_sprite("spin_base")
    if spin_base:
        small = spin_base.resize((90, 90), Image.Resampling.LANCZOS)
        for key in ("btn-auto", "btn-turbo-bg"):
            dest = PG / "ui" / f"{key}.png"
            small.save(dest)
            manifest["ui"][key] = f"pg/ui/{key}.png"
            print(f"  [btn] {key} <- spin_base (90px)")


def deploy_ui_sprites(manifest: dict) -> None:
    assert RESOLVER is not None

    deploy_button_ui(manifest)
    deploy_fs_trigger_ui(manifest)
    deploy_fs_end_ui(manifest)

    for pg_name, key in UI_SPRITE_MAP.items():
        img = RESOLVER.extract_sprite(pg_name)
        if not img:
            continue
        dest = PG / "ui" / f"{key}.png"
        img.save(dest)
        manifest["ui"][key] = f"pg/ui/{key}.png"

    for plist, mapping in PLIST_UI_SPRITES.items():
        imp = RESOLVER.find_import_by_plist(plist)
        if not imp:
            continue
        sprites = RESOLVER.extract_from_import(imp, set(mapping.keys()))
        for sprite_name, key in mapping.items():
            img = sprites.get(sprite_name)
            if not img:
                continue
            dest = PG / "ui" / f"{key}.png"
            img.save(dest)
            manifest["ui"][key] = f"pg/ui/{key}.png"

    for sprite_name, key in EXTRA_UI_SPRITES.items():
        img = RESOLVER.extract_sprite(sprite_name)
        if not img:
            continue
        dest = PG / "ui" / f"{key}.png"
        img.save(dest)
        manifest["ui"][key] = f"pg/ui/{key}.png"

    for imp_name, mapping in LAYER_BY_IMPORT.items():
        imp = SCRAPE / imp_name
        if not imp.is_file():
            print(f"  [layer] 缺少 import: {imp_name}")
            continue
        text = imp.read_text(encoding="utf-8", errors="ignore")
        mult_keys = {k for k, v in mapping.items() if k.startswith("x") and v.startswith("mult-x")}
        layer_keys = {k: v for k, v in mapping.items() if k not in mult_keys}

        # 倍数精灵须走 AtlasResolver（多纹理 uuid），不能硬裁 native__67
        if mult_keys:
            mult_map = {k: mapping[k] for k in mult_keys}
            mult_sprites = RESOLVER.extract_from_import(imp, set(mult_map.keys()))
            for sprite_name, key in mult_map.items():
                img = mult_sprites.get(sprite_name)
                if not img:
                    print(f"  [layer] 未找到: {sprite_name} ({imp_name})")
                    continue
                dest = PG / "ui" / f"{key}.png"
                img.save(dest)
                manifest["ui"][key] = f"pg/ui/{key}.png"
                print(f"  [layer] {key} <- {sprite_name}")

        if not layer_keys:
            continue

        frames = pick_sprite_frames(text, set(layer_keys))
        native = VERIFIED_NATIVE.get(imp_name)
        if not native or not native.is_file():
            sprites = RESOLVER.extract_from_import(imp, set(layer_keys.keys()))
        else:
            sprites = {}
            with Image.open(native) as atlas:
                atlas = atlas.convert("RGBA")
                for sprite_name, frame in frames.items():
                    sprites[sprite_name] = crop(atlas, frame)
        if REEL_GREEN_NATIVE and "reel_a" in layer_keys:
            text0d = (SCRAPE / "import__0d_0db702c18.4cf1c.json").read_text(encoding="utf-8", errors="ignore")
            f_reel = next((f for f in parse_sprite_frames(text0d) if f["name"] == "reel_a"), None)
            if f_reel:
                with Image.open(REEL_GREEN_NATIVE) as atlas:
                    sprites["reel_a"] = crop(atlas.convert("RGBA"), f_reel)

        for sprite_name, key in layer_keys.items():
            img = sprites.get(sprite_name)
            if not img:
                print(f"  [layer] 未找到: {sprite_name} ({imp_name})")
                continue
            if key == "multiplier-bar-bg" and img.width < img.height:
                img = img.transpose(Image.Transpose.ROTATE_270)
            dest = PG / "ui" / f"{key}.png"
            img.save(dest)
            manifest["ui"][key] = f"pg/ui/{key}.png"
            print(f"  [layer] {key} <- {sprite_name}")
        if sprites.get("reel_a"):
            sprites["reel_a"].save(PG / "ui" / "reel-frame.png")
            manifest["ui"]["reel-frame"] = "pg/ui/reel-frame.png"

    # btn-frame 与 spin 框同图（正版 spin_base）
    # turbo 底与 auto 底同为绿色圆钮；复制一份供 turbo 使用
    auto_bg = PG / "ui" / "btn-auto.png"
    turbo_bg = PG / "ui" / "btn-turbo-bg.png"
    if auto_bg.is_file() and not turbo_bg.is_file():
        shutil.copy2(auto_bg, turbo_bg)
        manifest["ui"]["btn-turbo-bg"] = "pg/ui/btn-turbo-bg.png"

    spin_frame = PG / "ui" / "btn-spin-frame.png"
    btn_frame = PG / "ui" / "btn-frame.png"
    if spin_frame.is_file() and not btn_frame.is_file():
        shutil.copy2(spin_frame, btn_frame)
        manifest["ui"]["btn-frame"] = "pg/ui/btn-frame.png"


    # 主界面不用 native__67 拼出来的假全屏底图（那是图集碎图，正版用分层叠放）
    stale_bg = PG / "ui" / "bg-base.png"
    if stale_bg.is_file():
        stale_bg.unlink()
    manifest["ui"].pop("bg-base", None)

    covers = list(SCRAPE.glob("images__*65*.jpg")) + list(SCRAPE.glob("images__65_*.jpg"))
    mahjong_dir = ROOT.parent / "client-app/public/images/games/mahjong"
    mahjong_dir.mkdir(parents=True, exist_ok=True)
    if covers:
        cover = max(covers, key=lambda x: x.stat().st_size)
        cover_dest = mahjong_dir / "mahjong-cover-custom.jpg"
        shutil.copy2(cover, cover_dest)
        manifest["ui"]["cover"] = "mahjong-cover-custom.jpg"
        manifest["ui"]["cover-bg"] = "mahjong-cover-custom.jpg"

    icon_candidates = [p for p in covers if p.stat().st_size < 200_000]
    if icon_candidates:
        icon_src = max(icon_candidates, key=lambda p: p.stat().st_size)
        shutil.copy2(icon_src, mahjong_dir / "mahjong.webp")
        manifest["ui"]["lobby-icon"] = "mahjong.webp"


def main() -> None:
    global SCRAPE, RESOLVER
    parser = argparse.ArgumentParser()
    parser.add_argument("--scrape-dir", default=str(DEFAULT_SCRAPE))
    args = parser.parse_args()
    SCRAPE = Path(args.scrape_dir)
    if not SCRAPE.exists():
        raise SystemExit(f"找不到: {SCRAPE}")

    RESOLVER = AtlasResolver(SCRAPE)
    clear_outputs()
    manifest = {
        "source": str(SCRAPE),
        "symbols": {},
        "symbols_golden": {},
        "ui": {},
    }

    deploy_symbols(manifest)
    deploy_ui_sprites(manifest)

    (PG / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    # 补登记 ui 目录下全部 png（含已有合成图）
    manifest = json.loads((PG / "manifest.json").read_text(encoding="utf-8"))
    for png in sorted((PG / "ui").glob("*.png")):
        if png.stem.startswith("_"):
            continue
        manifest["ui"][png.stem] = f"pg/ui/{png.name}"
    (PG / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"符号: {len(manifest['symbols'])}  镀金: {len(manifest['symbols_golden'])}  UI: {len(manifest['ui'])}")
    for k, v in sorted(manifest["ui"].items()):
        print(f"  ui/{k} -> {v}")


if __name__ == "__main__":
    main()
