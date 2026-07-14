from PIL import Image
import numpy as np, os

# Check unknown_245.png (if exists) vs 03ad56a3 (758x1668)
# Also check what the setting_menu locale files actually look like

for fname in ['unknown_245.png', '03ad56a3-4bda-4204-9d2c-37ed4d38e249.ffa25.png']:
    path = f'scripts/pg_assets/{fname}'
    if not os.path.exists(path):
        print(f'NOT FOUND: {fname}')
        continue
    img = Image.open(path).convert('RGBA')
    w, h = img.size
    arr = np.array(img)
    print(f'{fname}: {w}x{h} alpha_mean={arr[:,:,3].mean():.0f}')
    # Show HUD area (around 77.66% = ~1491px from top of 1920px design)
    # In a 758px wide screen preview, 77.66% = 600px from top
    # The HUD would be at about 592-630px from top
    if h > 600:
        hud_area = img.crop((0, int(h*0.75), w, int(h*0.85)))
        hud_area.save(f'scripts/preview_hud_from_{fname[:15]}.png')
        print(f'  Saved HUD area crop')

# Also view the setting_menu locale files more carefully
for fname in ['lib__setting_menu__texture__hd__setting_menu_locale.png',
              'lib__setting_menu__texture__hd__zh__setting_menu_locale.png']:
    path = f'scripts/pg_assets/{fname}'
    if not os.path.exists(path):
        continue
    img = Image.open(path).convert('RGBA')
    arr = np.array(img)
    alpha_nonzero = (arr[:,:,3] > 50).mean()
    print(f'\n{fname}: {img.size} nonzero_alpha={alpha_nonzero:.3f}')
    if alpha_nonzero > 0.01:
        # There's some content, show it on dark bg
        dark = Image.new('RGBA', img.size, (40, 20, 8, 255))
        dark.paste(img, (0,0), img)
        dark.save(f'scripts/preview_locale_{fname[:20]}.png')
        print(f'  Has content! Saved preview.')
