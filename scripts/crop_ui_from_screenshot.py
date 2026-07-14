#!/usr/bin/env python3
"""
从之前捕获的游戏截图裁剪所有 UI 元素
Screenshot: page-2026-06-21T00-17-57-693Z.png (704x1045)
Game canvas: 482x1045 (centered in 704-wide viewport)
"""
from PIL import Image
import os

SCREENSHOT = r'C:\Users\pc\AppData\Local\Temp\cursor\screenshots\page-2026-06-21T00-17-57-693Z.png'
OUT_DIR = '../client-app/public/images/games/mahjong/pg/ui'
os.makedirs(OUT_DIR, exist_ok=True)

img = Image.open(SCREENSHOT)
W, H = img.size
print(f'Screenshot: {W}x{H}')

# Game canvas is 482x1045 (min(704, 1045*1080/2340) x min(1045, 704*2340/1080))
# It's centered in the 704-wide viewport
# Canvas left offset: (704 - 482) / 2 = 111
CANVAS_W = 482
CANVAS_H = 1045
CANVAS_LEFT = (W - CANVAS_W) // 2  # 111px

def pct_box(left_pct, top_pct, width_pct, height_pct, margin=0):
    """Convert pct coords to pixel coords in the screenshot"""
    x = CANVAS_LEFT + int(left_pct / 100 * CANVAS_W) - margin
    y = int(top_pct / 100 * CANVAS_H) - margin
    w = int(width_pct / 100 * CANVAS_W) + 2 * margin
    h = int(height_pct / 100 * CANVAS_H) + 2 * margin
    return (max(0,x), max(0,y), min(W,x+w), min(H,y+h))

def save_crop(name, box, target_w=None, target_h=None):
    crop = img.crop(box)
    if target_w and target_h:
        crop = crop.resize((target_w, target_h), Image.LANCZOS)
    path = f'{OUT_DIR}/{name}'
    crop.save(path)
    print(f'  Saved {name}: {crop.size}')
    return crop

# From cocosLayout.json percentages:
# woodTop (main_top_a): left=-0.05%, top=0%, width=100.1%, height=15.094%
# multBar (main_top_b): left=-0.05%, top=9.153%, width=100.1%, height=8.189%
# title1024 (1024ways): left=36.204%, top=12.009%, width=27.593%, height=2.308%
# board: left=2.778%, top=16.85%, width=94.444%, height=51.282%
# bottomWood (main_bottom_a): left=-0.05%, top=67.339%, width=100.1%, height=36.178%
# statusHud (wallet_button_sensor): left=1.944%, top=66.581%, width=96.111%, height=17.949%
# spinFrame (spin_base): left=37.083%, top=77.051%, width=25.833%, height=12.5%
# btnBar: left=0%, top=75.551%, width=100%, height=24.449%

# 1. Top bar (wood top + multiplier bar area) - full width from y=0 to end of multBar
top_bar_box = pct_box(-0.05, 0, 100.1, 17.342)  # woodTop + multBar combined
save_crop('top-bar-orange.png', top_bar_box)

# 2. Multiplier bar area specifically  
mult_bar_box = pct_box(-0.05, 9.153, 100.1, 8.189)
save_crop('multiplier-bar-bg.png', mult_bar_box)

# 3. Extract individual multiplier values x1, x2, x3, x5
# The mult bar spans full width and contains 4 values evenly distributed
# In the screenshot, from the original, they appear at roughly:
# x1: left 25% of mult bar, x2: 40%, x3: 57%, x5: 75%
# Based on screenshot analysis:
mbar_left = CANVAS_LEFT
mbar_top = int(9.153 / 100 * CANVAS_H)
mbar_w = CANVAS_W
mbar_h = int(8.189 / 100 * CANVAS_H)

# The 4 multipliers in the mult bar row (equal spacing)
# From original screenshot, they appear at roughly x=120,195,270,355 in the 482px canvas
mult_positions = [
    ('mult-x1.png', 0.20, 0.18),   # (center_pct, half_width_pct)
    ('mult-x2.png', 0.39, 0.18),
    ('mult-x3.png', 0.59, 0.18),
    ('mult-x5.png', 0.79, 0.18),
]

for name, cx_pct, hw_pct in mult_positions:
    cx = mbar_left + int(cx_pct * mbar_w)
    hw = int(hw_pct * mbar_w)
    hh = int(mbar_h / 2 * 0.85)
    mcy = mbar_top + mbar_h // 2
    box = (max(0, cx - hw), max(0, mcy - hh), min(W, cx + hw), min(H, mcy + hh))
    save_crop(name, box)

# 4. Title 1024 ways
title_box = pct_box(20, 12.009, 60, 4)  
save_crop('top-title-1024.png', title_box)

# 5. Reel green (just the green area, no frame)
reel_green_box = pct_box(2.778, 16.85, 94.444, 51.282)
save_crop('reel-green.png', reel_green_box)

# 6. Bottom wood area
bottom_wood_box = pct_box(-0.05, 67.339, 100.1, 36.178)
save_crop('bottom-wood.png', bottom_wood_box)

# 7. Reel frame (use the already-identified unknown_242.jpg)
import shutil
reel_frame_src = 'pg_assets/unknown_242.jpg'
if os.path.exists(reel_frame_src):
    shutil.copy(reel_frame_src, f'{OUT_DIR}/reel-frame.png')
    print('  Copied reel-frame.png')

# 8. Spin button area
spin_box = pct_box(30, 75.0, 40, 16)
save_crop('btn-spin-frame.png', spin_box)

# 9. Buttons area (bottom bar)
btn_bar_box = pct_box(0, 75.551, 100, 24.449)
save_crop('btn-frame.png', btn_bar_box)

# 10. Individual buttons in the bottom bar
# From original: left buttons (turbo, minus), center (spin), right (+, auto, menu)
btn_top = int(76 / 100 * CANVAS_H)
btn_h = int(12 / 100 * CANVAS_H)
btn_y_center = btn_top + btn_h // 2

btn_defs = [
    ('btn-turbo.png',   0.13, 0.07),
    ('btn-minus.png',   0.29, 0.07),
    ('btn-plus.png',    0.68, 0.07),
    ('btn-auto.png',    0.84, 0.07),
    ('icon-menu.png',   0.95, 0.04),
]
for bname, cx_pct, hw_pct in btn_defs:
    cx = CANVAS_LEFT + int(cx_pct * CANVAS_W)
    hw = int(hw_pct * CANVAS_W)
    box = (cx - hw, btn_y_center - hw, cx + hw, btn_y_center + hw)
    save_crop(bname, box)

print(f'\nDone! Saved to {OUT_DIR}')
print('Note: free-spin variants will use same images')

# Copy some images as free-spin variants
shutil.copy(f'{OUT_DIR}/top-bar-orange.png', f'{OUT_DIR}/multiplier-bar-bg-free.png')
print('  Created multiplier-bar-bg-free.png')
