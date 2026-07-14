from PIL import Image
import os

# View the full setting_menu atlas to identify all ic_ icons
atlas = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__setting_menu.png').convert('RGBA')
print(f'Atlas size: {atlas.size}')

# Show all known sprite positions
sprites = {
    'ic_chip': (490, 357, 60, 60),
    'ic_wallet_open': (472, 419, 60, 60),
}

for name, (x, y, w, h) in sprites.items():
    crop = atlas.crop((x, y, x+w, y+h))
    crop.save(f'scripts/preview_{name}.png')
    import numpy as np
    arr = np.array(crop)
    alpha = arr[:,:,3].mean()
    print(f'{name}: alpha={alpha:.0f}')

# Save the full atlas for inspection
atlas.save('scripts/preview_setting_menu_full.png')
print('Saved full atlas to scripts/preview_setting_menu_full.png')
