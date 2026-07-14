#!/usr/bin/env python3
"""
从 unknown_386.png (1007x1686) 提取对应的 UI 区域
背景图缩放后: 483x1082px (在 482x1045 的 canvas 上)
"""
from PIL import Image
import os

ASSETS = 'pg_assets'
OUT_DIR = '../client-app/public/images/games/mahjong/pg/ui'
os.makedirs(OUT_DIR, exist_ok=True)

bg = Image.open(f'{ASSETS}/unknown_386.png')
BG_W, BG_H = bg.size  # 1007 x 1686
print(f'Background image: {BG_W} x {BG_H}')

# Canvas in browser: 482 x 1045px
CANVAS_W = 482
CANVAS_H = 1045

# bgImage display dimensions (from cocosLayout: widthPct=100.1, heightPct=103.517)
BG_DISP_W = CANVAS_W * 1.001  # ~482px
BG_DISP_H = CANVAS_H * 1.03517  # ~1082px

# Scale factors (image → display)
# When image is displayed at BG_DISP_W x BG_DISP_H:
scale_x = BG_DISP_W / BG_W  # 482/1007 = 0.479
scale_y = BG_DISP_H / BG_H  # 1082/1686 = 0.642

def display_y_to_img_y(display_pct):
    """Convert canvas percentage to image y coordinate"""
    display_y = display_pct / 100 * CANVAS_H
    img_y = display_y / scale_y
    return int(img_y)

def display_x_to_img_x(display_pct):
    """Convert canvas percentage to image x coordinate"""
    display_x = display_pct / 100 * CANVAS_W
    img_x = display_x / scale_x
    return int(img_x)

# multBar background (main_top_b): topPct=9.153%, heightPct=8.189%
mb_top = display_y_to_img_y(9.153)
mb_bottom = display_y_to_img_y(9.153 + 8.189)
print(f'multBar in bg image: y={mb_top} to {mb_bottom}')
mult_bar = bg.crop((0, mb_top, BG_W, mb_bottom))
# Resize to standard width
mult_bar_resized = mult_bar.resize((CANVAS_W, mb_bottom - mb_top), Image.LANCZOS)
mult_bar_resized.save(f'{OUT_DIR}/top-bar-orange.png')
mult_bar_resized.save(f'{OUT_DIR}/multiplier-bar-bg.png')
print(f'  Saved top-bar-orange.png: {mult_bar_resized.size}')

# Full top wood (woodTop): topPct=0%, heightPct=15.094%
wt_bottom = display_y_to_img_y(15.094)
wood_top = bg.crop((0, 0, BG_W, wt_bottom))
wood_top_r = wood_top.resize((CANVAS_W, wt_bottom), Image.LANCZOS)
wood_top_r.save(f'{OUT_DIR}/top-wood.png')
print(f'  Saved top-wood.png: {wood_top_r.size}')

# Bottom wood (main_bottom_a): topPct=67.339%, heightPct=36.178%
bw_top = display_y_to_img_y(67.339)
bw_bottom = display_y_to_img_y(103.517)  # end of bg image
bw_bottom = min(bw_bottom, BG_H)
bottom_wood = bg.crop((0, bw_top, BG_W, bw_bottom))
bw_h = int(36.178 / 100 * CANVAS_H)
bottom_wood_r = bottom_wood.resize((CANVAS_W, bw_h), Image.LANCZOS)
bottom_wood_r.save(f'{OUT_DIR}/bottom-wood.png')
print(f'  Saved bottom-wood.png: {bottom_wood_r.size}')

# Also save the full background
full_bg = bg.resize((CANVAS_W, CANVAS_H), Image.LANCZOS)
full_bg.save(f'{OUT_DIR}/bg-main.png')
print(f'  Saved bg-main.png: {full_bg.size}')

# Create free-spin variant of mult bar bg (same for now)
import shutil
shutil.copy(f'{OUT_DIR}/top-bar-orange.png', f'{OUT_DIR}/multiplier-bar-bg-free.png')
print('  Created multiplier-bar-bg-free.png')

print('\nDone! Extracted background regions from unknown_386.png')
