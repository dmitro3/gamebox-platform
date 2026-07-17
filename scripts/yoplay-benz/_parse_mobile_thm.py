# -*- coding: utf-8 -*-
"""从手机 benz.thm 抽出 GamePage / BetBoard 坐标。"""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

OUT = Path("scripts/yoplay-benz-mobile")
thm = json.loads((OUT / "benz.thm.d68a78f6.json").read_text(encoding="utf-8"))

exml_dir = OUT / "exml"
exml_dir.mkdir(exist_ok=True)

wanted = (
    "GamePageSkin",
    "BetBoardPanelSkin",
    "SpinPanelV2Skin",
    "BetItem",
    "ChipItem",
)

for e in thm.get("exmls", []):
    path = e.get("path", "")
    name = Path(path).name
    content = e.get("content", "")
    (exml_dir / name).write_text(content, encoding="utf-8")
    if any(k in name for k in wanted):
        print("=" * 60)
        print(name, "chars", len(content))
        # compact attrs of top-level and interesting ids
        for m in re.finditer(
            r'<(?:e:|Benz:|Locale:|Common:|YP:)?(\w+)([^>/]*?)(?:/>|>)',
            content,
        ):
            tag, attrs = m.group(1), m.group(2)
            if "id=" not in attrs and tag not in ("Skin",):
                continue
            idm = re.search(r'id="([^"]+)"', attrs)
            useful = {}
            for k in (
                "id",
                "x",
                "y",
                "width",
                "height",
                "horizontalCenter",
                "verticalCenter",
                "left",
                "right",
                "top",
                "bottom",
                "source",
                "skinName",
            ):
                am = re.search(rf'{k}="([^"]*)"', attrs)
                if am:
                    useful[k] = am.group(1)
            if useful:
                print(f"  <{tag}", useful)

# try download benz.res — guess hashes near thm or from plaza
UA = {"User-Agent": "Mozilla/5.0"}
base = "https://gci.mq2thirdgame.net/ypgame/YoPlayPlaza291/resource/Benz/"
# common: res hash differs; probe by requesting known pattern from PC naming
# Also search thm for res references - usually none
for name in [
    "benz.res.json?v=v2.22.1",
]:
    pass

# Brute: many yoplay packs use independent 8-hex; try fetch directory via res from game js version file
# Check if benz.res with same hash exists
for h in ["d68a78f6", "2b78507c", "4392341f", "0b901bc5"]:
    u = f"{base}benz.res.{h}.json?v=v2.22.1"
    try:
        req = urllib.request.Request(u, headers=UA)
        with urllib.request.urlopen(req, timeout=15) as r:
            data = r.read()
        (OUT / f"benz.res.{h}.json").write_bytes(data)
        print("RES OK", h, len(data))
    except Exception as e:
        print("RES FAIL", h, getattr(e, "code", e))
