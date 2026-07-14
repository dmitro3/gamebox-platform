#!/usr/bin/env python3
"""
从正版 atlas 裁剪所有符号 + 牌面背景，部署到 client-app
主 symbols atlas: texture__symbols__symbols.png (1097x502)
feature atlas:    texture__symbols__zh__feature_symbols.png (466x236)
"""
from PIL import Image
import os, shutil

ASSETS   = 'pg_assets'
MAIN_ATL = f'{ASSETS}/texture__symbols__symbols.png'
FEAT_ATL = f'{ASSETS}/texture__symbols__zh__feature_symbols.png'
OUT_DIR  = f'{ASSETS}/sprites'
DEST_STD = '../client-app/public/images/games/mahjong/classic/symbols'
DEST_GLD = '../client-app/public/images/games/mahjong/classic/symbols-golden'

os.makedirs(OUT_DIR, exist_ok=True)

def open_rgba(path):
    img = Image.open(path)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    return img

main = open_rgba(MAIN_ATL)
feat = open_rgba(FEAT_ATL)

print(f'main atlas: {main.size}')
print(f'feat atlas: {feat.size}')

# Cocos CC top-left origin: crop(x, y, x+w, y+h)
FRAMES = {
    # name:           (atlas,  x,    y,  w,   h )
    'symbol_base_white': (main, 821,   1, 162, 190),
    'symbol_base_gold':  (main, 657,   1, 162, 190),
    'symbol_base_ingot': (main, 657, 193, 162, 190),
    'h_char_8':          (main,   1,   1, 162, 190),  # 八万
    'h_green':           (main,   1, 193, 162, 190),  # 發
    'h_red':             (main, 165,   1, 162, 190),  # 中
    'h_white':           (main, 165, 193, 162, 190),  # 白
    'l_ball_2':          (main, 329,   1, 162, 190),  # 2饼
    'l_ball_5':          (main, 329, 193, 162, 190),  # 5饼
    'l_bamboo_2':        (main, 493,   1, 162, 190),  # 2条
    'l_bamboo_5':        (main, 493, 193, 162, 190),  # 5条
    's_scatter':         (feat,   1,   1, 162, 190),  # 胡 scatter (from feature atlas)
    's_wild':            (feat, 165,   1, 162, 190),  # 百搭 wild (from feature atlas)
}

# Deployment map: game symbol key → frame name
# Based on original game symbols:
# 8w=h_char_8, fa=h_green, zhong=h_red, bai=h_white
# 2s=l_bamboo_2, 5s=l_bamboo_5, 2t=l_ball_2, 5t=l_ball_5
# wild=s_wild, hu=s_scatter
SYMBOL_MAP = {
    '8w':   'h_char_8',
    'fa':   'h_green',
    'zhong':'h_red',
    'bai':  'h_white',
    '2s':   'l_bamboo_2',
    '5s':   'l_bamboo_5',
    '2t':   'l_ball_2',
    '5t':   'l_ball_5',
    'wild': 's_wild',
    'hu':   's_scatter',
}

def crop(frame_name):
    atlas, x, y, w, h = FRAMES[frame_name]
    return atlas.crop((x, y, x+w, y+h))

# 1) Save all frames individually
crops = {}
for name in FRAMES:
    c = crop(name)
    c.save(f'{OUT_DIR}/{name}.png')
    crops[name] = c
    print(f'  Cropped {name}: {c.size}')

# 2) Composite: put symbol ON TOP of tile base
# - Standard symbol = symbol_base_white + symbol_image
# - Golden symbol   = symbol_base_gold  + symbol_image

base_white = crops['symbol_base_white']
base_gold  = crops['symbol_base_gold']

def composite(base, symbol_img):
    """Composite symbol_img over base using alpha blending"""
    result = base.copy()
    result.paste(symbol_img, (0, 0), symbol_img)
    return result

# 3) Build final symbols and deploy
os.makedirs(DEST_STD, exist_ok=True)
os.makedirs(DEST_GLD, exist_ok=True)

for sym_key, frame_name in SYMBOL_MAP.items():
    sym_img = crops[frame_name]
    
    # Composite all symbols on white/gold base
    std_img = composite(base_white, sym_img)
    gld_img = composite(base_gold, sym_img)
    
    std_path = f'{DEST_STD}/{sym_key}.png'
    gld_path = f'{DEST_GLD}/{sym_key}.png'
    std_img.save(std_path)
    gld_img.save(gld_path)
    print(f'  Deployed {sym_key}.png (std + gold)')

# Also save tile bases
for key in ('symbol_base_white', 'symbol_base_gold', 'symbol_base_ingot'):
    crops[key].save(f'{DEST_STD}/{key}.png')
    print(f'  Deployed {key}.png')

print('\nDone! All symbols deployed.')
print(f'  Standard: {DEST_STD}')
print(f'  Golden:   {DEST_GLD}')
