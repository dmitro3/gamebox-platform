#!/usr/bin/env python3
"""
根据精灵帧坐标，从对应图集裁剪各个符号并部署到 client-app
"""
from PIL import Image
import os, shutil

# ── 纹理 UUID → 本地文件路径映射 ──────────────────────────────────────────────
ASSETS = 'pg_assets'
UUID_TO_FILE = {
    '3856b7c5-0c59-4514-9770-eb3e800f4e09': 'texture__symbols__symbols.png',  # 主符号图集
    'a9f0710a-15a5-48b3-8ac6-a5a40a520b1f': 'texture__symbols__feature_symbols.png',  # 特效符号图集
    '02186b2c-cd37-4300-9a31-0688800f79dc': 'unknown_242.jpg',   # reel_a 转轴
    'f3db3462-ca16-4892-872b-09b04c92467f': 'unknown_113.jpg',   # reel_glow (猜测)
    '6737e5a0-4b0b-4887-8c8b-de2915097fa8': 'texture__6737e5a0.png',  # 主背景图集
    '3d039d70-4483-4e81-8c2a-723f3e86a819': 'texture__3d039d70.png',  # infoboard 图集
}

# 从 pg_assets 自动查找文件（根据 UUID 前8位）
def find_file(uuid):
    short = uuid[:8]
    for fn in os.listdir(ASSETS):
        if fn.startswith('texture__'+short) or fn.startswith('unknown_') or uuid[:8] in fn:
            return os.path.join(ASSETS, fn)
    # Try _manifest.json
    try:
        import json
        with open(os.path.join(ASSETS, '_manifest.json')) as f:
            mfst = json.load(f)
        for path, fn in mfst.items():
            if fn and uuid[:8] in fn:
                return os.path.join(ASSETS, fn)
    except:
        pass
    return None

# ── 精灵帧定义（name: texUuid, rect=[x,y,w,h]） ────────────────────────────────
SPRITES = {
    # 主符号图集 3856b7c5 (1097x502)
    'h_char_8':            ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [1, 1, 162, 190]),
    'h_green':             ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [1, 193, 162, 190]),
    'h_red':               ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [165, 1, 162, 190]),
    'h_white':             ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [165, 193, 162, 190]),
    'l_ball_2':            ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [329, 1, 162, 190]),
    'l_ball_5':            ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [329, 193, 162, 190]),
    'l_bamboo_2':          ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [493, 1, 162, 190]),
    'l_bamboo_5':          ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [493, 193, 162, 190]),
    'symbol_base_gold':    ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [657, 1, 162, 190]),
    'symbol_base_ingot':   ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [657, 193, 162, 190]),
    'symbol_base_white':   ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [821, 1, 162, 190]),
    'symbol_base_white_blur': ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [985, 1, 111, 147]),
    'symbol_base_gold_blur': ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [821, 193, 114, 149]),
    'symbol_base_gold_ingot': ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [985, 150, 51, 39]),
    'symbol_base_ingot_blur': ('3856b7c5-0c59-4514-9770-eb3e800f4e09', [947, 331, 116, 136]),
    's_wild':              ('a9f0710a-15a5-48b3-8ac6-a5a40a520b1f', [165, 1, 162, 190]),
    's_scatter':           ('a9f0710a-15a5-48b3-8ac6-a5a40a520b1f', [1014, 3, 162, 190]),
    's_wild_blur':         ('a9f0710a-15a5-48b3-8ac6-a5a40a520b1f', [329, 119, 116, 136]),
    's_scatter_blur':      ('a9f0710a-15a5-48b3-8ac6-a5a40a520b1f', [329, 1, 116, 136]),
}

# ── 目标游戏路径映射 ─────────────────────────────────────────────────────────
GAME_SYMBOLS_DIR = r'..\client-app\public\images\games\mahjong\classic\symbols'
GAME_GOLDEN_DIR  = r'..\client-app\public\images\games\mahjong\classic\symbols-golden'

# sprite name → game output name (classic)
SYMBOL_MAP_CLASSIC = {
    'h_char_8':   '8w',         # 8万
    'h_green':    'fa',         # 发财 (green)
    'h_red':      'zhong',      # 中 (red)
    'h_white':    'bai',        # 白板
    'l_ball_2':   '2t',         # 2筒
    'l_ball_5':   '5t',         # 5筒
    'l_bamboo_2': '2s',         # 2索
    'l_bamboo_5': '5s',         # 5索
    's_wild':     'wild',       # 百搭
    's_scatter':  'hu',         # 胡 scatter
}

# golden variants - base + gold overlay
SYMBOL_MAP_GOLDEN = {
    'h_char_8':   '8w',
    'h_green':    'fa',
    'h_red':      'zhong',
    'h_white':    'bai',
    'l_ball_2':   '2t',
    'l_ball_5':   '5t',
    'l_bamboo_2': '2s',
    'l_bamboo_5': '5s',
    's_wild':     'wild',
    's_scatter':  'hu',
}

# ── Load textures ──────────────────────────────────────────────────────────────
loaded = {}
def get_tex(uuid):
    if uuid in loaded:
        return loaded[uuid]
    fname = UUID_TO_FILE.get(uuid)
    if fname:
        fpath = os.path.join(ASSETS, fname)
    else:
        fpath = find_file(uuid)
    if fpath and os.path.exists(fpath):
        img = Image.open(fpath).convert('RGBA')
        loaded[uuid] = img
        print(f'  Loaded {fpath}  {img.size}')
        return img
    print(f'  NOT FOUND: {uuid}')
    return None

# ── Crop sprite ────────────────────────────────────────────────────────────────
def crop_sprite(name):
    if name not in SPRITES:
        return None
    uuid, rect = SPRITES[name]
    x, y, w, h = rect
    tex = get_tex(uuid)
    if tex is None:
        return None
    # Cocos uses bottom-left origin, PIL uses top-left → flip y
    img_h = tex.height
    top = img_h - y - h
    cropped = tex.crop((x, top, x + w, top + h))
    return cropped

# ── Create golden version (composite with gold base) ──────────────────────────
def make_golden(name):
    symbol_img = crop_sprite(name)
    if symbol_img is None:
        return None
    gold_base = crop_sprite('symbol_base_gold')
    if gold_base is None:
        return symbol_img
    # Resize gold_base to match symbol size
    gold_resized = gold_base.resize(symbol_img.size, Image.LANCZOS)
    # Composite: gold base first, then symbol on top
    result = Image.new('RGBA', symbol_img.size, (0, 0, 0, 0))
    result.paste(gold_resized, (0, 0))
    result.paste(symbol_img, (0, 0), symbol_img)
    return result

# ── Deploy ─────────────────────────────────────────────────────────────────────
os.makedirs(GAME_SYMBOLS_DIR, exist_ok=True)
os.makedirs(GAME_GOLDEN_DIR, exist_ok=True)

print('=== Cropping and deploying symbols ===')
for sprite_name, out_name in SYMBOL_MAP_CLASSIC.items():
    img = crop_sprite(sprite_name)
    if img:
        out_path = os.path.join(GAME_SYMBOLS_DIR, out_name + '.png')
        img.save(out_path, 'PNG', optimize=True)
        print(f'  SAVED: {out_path}  ({img.size})')
    else:
        print(f'  SKIP (no img): {sprite_name}')

print()
print('=== Cropping and deploying golden symbols ===')
for sprite_name, out_name in SYMBOL_MAP_GOLDEN.items():
    img = make_golden(sprite_name)
    if img:
        out_path = os.path.join(GAME_GOLDEN_DIR, out_name + '.png')
        img.save(out_path, 'PNG', optimize=True)
        print(f'  SAVED: {out_path}  ({img.size})')
    else:
        print(f'  SKIP: {sprite_name}')

# ── Also save individual atlas crops to pg_assets/sprites ─────────────────────
SPRITES_OUT = os.path.join(ASSETS, 'sprites')
os.makedirs(SPRITES_OUT, exist_ok=True)
for name in SPRITES:
    img = crop_sprite(name)
    if img:
        img.save(os.path.join(SPRITES_OUT, name + '.png'))

print(f'\nAll sprites also saved to {SPRITES_OUT}/')
