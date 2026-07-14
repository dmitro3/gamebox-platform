from PIL import Image, ImageDraw
import numpy as np

atlas = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__setting_menu.png').convert('RGBA')

icons = {
    'ic_chip':        (490, 357, 60, 60),
    'ic_wallet_open': (472, 419, 60, 60),
    'ic_paytable':    (116, 403, 108, 108),
    'ic_rule':        (226, 149, 108, 108),
}

# Create a comparison strip on dark background
strip_w = len(icons) * 130
strip_h = 130
strip = Image.new('RGBA', (strip_w, strip_h), (40, 20, 8, 255))

x_offset = 0
for name, (x, y, w, h) in icons.items():
    crop = atlas.crop((x, y, x+w, y+h))
    # Center in 120x120 area
    cx = x_offset + (120 - w) // 2
    cy = (strip_h - h) // 2
    strip.paste(crop, (cx, cy), crop)
    x_offset += 130

strip.save('scripts/preview_icons_on_dark.png')
print('Saved preview_icons_on_dark.png')
print('Order: ic_chip, ic_wallet_open, ic_paytable, ic_rule')
