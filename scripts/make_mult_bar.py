#!/usr/bin/env python3
"""
从 unknown_386.png 右侧木质纹理提取倍数栏背景
并修正 top-bar-orange.png
"""
from PIL import Image, ImageFilter
import os, shutil

ASSETS = 'pg_assets'
OUT_DIR = '../client-app/public/images/games/mahjong/pg/ui'

bg = Image.open(f'{ASSETS}/unknown_386.png')
BG_W, BG_H = bg.size  # 1007 x 1686
print(f'Background: {BG_W}x{BG_H}')

# The wooden panel texture is at the RIGHT side of the background image
# x range ~850-1007 shows the wooden panel
wood_strip = bg.crop((820, 0, BG_W, BG_H))
print(f'Wood strip: {wood_strip.size}')

# Scale factors for canvas mapping
CANVAS_W = 482
CANVAS_H = 1045
BG_DISP_H = CANVAS_H * 1.03517  # 1082px
scale_y = BG_DISP_H / BG_H  # 1082/1686 = 0.642

def display_y_to_img_y(display_pct):
    display_y = display_pct / 100 * CANVAS_H
    return int(display_y / scale_y)

# Extract mult bar wooden background (y=149 to 282 in bg image)
# But since we're using the wood strip (right edge), we use same y coordinates
mb_top = display_y_to_img_y(9.153)
mb_bottom = display_y_to_img_y(17.342)
print(f'Mult bar in bg: y={mb_top} to {mb_bottom}')

# Crop wooden strip at mult bar height
wood_mult = wood_strip.crop((0, mb_top, wood_strip.width, mb_bottom))
# Tile/stretch to full canvas width
target_h = mb_bottom - mb_top
wood_tile = wood_mult.resize((CANVAS_W, target_h), Image.LANCZOS)
wood_tile.save(f'{OUT_DIR}/top-bar-orange.png')
wood_tile.save(f'{OUT_DIR}/multiplier-bar-bg.png')
wood_tile.save(f'{OUT_DIR}/multiplier-bar-bg-free.png')
print(f'  Saved top-bar-orange.png: {wood_tile.size}')

# Extract bottom wood panel
bw_top = display_y_to_img_y(67.339)
bw_bottom = min(BG_H, display_y_to_img_y(103.517))
wood_bottom = wood_strip.crop((0, bw_top, wood_strip.width, bw_bottom))
bw_h = int(36.178 / 100 * CANVAS_H)
wood_bottom_r = wood_bottom.resize((CANVAS_W, bw_h), Image.LANCZOS)
wood_bottom_r.save(f'{OUT_DIR}/bottom-wood.png')
print(f'  Saved bottom-wood.png: {wood_bottom_r.size}')

# Extract top wood panel 
wt_bottom = display_y_to_img_y(15.094)
wood_top = wood_strip.crop((0, 0, wood_strip.width, wt_bottom))
wt_h = int(15.094 / 100 * CANVAS_H)
wood_top_r = wood_top.resize((CANVAS_W, wt_h), Image.LANCZOS)
wood_top_r.save(f'{OUT_DIR}/top-wood.png')
print(f'  Saved top-wood.png: {wood_top_r.size}')

print('\nDone! Wood textures extracted')
