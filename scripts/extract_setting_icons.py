from PIL import Image
import numpy as np

atlas = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__setting_menu.png').convert('RGBA')

icons = {
    'ic_chip':          (490, 357, 60, 60),
    'ic_wallet_open':   (472, 419, 60, 60),
    'ic_paytable':      (116, 403, 108, 108),
    'ic_rule':          (226, 149, 108, 108),
    'ic_close':         (6, 293, 108, 108),
    'bg_round_solid':   (428, 357, 60, 60),
    'bg_round_border':  (570, 295, 60, 60),
}

for name, (x, y, w, h) in icons.items():
    crop = atlas.crop((x, y, x+w, y+h))
    crop.save(f'scripts/preview_{name}.png')
    arr = np.array(crop)
    alpha = arr[:,:,3].mean()
    white = ((arr[:,:,0]>200)&(arr[:,:,1]>200)&(arr[:,:,2]>200)&(arr[:,:,3]>100)).mean()
    print(f'{name}: alpha={alpha:.0f} white={white:.2f}')
