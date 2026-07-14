#!/usr/bin/env python3
"""从爬取 Cocos prefab / scene JSON 提取 UI 布局（1080×2340 设计稿百分比）。"""

from __future__ import annotations

import json
import re
from pathlib import Path

DESIGN_W, DESIGN_H = 1080, 1920
SCRAPE = Path(__file__).parent / "麻将胡了"


def extract_array(text: str, start: int) -> str | None:
    if start >= len(text) or text[start] != "[":
        return None
    depth = 0
    for j in range(start, len(text)):
        if text[j] == "[":
            depth += 1
        elif text[j] == "]":
            depth -= 1
            if depth == 0:
                return text[start : j + 1]
    return None


def top_level_arrays(node: str) -> list[str]:
    inner = node[1:-1]
    out: list[str] = []
    i = 0
    while i < len(inner):
        if inner[i] == "[":
            arr = extract_array(inner, i)
            if arr:
                out.append(arr)
                i += len(arr)
                if i < len(inner) and inner[i] == ",":
                    i += 1
                continue
        i += 1
    return out


def parse_node_str(node: str) -> dict | None:
    arrays = top_level_arrays(node)
    if len(arrays) < 2:
        return None
    w, h = 0.0, 0.0
    ax, ay = 0.5, 0.5
    trs: list[float] | None = None
    for arr in arrays:
        sm = re.fullmatch(r"\[5,(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]", arr)
        if sm:
            w, h = float(sm.group(1)), float(sm.group(2))
    for arr in reversed(arrays):
        nums = re.findall(r"-?\d+(?:\.\d+)?", arr)
        if len(nums) == 10:
            trs = [float(x) for x in nums]
            break
    if not trs:
        if w == 0 and h == 0:
            return None
        trs = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0]
    sized = False
    for arr in arrays:
        if re.fullmatch(r"\[5,(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]", arr):
            sized = True
            continue
        am = re.fullmatch(r"\[0,(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]", arr)
        if am and (sized or w == 0):
            ax, ay = float(am.group(1)), float(am.group(2))
    return {
        "w": w, "h": h, "ax": ax, "ay": ay,
        "x": trs[0], "y": trs[1], "sx": trs[6], "sy": trs[7],
    }


def find_node(text: str, name: str) -> dict | None:
    pat = re.compile(rf'\[\d+,"{re.escape(name)}",')
    for m in pat.finditer(text):
        node = extract_array(text, m.start())
        if not node:
            continue
        parsed = parse_node_str(node)
        if parsed:
            return parsed
    return None


def tl_pct(
    wx: float, wy: float,
    w: float, h: float,
    ax: float = 0.5, ay: float = 0.5,
    sx: float = 1, sy: float = 1,
) -> dict:
    """Cocos 中心原点 Y 向上 → 设计稿左上角百分比。"""
    sw, sh = w * sx, h * sy
    left = DESIGN_W / 2 + wx - ax * sw
    top = DESIGN_H / 2 - wy - (1 - ay) * sh
    return {
        "leftPct": round(left / DESIGN_W * 100, 3),
        "topPct": round(top / DESIGN_H * 100, 3),
        "widthPct": round(sw / DESIGN_W * 100, 3),
        "heightPct": round(sh / DESIGN_H * 100, 3),
    }


def layout_from_chain(
    text: str,
    names: list[str],
    holder: tuple[float, float] = (0, 0),
) -> dict | None:
    wx, wy, wsx, wsy = holder[0], holder[1], 1.0, 1.0
    leaf = None
    for n in names:
        node = find_node(text, n)
        if not node:
            return None
        wx += node["x"] * wsx
        wy += node["y"] * wsy
        wsx *= node["sx"]
        wsy *= node["sy"]
        leaf = node
    assert leaf is not None
    return tl_pct(wx, wy, leaf["w"], leaf["h"], leaf["ax"], leaf["ay"], wsx, wsy)


def pct_box(p: dict) -> dict:
    return {
        "topPct": p["topPct"],
        "heightPct": p["heightPct"],
        "leftPct": p["leftPct"],
        "widthPct": p["widthPct"],
    }


def main() -> None:
    files = {
        "slot": SCRAPE / "import__0a_0acff6675.3f9dd.json",
        "spin": SCRAPE / "import__02_021dc9702.95193.json",
        "mult": SCRAPE / "import__0b_0b0136117.63230.json",
        "info": SCRAPE / "import__0c_0cd28814e.e5eba.json",
        "bg": SCRAPE / "import__0d_0db702c18.4cf1c.json",
        "hud": SCRAPE / "import__a8_a83465b4-233e-459a-862d-a76c1610c770.a040f.json",
        "menu": SCRAPE / "import__df_dfce8cf6-ecd2-4f2b-a746-d86c5f78d472.0a8a5.json",
        "scene": SCRAPE / "json__96_96350ac4-3e79-4bf5-b1fd-2fc076d9bace.1944a.json",
    }
    texts = {k: v.read_text(encoding="utf-8", errors="ignore") for k, v in files.items()}

    footer_holder = find_node(texts["scene"], "setting_menu_footer_holder")
    menu_holder = (footer_holder["x"], footer_holder["y"]) if footer_holder else (5.0, -858.0)

    reel_a = layout_from_chain(texts["bg"], ["reel_a"])
    dark_reel_1 = find_node(texts["bg"], "dark_reel_1")
    dark_reel_5 = find_node(texts["bg"], "dark_reel_5")
    play_reels = None
    if dark_reel_1 and dark_reel_5:
        b1 = tl_pct(
            dark_reel_1["x"], dark_reel_1["y"],
            dark_reel_1["w"], dark_reel_1["h"],
            dark_reel_1["ax"], dark_reel_1["ay"],
            dark_reel_1["sx"], dark_reel_1["sy"],
        )
        b5 = tl_pct(
            dark_reel_5["x"], dark_reel_5["y"],
            dark_reel_5["w"], dark_reel_5["h"],
            dark_reel_5["ax"], dark_reel_5["ay"],
            dark_reel_5["sx"], dark_reel_5["sy"],
        )
        left = b1["leftPct"]
        top = b1["topPct"]
        right = b5["leftPct"] + b5["widthPct"]
        play_reels = {
            "leftPct": round(left, 3),
            "topPct": round(top, 3),
            "widthPct": round(right - left, 3),
            "heightPct": b1["heightPct"],
        }

    raw = {
        # 牌面裁剪框：与底图木框 reel_a 一致（非 slot_controller 宽条）
        "board": reel_a,
        "playReels": play_reels or {
            "leftPct": 2.778,
            "topPct": 5.312,
            "widthPct": 94.444,
            "heightPct": 62.5,
        },
        "title1024": layout_from_chain(texts["mult"], ["multiplier_bar_controller", "1024ways"]),
        "multBar": layout_from_chain(texts["mult"], ["multiplier_bar_controller", "main_top_b"]),
        "message": layout_from_chain(
            texts["info"],
            ["infoboard_controller", "infoboard_holder", "content"],
        ),
        "spinFrame": layout_from_chain(texts["spin"], ["spin_button_controller"]),
        "btnBar": layout_from_chain(
            texts["menu"],
            ["setting_menu"],
            holder=menu_holder,
        ),
        "bottomWood": layout_from_chain(texts["bg"], ["main_bottom_a"]),
    }

    # 三格金额：广告条下缘 → 底栏上缘，横向对齐木框 main_bottom_a（由 JSON 区域推算）
    msg, bar, wood = raw.get("message"), raw.get("btnBar"), raw.get("bottomWood")
    if msg and bar and wood:
        raw["statusHud"] = {
            "topPct": round(msg["topPct"] + msg["heightPct"], 3),
            "heightPct": round(bar["topPct"] - (msg["topPct"] + msg["heightPct"]), 3),
            "leftPct": wood["leftPct"],
            "widthPct": wood["widthPct"],
        }

    # 底图素材在 1080×1920 画布上的占位（bg-base.png 实际像素，横向对齐 main_bottom_a）
    bg_path = Path(__file__).parent.parent / "client-app/public/images/games/mahjong/pg/ui/bg-base.png"
    bg_w, bg_h = 758, 1686
    if bg_path.is_file():
        try:
            from PIL import Image
            with Image.open(bg_path) as im:
                bg_w, bg_h = im.size
        except Exception:
            pass
    wood = raw.get("bottomWood")
    bg_left = wood["leftPct"] if wood else 15.0
    bg_width = wood["widthPct"] if wood else round(bg_w / DESIGN_W * 100, 3)
    raw["bgImage"] = {
        "topPct": 0.0,
        "leftPct": bg_left,
        "widthPct": bg_width,
        "heightPct": round(bg_h / DESIGN_H * 100, 3),
        "pixelSize": [bg_w, bg_h],
    }

    print(f"Cocos design {DESIGN_W}x{DESIGN_H} (percentage layout)\n")
    for k, v in raw.items():
        if v:
            print(
                f"{k:12s} top={v['topPct']:6.2f}% h={v['heightPct']:5.2f}% "
                f"left={v['leftPct']:6.2f}% w={v['widthPct']:5.2f}%"
            )
        else:
            print(f"{k:12s} NOT FOUND")

    L = {k: pct_box(v) for k, v in raw.items() if v and k not in ("spinFrame", "btnBar", "bgImage", "playReels")}

    spin_frame = pct_box(raw["spinFrame"]) if raw["spinFrame"] else {}
    btn_bar = pct_box(raw["btnBar"]) if raw["btnBar"] else {}
    bg_image = pct_box(raw["bgImage"]) if raw.get("bgImage") else {}
    # 设计稿高 1920（与正版运行时 cc.view 一致，非 scene 里 2340 画布）
    if btn_bar:
        # 底栏全宽：holder 仅 x=5 偏移，条带铺满画布宽
        btn_bar["leftPct"] = 0.0
        btn_bar["widthPct"] = 100.0

    out = Path(__file__).parent.parent / "client-app/src/games/mahjong/cocosLayout.json"
    payload = {
        "source": "scripts/麻将胡了 Cocos prefab + scene JSON",
        "design": [DESIGN_W, DESIGN_H],
        "L": L,
        "spinFrame": spin_frame,
        "btnBar": btn_bar,
        "bgImage": bg_image,
        "playReels": pct_box(raw["playReels"]) if raw.get("playReels") else {},
        "nodes": raw,
    }
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\n-> {out}")


if __name__ == "__main__":
    main()
