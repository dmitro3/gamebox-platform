# -*- coding: utf-8 -*-
"""导出 benz.thm 全部 EXML 节点坐标 → mobileLayoutAuthority.json"""
from __future__ import annotations

import json
import re
from pathlib import Path

THM = Path("scripts/yoplay-benz-mobile/benz.thm.d68a78f6.json")
OUT = Path("scripts/yoplay-benz-mobile/mobileLayoutAuthority.json")
OUT_MD = Path("scripts/yoplay-benz/MOBILE_LAYOUT_FULL.md")

ATTRS = (
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
    "scaleX",
    "scaleY",
    "source",
    "skinName",
    "anchorOffsetX",
    "anchorOffsetY",
)

TAG_RE = re.compile(
    r"<(?:e:|Benz:|Locale:|Common:|YP:|w:)?([A-Za-z0-9_]+)([^<>]*?)(/?)>",
    re.S,
)


def parse_attrs(raw: str) -> dict:
    out = {}
    for k in ATTRS:
        m = re.search(rf'\b{k}="([^"]*)"', raw)
        if m:
            out[k] = m.group(1)
    return out


def parse_exml(content: str) -> list[dict]:
    nodes = []
    # skin root size
    sm = re.search(r'<e:Skin([^>]*)>', content)
    skin = {"tag": "Skin"}
    if sm:
        skin.update(parse_attrs(sm.group(1)))
        nodes.append(skin)
    for m in TAG_RE.finditer(content):
        tag, attrs, _ = m.group(1), m.group(2), m.group(3)
        if tag in ("Skin", "layout", "HorizontalLayout", "TileLayout", "ArrayCollection"):
            continue
        a = parse_attrs(attrs)
        if not a:
            continue
        # keep nodes with geometry or id
        if not any(
            k in a
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
            )
        ):
            continue
        nodes.append({"tag": tag, **a})
    return nodes


def main():
    thm = json.loads(THM.read_text(encoding="utf-8"))
    report = {
        "stage": {"w": 480, "h": 715, "source": "GamePageSkin"},
        "skins": {},
    }
    lines = [
        "# Benz 手机完整布局坐标（benz.thm.d68a78f6）",
        "",
        "舞台：**480 × 715**",
        "",
    ]
    for e in thm.get("exmls", []):
        path = e.get("path", "")
        name = Path(path).name
        nodes = parse_exml(e.get("content", ""))
        report["skins"][name] = nodes
        lines.append(f"## {name}")
        lines.append("")
        lines.append("| tag | id | geom | source/skin |")
        lines.append("|-----|----|------|-------------|")
        for n in nodes:
            geom = {k: n[k] for k in n if k not in ("tag", "id", "source", "skinName")}
            src = n.get("source") or n.get("skinName") or ""
            lines.append(
                f"| {n.get('tag','')} | {n.get('id','')} | `{json.dumps(geom, ensure_ascii=False)}` | {src} |"
            )
        lines.append("")

    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print("wrote", OUT, "skins", len(report["skins"]))
    print("wrote", OUT_MD)

    # print key page geometry
    for key in ("GamePageSkin.exml", "BetBoardPanelSkin.exml"):
        print("====", key)
        for n in report["skins"].get(key, []):
            if n.get("id") or n.get("tag") == "Skin":
                print(n)


if __name__ == "__main__":
    main()
