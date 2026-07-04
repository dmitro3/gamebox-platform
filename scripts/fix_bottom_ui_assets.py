#!/usr/bin/env python3
"""补全底部按钮/UI 素材，并修正极速按钮合成。"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
SCRAPE = ROOT / "麻将胡了"
PG_UI = ROOT.parent / "client-app/public/images/games/mahjong/pg/ui"
MANIFEST = ROOT.parent / "client-app/public/images/games/mahjong/pg/manifest.json"

sys.path.insert(0, str(ROOT))
from pg_atlas_utils import AtlasResolver, crop, parse_sprite_frames  # noqa: E402


def save(img: Image.Image, key: str, manifest: dict) -> None:
    dest = PG_UI / f"{key}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest)
    manifest.setdefault("ui", {})[key] = f"pg/ui/{key}.png"
    print(f"  saved {key} ({img.size[0]}x{img.size[1]})")


def extract_from_native(
    resolver: AtlasResolver,
    native: Path,
    imp_name: str,
    mapping: dict[str, str],
    manifest: dict,
) -> None:
    imp = SCRAPE / imp_name
    if not imp.is_file() or not native.is_file():
        print(f"  skip {imp_name}: missing")
        return
    frames = {
        f["name"]: f
        for f in parse_sprite_frames(imp.read_text(encoding="utf-8", errors="ignore"))
    }
    with Image.open(native) as atlas:
        atlas = atlas.convert("RGBA")
        for sprite, key in mapping.items():
            frame = frames.get(sprite)
            if not frame:
                print(f"  missing sprite {sprite} in {imp_name}")
                continue
            save(crop(atlas, frame), key, manifest)


def compose_icon_label(icon: Image.Image, label: Image.Image, icon_y_offset: int = -6) -> Image.Image:
    canvas = label.copy()
    ix = (canvas.width - icon.width) // 2
    iy = (canvas.height - icon.height) // 2 + icon_y_offset
    canvas.alpha_composite(icon, (ix, iy))
    return canvas


def strip_fx_background(img: Image.Image) -> Image.Image:
    """去除 Cocos 特效精灵的黑色/深色底（Web 无 additive 混合时需预处理）。"""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a:
                continue
            mx = max(r, g, b)
            luma = 0.299 * r + 0.587 * g + 0.114 * b
            neutral = abs(r - g) < 12 and abs(g - b) < 12
            if mx <= 55 and (luma < 32 or neutral):
                px[x, y] = (0, 0, 0, 0)
    return img


def pad_frame(img: Image.Image, size: int = 60) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(img, ((size - img.width) // 2, (size - img.height) // 2))
    return canvas


def frame_visible_pixels(img: Image.Image, min_brightness: int = 24) -> int:
    return sum(
        1
        for r, g, b, a in img.getdata()
        if a > 20 and max(r, g, b) >= min_brightness
    )


def build_turbo_fx_sheets(resolver: AtlasResolver, manifest: dict) -> None:
    trans_imgs: dict[str, Image.Image] = {}
    for imp in SCRAPE.glob("import__*.json"):
        for name, img in resolver.extract_from_import(imp).items():
            if name.startswith("turbo_trans_"):
                trans_imgs[name] = img
    if trans_imgs:
        keys = sorted(trans_imgs)
        fw, fh = 50, 50
        sheet = Image.new("RGBA", (fw * len(keys), fh), (0, 0, 0, 0))
        for i, key in enumerate(keys):
            im = strip_fx_background(trans_imgs[key])
            if im.size != (fw, fh):
                im = im.resize((fw, fh), Image.Resampling.LANCZOS)
            sheet.alpha_composite(im, (i * fw, (fh - im.height) // 2))
        save(sheet, "turbo-fx-glow-sheet", manifest)

    lightning_frames: list[Image.Image] = []
    for i in range(16):
        img = resolver.extract_sprite(f"turbo_lightning_{i:02d}")
        if not img:
            continue
        cleaned = strip_fx_background(pad_frame(img))
        if frame_visible_pixels(cleaned) < 8:
            continue
        lightning_frames.append(cleaned)
    if lightning_frames:
        fw = 60
        sheet = Image.new("RGBA", (fw * len(lightning_frames), fw), (0, 0, 0, 0))
        for i, im in enumerate(lightning_frames):
            sheet.alpha_composite(im, (i * fw, 0))
        save(sheet, "turbo-fx-lightning-sheet", manifest)
        print(f"  lightning sheet frames: {len(lightning_frames)}")


def main() -> None:
    resolver = AtlasResolver(SCRAPE)
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.is_file() else {"ui": {}}
    manifest.setdefault("ui", {})

    nat75 = SCRAPE / "native__75_75e507a6-3bc5-4aa1-89ff-8fc31c86ef0c.f8847.png"
    nat67 = SCRAPE / "native__67_6737e5a0-4b0b-4887-8c8b-de2915097fa8.f1b49.png"
    nat73 = SCRAPE / "native__73_73b542d8-1f8d-49be-9633-2f0866f9d766.82e71.png"

    print("== setting_menu (75e507) ==")
    extract_from_native(
        resolver,
        nat75,
        "import__76_762ed62c-b43b-4909-9849-c94cb97ac72a.93e0f.json",
        {"180x180_white circle": "btn-circle"},
        manifest,
    )
    extract_from_native(
        resolver,
        nat75,
        "import__b2_b27b4d5a-660b-4efa-8cee-bfb5d5474be0.4482f.json",
        {"btn_minus": "btn-minus"},
        manifest,
    )
    extract_from_native(
        resolver,
        nat75,
        "import__f1_f1a769c6-dc02-4449-8a7d-fe71d099236e.d4a7b.json",
        {"btn_add": "btn-plus"},
        manifest,
    )
    extract_from_native(
        resolver,
        nat75,
        "import__07_0734a42bd.baf1c.json",
        {"center_turbo_off": "btn-turbo", "center_turbo_on": "btn-turbo-on"},
        manifest,
    )
    extract_from_native(
        resolver,
        nat75,
        "import__01_017be2b58.105bc.json",
        {"center_autoplay": "btn-auto-center", "auto_arrow": "btn-auto-arrow"},
        manifest,
    )
    extract_from_native(
        resolver,
        nat75,
        "import__3d_3d3379a5-c9b1-432d-960c-28b1b2cef964.31f89.json",
        {"btn_menu": "btn-menu"},
        manifest,
    )
    extract_from_native(
        resolver,
        nat75,
        "import__03_032197cb6.e962e.json",
        {"ic_soundon": "btn-sound-on", "ic_soundoff": "btn-sound-off"},
        manifest,
    )
    extract_from_native(
        resolver,
        nat75,
        "import__94_9499a65b-8499-4c95-bdcc-3e512bdd7e38.229a3.json",
        {"ic_paytable": "btn-paytable"},
        manifest,
    )
    extract_from_native(
        resolver,
        nat75,
        "import__c8_c87db9bc-49b7-43c0-9410-0b8d025ce37c.69760.json",
        {"ic_rule": "btn-rules"},
        manifest,
    )
    extract_from_native(
        resolver,
        nat75,
        "import__0b_0b536a44-f357-4832-b5e1-1339138125dc.9a632.json",
        {"ic_close": "btn-back"},
        manifest,
    )

    # ic_hist for menu: locale atlas ribbon (奖)
    locale_imp = SCRAPE / "import__04_0491c2e84.148c4.json"
    if locale_imp.is_file() and nat73.is_file():
        frames = {
            f["name"]: f
            for f in parse_sprite_frames(locale_imp.read_text(encoding="utf-8", errors="ignore"))
        }
        with Image.open(nat73) as atlas:
            atlas = atlas.convert("RGBA")
            for sprite, key in {
                "ic_hist": "btn-history",
                "txt_auto": "label-auto-text",
                "txt_turbo_off": "label-turbo-off-ring",
                "txt_turbo_on": "label-turbo-on",
            }.items():
                frame = frames.get(sprite)
                if frame:
                    save(crop(atlas, frame), key, manifest)

    print("== locale turbo / auto composite ==")
    turbo_off_icon = PG_UI / "btn-turbo.png"
    turbo_on_icon = PG_UI / "btn-turbo-on.png"
    label_off_ring = PG_UI / "label-turbo-off-ring.png"
    label_on = PG_UI / "label-turbo-on.png"
    label_auto_text = PG_UI / "label-auto-text.png"
    auto_center = PG_UI / "btn-auto-center.png"
    if turbo_off_icon.is_file() and label_off_ring.is_file():
        icon = Image.open(turbo_off_icon).convert("RGBA")
        ring = Image.open(label_off_ring).convert("RGBA")
        save(compose_icon_label(icon, ring), "label-turbo-off", manifest)
    if turbo_on_icon.is_file() and label_on.is_file():
        icon = Image.open(turbo_on_icon).convert("RGBA")
        label = Image.open(label_on).convert("RGBA")
        save(compose_icon_label(icon, label), "label-turbo-active", manifest)
    if auto_center.is_file() and label_auto_text.is_file():
        icon = Image.open(auto_center).convert("RGBA")
        label = Image.open(label_auto_text).convert("RGBA")
        save(compose_icon_label(icon, label, icon_y_offset=-8), "label-auto", manifest)

    print("== turbo active fx ==")
    img = resolver.extract_sprite("turbo_trans_04")
    if img:
        save(strip_fx_background(img), "turbo-fx-glow", manifest)
    build_turbo_fx_sheets(resolver, manifest)

    print("== spin button (auto mode disc) ==")
    auto_spin = resolver.extract_sprite("auto_spin")
    if auto_spin:
        save(auto_spin, "btn-spin-count", manifest)

    print("== digit atlas (free spin count / win amount) ==")
    nat45 = SCRAPE / "native__45_45979e75-3d36-417c-900f-a148b6a0bb92.7f863.png"
    if nat45.is_file():
        with Image.open(nat45) as atlas:
            save(atlas.convert("RGBA"), "win-digits", manifest)

    print("== bottom bar / HUD extras ==")
    extract_from_native(
        resolver,
        nat67,
        "import__0d_0db702c18.4cf1c.json",
        {"main_bottom_b": "bg-bottom-bar"},
        manifest,
    )

    # wallet open, infoboard, mult-glow, info messages from resolver
    extras = {
        "ic_wallet_open": "icon-wallet-open",
        "infoboard_a": "infoboard-a",
        "infoboard_b": "infoboard-b",
        "infoboard_c": "infoboard-c",
        "infoboard_a_normal": "infoboard_a_normal",
        "multiplier_glow": "mult-glow",
        "totalwin_info": "totalwin-info",
        "win_info": "win-info",
        "win_digits": "win-digits",
        "info2": "info2",
    }
    for sprite, key in extras.items():
        img = resolver.extract_sprite(sprite)
        if img:
            save(img, key, manifest)
        else:
            print(f"  missing {sprite}")

    # btn-menu alias for icon-menu
    btn_menu = PG_UI / "btn-menu.png"
    if btn_menu.is_file():
        icon_menu = PG_UI / "icon-menu.png"
        if not icon_menu.is_file():
            import shutil
            shutil.copy2(btn_menu, icon_menu)
        manifest["ui"]["btn-menu"] = "pg/ui/btn-menu.png"
        manifest["ui"]["icon-menu"] = "pg/ui/icon-menu.png"

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"manifest ui keys: {len(manifest['ui'])}")


if __name__ == "__main__":
    main()
