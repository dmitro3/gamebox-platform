# -*- coding: utf-8 -*-
"""下载手机版 resource/Benz 包：已知图集 + 探测 thm/res + 配套 json。"""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

UA = {"User-Agent": "Mozilla/5.0"}
CDN = "https://gc.andkids.xyz/yp/v20180829/resource/Benz/"
OUT = Path("scripts/yoplay-benz-mobile")
OUT.mkdir(parents=True, exist_ok=True)

KNOWN = {
    "assets/yben_main.4392341f.png": "yben_main.png",
    "assets/yben_betboard.0b901bc5.png": "yben_betboard.png",
    "assets/yben_spin_item.95e2b958.png": "yben_spin_item.png",
    "assets/locale/hans/yben_lang_hans.a98256c6.png": "yben_lang_hans.png",
}


def fetch(rel: str) -> bytes | None:
    try:
        req = urllib.request.Request(CDN + rel, headers=UA)
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.read()
    except Exception:
        return None


def main():
    for rel, name in KNOWN.items():
        data = fetch(rel)
        if not data:
            print("MISS", rel)
            continue
        dest = OUT / name
        dest.write_bytes(data)
        print("OK", len(data), name)

    # 从 PC res 抄共享资源到 mobile 目录（已验证存在）
    pc = json.loads(
        urllib.request.urlopen(
            urllib.request.Request(
                "https://gc.andkids.xyz/yp/v20180829/resource/PC_Benz/pc_benz.res.2b78507c.json",
                headers=UA,
            ),
            timeout=20,
        ).read()
    )
    for r in pc.get("resources", []):
        rel = r.get("url", "")
        if not rel:
            continue
        # skip PC-only atlas names we already replaced
        if any(x in rel for x in ("yben_main.", "yben_betboard.", "yben_spin_item.", "yben_lang_hans.")):
            continue
        data = fetch(rel)
        if not data:
            continue
        dest = OUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        print("shared", rel, len(data))

    # 暴力搜 thm/res：用常见 hex（也可从网络截图 OCR）
    # 尝试在 plaza 的其它 js 里找
    for u in [
        "https://gci.mq2thirdgame.net/ypgame/YoPlayPlaza291/main2275.min.js",
        "https://gc.andkids.xyz/yp/v20180829/resource/PC_YPCore/pc_ypcore.res.50d5b66e.json",
    ]:
        try:
            req = urllib.request.Request(u, headers=UA)
            text = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore")
        except Exception as e:
            print("skip", u, e)
            continue
        for m in re.finditer(r"Benz/[^\"'\\s]+", text):
            print("REF", m.group(0)[:160])
        for m in re.finditer(r"benz\.(thm|res)\.[a-f0-9]+\.json", text, re.I):
            print("THMRES", m.group(0))

    # 探测 sheet json：同一目录下常见另一套 hash —— 用 png 旁猜不行时，扫 0b901bc* 邻近
    # 尝试 TextureMerger 风格：文件名不同 hash
    # 从截图 Network 已知前缀再补全
    for stem, prefix in [
        ("assets/yben_betboard", "0b901bc"),  # png is 0b901bc5 - json maybe other
        ("assets/yben_main", "4392341"),
        ("assets/yben_spin_item", "95e2b95"),
        ("assets/locale/hans/yben_lang_hans", "a98256c"),
    ]:
        for i in range(16):
            h = f"{prefix}{i:x}" if len(prefix) == 7 else f"{prefix}"
            if len(h) < 8:
                continue
            # if prefix already 7 chars
            pass
        # prefix length handling
        if len(prefix) == 7:
            hashes = [f"{prefix}{c}" for c in "0123456789abcdef"]
        else:
            hashes = [prefix]
        for h in hashes:
            for ext in (".json",):
                rel = f"{stem}.{h}{ext}"
                data = fetch(rel)
                if data and data[:1] in (b"{", b"["):
                    dest = OUT / Path(rel).name
                    dest.write_bytes(data)
                    print("JSON", rel, len(data))

    # 搜 thm/res 8位 hash（常用字符集）— 太大；改为从 game 入口页抓
    print("OUT", OUT.resolve())


if __name__ == "__main__":
    main()
