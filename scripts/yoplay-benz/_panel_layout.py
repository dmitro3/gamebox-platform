# -*- coding: utf-8 -*-
"""输出 panel_mobile 关键布局坐标，供 BcbmView 使用。"""
from pathlib import Path
import json
from PIL import Image

PANEL = Path("client-app/public/images/games/bcbm/h5/panel_mobile.png")
im = Image.open(PANEL).convert("RGBA")
w, h = im.size
px = im.load()

# 底排 6 个金额槽（先前测到 cy≈410.5）
bottom = [56.5, 124.5, 192.5, 286.5, 354.5, 423.5]
# 中排金额槽
mid_small = [135.5, 204.5, 274.5, 343.5]  # y~300
mid_large = [54.5, 427.5]  # y~281 bases at 319

# 图标中心：金额槽上方
# 大仓：从 panel 目视，外圈圆更大，中心约 y=230
# 小仓中排：y≈250
# 底仓：y≈360

layout = {
    "panel": {"w": w, "h": h},
    "stage": {"w": 480, "h": 715},
    "panelTop": 715 - h,  # 289
    "history": {"x": 25, "y": 16, "w": 430, "h": 54},
    "start": {"cx": 240, "cy": 155, "r": 70},
    # 上排 6：奔驰红绿黄 + 宝马黄绿红（两大四中）
    "topBets": [
        {"cx": 55, "cy": 245, "r": 48, "playType": 11},  # benz red L
        {"cx": 136, "cy": 255, "r": 36, "playType": 10},
        {"cx": 205, "cy": 255, "r": 36, "playType": 9},
        {"cx": 275, "cy": 255, "r": 36, "playType": 6},
        {"cx": 344, "cy": 255, "r": 36, "playType": 7},
        {"cx": 428, "cy": 245, "r": 48, "playType": 8},  # bmw red L
    ],
    # 下排 6：奥迪 + 大众
    "bottomBets": [
        {"cx": 57, "cy": 365, "r": 32, "playType": 5},
        {"cx": 125, "cy": 365, "r": 32, "playType": 4},
        {"cx": 193, "cy": 365, "r": 32, "playType": 3},
        {"cx": 287, "cy": 365, "r": 32, "playType": 0},
        {"cx": 355, "cy": 365, "r": 32, "playType": 1},
        {"cx": 424, "cy": 365, "r": 32, "playType": 2},
    ],
    # 筹码：开始两侧（对照官网）
    "chips": [
        {"v": 1, "cx": 110, "cy": 155},
        {"v": 2, "cx": 155, "cy": 185},
        {"v": 10, "cx": 325, "cy": 185},
        {"v": 100, "cx": 370, "cy": 155},
    ],
    "clear": {"cx": 100, "cy": 100},
    "auto": {"cx": 380, "cy": 100},
    "all": {"cx": 40, "cy": 155},
    "undo": {"cx": 440, "cy": 155},
}

out = Path("client-app/src/games/bcbm/mobilePanelLayout.json")
out.write_text(json.dumps(layout, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(layout, ensure_ascii=False, indent=2))
print("wrote", out)
