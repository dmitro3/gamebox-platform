# -*- coding: utf-8 -*-
"""切片用户从 H5 导出的三张图集，输出到 client-app/public/images/games/bcbm/h5/"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

SRC = Path(r"C:\Users\pc\Desktop\奔驰宝马")
OUT = Path(__file__).resolve().parents[2] / "client-app" / "public" / "images" / "games" / "bcbm" / "h5"
OUT.mkdir(parents=True, exist_ok=True)


def find_rects(im: Image.Image, min_area=80, alpha_thr=8):
    """简单扫描：按非透明像素找外接矩形（行合并扫描，适合散落 sprite）。"""
    rgba = im.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    visited = [[False] * w for _ in range(h)]
    rects = []

    def flood(sx, sy):
        stack = [(sx, sy)]
        minx = maxx = sx
        miny = maxy = sy
        count = 0
        while stack:
            x, y = stack.pop()
            if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
                continue
            a = px[x, y][3]
            if a < alpha_thr:
                visited[y][x] = True
                continue
            visited[y][x] = True
            count += 1
            minx = min(minx, x)
            maxx = max(maxx, x)
            miny = min(miny, y)
            maxy = max(maxy, y)
            stack.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
        return minx, miny, maxx + 1, maxy + 1, count

    # 步进采样加速；完整 flood 对大图慢，改用 bounding-box per connected via scanline clusters
    # 改用：找 alpha 行段，再纵向合并
    rows = []
    for y in range(h):
        segs = []
        x = 0
        while x < w:
            while x < w and px[x, y][3] < alpha_thr:
                x += 1
            if x >= w:
                break
            x0 = x
            while x < w and px[x, y][3] >= alpha_thr:
                x += 1
            segs.append((x0, x))
        rows.append(segs)

    # 合并相邻行段为矩形（粗糙但实用）
    active = []  # list of dict
    done = []
    for y, segs in enumerate(rows):
        used = [False] * len(segs)
        new_active = []
        for box in active:
            matched = None
            for i, (x0, x1) in enumerate(segs):
                if used[i]:
                    continue
                # overlap
                if x1 > box["x0"] and x0 < box["x1"] and abs(x0 - box["x0"]) < 40 and abs(x1 - box["x1"]) < 40:
                    matched = i
                    break
            if matched is None:
                done.append(box)
            else:
                x0, x1 = segs[matched]
                used[matched] = True
                box["x0"] = min(box["x0"], x0)
                box["x1"] = max(box["x1"], x1)
                box["y1"] = y + 1
                new_active.append(box)
        for i, (x0, x1) in enumerate(segs):
            if not used[i]:
                new_active.append({"x0": x0, "x1": x1, "y0": y, "y1": y + 1})
        active = new_active
    done.extend(active)

    out = []
    for b in done:
        area = (b["x1"] - b["x0"]) * (b["y1"] - b["y0"])
        if area >= min_area:
            out.append((b["x0"], b["y0"], b["x1"], b["y1"]))
    out.sort(key=lambda r: (r[1], r[0]))
    return out


def slice_file(name: str, min_area=200):
    src = SRC / name
    im = Image.open(src).convert("RGBA")
    dest = OUT / src.stem
    dest.mkdir(parents=True, exist_ok=True)
    # 整图也拷贝
    im.save(OUT / f"{src.stem}_full.png")
    rects = find_rects(im, min_area=min_area)
    meta = []
    for i, (x0, y0, x1, y1) in enumerate(rects):
        crop = im.crop((x0, y0, x1, y1))
        # 丢掉几乎全透明
        bbox = crop.getbbox()
        if not bbox:
            continue
        crop = crop.crop(bbox)
        fn = f"{i:03d}_{crop.size[0]}x{crop.size[1]}.png"
        crop.save(dest / fn)
        meta.append({"i": i, "file": fn, "box": [x0, y0, x1, y1], "size": list(crop.size)})
    (dest / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{name}: {len(meta)} sprites -> {dest}")
    # 打印最大的若干块（面板/底图）
    big = sorted(meta, key=lambda m: m["size"][0] * m["size"][1], reverse=True)[:12]
    for m in big:
        print(f"  BIG {m['file']} box={m['box']}")
    return meta


def extract_bg_left():
    """底图左侧通常是完整竖屏背景。"""
    im = Image.open(SRC / "底图.png").convert("RGBA")
    w, h = im.size
    # 左半：找非透明内容的实际宽度
    left = im.crop((0, 0, w // 2 + 20, h))
    bbox = left.getbbox()
    if bbox:
        left = left.crop(bbox)
    left.save(OUT / "bg_mobile.png")
    print("bg_mobile", left.size)


if __name__ == "__main__":
    extract_bg_left()
    slice_file("底图.png", min_area=400)
    slice_file("按钮区.png", min_area=300)
    slice_file("车标.png", min_area=200)
    print("OUT", OUT)
