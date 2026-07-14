#!/usr/bin/env python3
"""
从已知原版资源文件提取并部署所有 UI 资产
"""
from PIL import Image
import os, shutil

ASSETS = 'pg_assets'
OUT_DIR = '../client-app/public/images/games/mahjong/pg/ui'
SCREENSHOT = r'C:\Users\pc\AppData\Local\Temp\cursor\screenshots\page-2026-06-21T00-17-57-693Z.png'

os.makedirs(OUT_DIR, exist_ok=True)

# ─── 1. 倍数精灵 ──────────────────────────────────────────────────────────────
# unknown_408.png (888x94): "x10 x4 x3 x6 x5 x2 x1" from left to right
mult_atlas = Image.open(f'{ASSETS}/unknown_408.png').convert('RGBA')
W, H = mult_atlas.size  # 888 x 94
print(f'Mult atlas: {mult_atlas.size}')

# The 7 values are roughly evenly spaced
# Order from left to right: x10, x4, x3, x6, x5, x2, x1
# Divide into 7 equal slots
slot_w = W // 7  # 126px each

mult_slots = [
    ('mult-x10', 0),     # slot 0
    ('mult-x4',  1),     # slot 1
    ('mult-x3',  2),     # slot 2
    ('mult-x6',  3),     # slot 3
    ('mult-x5',  4),     # slot 4
    ('mult-x2',  5),     # slot 5
    ('mult-x1',  6),     # slot 6
]

for name, slot_idx in mult_slots:
    x = slot_idx * slot_w
    # Leave a small margin
    crop = mult_atlas.crop((x+4, 2, x + slot_w - 4, H - 2))
    out_path = f'{OUT_DIR}/{name}.png'
    crop.save(out_path)
    print(f'  Saved {name}.png: {crop.size}')

# ─── 2. 绿色棋盘（reel-green）─────────────────────────────────────────────────
# unknown_342.png (253x141): green felt with gold border
reel_green = Image.open(f'{ASSETS}/unknown_342.png')
shutil.copy(f'{ASSETS}/unknown_342.png', f'{OUT_DIR}/reel-green.png')
print(f'  Saved reel-green.png: {reel_green.size}')

# ─── 3. 棋盘框架（reel-frame）─────────────────────────────────────────────────
# unknown_242.jpg (755x882): plain green felt (will need to be replaced with proper frame)
# For now use it as the underlying reel background
shutil.copy(f'{ASSETS}/unknown_242.jpg', f'{OUT_DIR}/reel-frame.png')
print('  Saved reel-frame.png (755x882 green felt)')

# ─── 4. 从截图裁剪 UI 区域 ─────────────────────────────────────────────────────
# Screenshot: 704x1045, Canvas: 482x1045 centered (left offset = 111)
# Canvas percentages from cocosLayout.json
scr = Image.open(SCREENSHOT)
SW, SH = scr.size  # 704 x 1045
CANVAS_W = 482
CANVAS_H = 1045
CANVAS_LEFT = (SW - CANVAS_W) // 2  # 111

def pct_crop(left_pct, top_pct, width_pct, height_pct):
    x1 = CANVAS_LEFT + int(left_pct / 100 * CANVAS_W)
    y1 = int(top_pct / 100 * CANVAS_H)
    x2 = CANVAS_LEFT + int((left_pct + width_pct) / 100 * CANVAS_W)
    y2 = int((top_pct + height_pct) / 100 * CANVAS_H)
    x1, y1, x2, y2 = max(0,x1), max(0,y1), min(SW,x2), min(SH,y2)
    return scr.crop((x1, y1, x2, y2))

# Top wood panel (main_top_a): 0% to 15.094%
top_wood = pct_crop(0, 0, 100, 15.094)
top_wood.save(f'{OUT_DIR}/top-wood.png')
print(f'  Saved top-wood.png: {top_wood.size}')

# Multiplier bar background only (main_top_b): 9.153% to 17.342%
# Use JUST the bar background without text
# Actually, let's save the full bar WITH text as the background (simplest approach)
mult_bar_bg = pct_crop(0, 9.153, 100, 8.189)
mult_bar_bg.save(f'{OUT_DIR}/top-bar-orange.png')
mult_bar_bg.save(f'{OUT_DIR}/multiplier-bar-bg.png')
print(f'  Saved top-bar-orange.png / multiplier-bar-bg.png: {mult_bar_bg.size}')

# Create a clean mult bar (just the wooden panel without mult text)
# The mult bar area starts at y=9.153% and ends at 17.342%  
# The x values text starts at approximately y=9.153% + padding
# Take just a narrow strip at the very top for the plain wooden background
plain_wood_strip = pct_crop(0, 9.153, 100, 1.5)  # just the top of the bar
# Stretch it to full bar height
plain_bar = plain_wood_strip.resize((int(mult_bar_bg.width), int(mult_bar_bg.height)), Image.LANCZOS)
plain_bar.save(f'{OUT_DIR}/multiplier-bar-bg-free.png')
print(f'  Saved multiplier-bar-bg-free.png: {plain_bar.size}')

# Bottom wood: 67.339% to 103.517%
bottom_wood = pct_crop(0, 67.339, 100, 36.178)
bottom_wood.save(f'{OUT_DIR}/bottom-wood.png')
print(f'  Saved bottom-wood.png: {bottom_wood.size}')

# Title 1024: 36.204% to 63.797%, 12.009% to 14.317%
title = pct_crop(20, 12.009, 60, 3.308)
title.save(f'{OUT_DIR}/top-title-1024.png')
print(f'  Saved top-title-1024.png: {title.size}')

# ─── 5. 旋转按钮 ──────────────────────────────────────────────────────────────
# unknown_307.png (240x612): contains jade disc + spin arrows
spin_btn = Image.open(f'{ASSETS}/unknown_307.png').convert('RGBA')
# The jade disc is at top (about 240x240), arrows at bottom
jade_disc = spin_btn.crop((0, 0, 240, 240))
jade_disc.save(f'{OUT_DIR}/btn-spin-frame.png')
spin_arrows = spin_btn.crop((0, 240, 240, 480))
spin_arrows.save(f'{OUT_DIR}/btn-spin-arrows.png')
print(f'  Saved btn-spin-frame.png and btn-spin-arrows.png from unknown_307.png')

# ─── 6. 信息横幅（infoboard backgrounds）─────────────────────────────────────
# unknown_324.png (736x341): contains 3 bar variants (infoboard_a/b/c)
info = Image.open(f'{ASSETS}/unknown_324.png').convert('RGBA')
print(f'Info atlas: {info.size}')
# From sprite frames: infoboard_a rect=[1,249,713,91], infoboard_b rect=[1,1,734,100], infoboard_c rect=[1,103,733,144]
info_b = info.crop((1, 1, 735, 101))    # infoboard_b (top)
info_c = info.crop((1, 103, 734, 247))  # infoboard_c (middle)
info_a = info.crop((1, 249, 714, 340))  # infoboard_a (bottom)
info_b.save(f'{OUT_DIR}/info-ribbon-bg-free.png')
info_a.save(f'{OUT_DIR}/info-ribbon-bg.png')
print(f'  Saved info ribbon backgrounds from unknown_324.png')

# ─── 7. 符号预览（symbol icons for UI）──────────────────────────────────────
# Copy from the already-deployed symbols
symbol_src = '../client-app/public/images/games/mahjong/classic/symbols'
symbol_names = ['2s', '2t', '5s', '5t', '8w', 'bai', 'fa', 'hu', 'wild', 'zhong']
for sym in symbol_names:
    src = f'{symbol_src}/{sym}.png'
    dst = f'{OUT_DIR}/symbol-{sym}.png'
    if os.path.exists(src):
        shutil.copy(src, dst)
print(f'  Copied {len(symbol_names)} symbol icons to ui/')

print('\nDone! All UI assets deployed.')
