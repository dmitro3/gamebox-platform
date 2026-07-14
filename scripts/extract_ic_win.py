from PIL import Image
import os

# ic_chip and ic_wallet_open are in atlas 75e507a6 (setting_menu)
# ic_win has rect=[742, 3, 60, 60] - try extracting from same atlas

# Find the setting_menu atlas
atlas_path = None
for fname in sorted(os.listdir('scripts/pg_assets')):
    if not fname.endswith('.png'):
        continue
    try:
        img = Image.open(f'scripts/pg_assets/{fname}')
        w, h = img.size
        # setting_menu atlas is 706x512 (or similar), check known ic_chip at [490,357,60,60]
        if w >= 742 + 60 and h >= 3 + 60:
            crop = img.crop((490, 357, 550, 417))  # ic_chip rect
            import numpy as np
            arr = np.array(crop.convert('RGBA'))
            alpha = arr[:,:,3].mean()
            if alpha > 100:
                # Also check the ic_win rect area
                crop_win = img.crop((742, 3, 802, 63))
                arr_win = np.array(crop_win.convert('RGBA'))
                alpha_win = arr_win[:,:,3].mean()
                print(f'{fname}: {w}x{h} ic_chip alpha={alpha:.0f} ic_win alpha={alpha_win:.0f}')
                if alpha_win > 50:
                    crop_win.save('scripts/preview_ic_win.png')
                    crop_win.save('client-app/public/images/games/mahjong/pg/ui/ic_win.png')
                    print('  -> Saved ic_win.png')
    except Exception as e:
        pass
