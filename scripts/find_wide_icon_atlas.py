from PIL import Image
import os, numpy as np

# ic_win at [742, 3, 60, 60] means atlas width >= 802
# Looking for white icons (like ic_chip/ic_wallet_open which are white on transparent)
print('Looking for atlas with width >= 802 containing white icons:')
for fname in sorted(os.listdir('scripts/pg_assets')):
    if not fname.endswith('.png'):
        continue
    try:
        img = Image.open(f'scripts/pg_assets/{fname}')
        w, h = img.size
        if w >= 802:
            arr = np.array(img.convert('RGBA'))
            # Check at ic_win position [742,3,802,63]
            crop = img.crop((742, 3, 802, 63))
            arr_crop = np.array(crop.convert('RGBA'))
            alpha = arr_crop[:,:,3].mean()
            white = ((arr_crop[:,:,0]>200)&(arr_crop[:,:,1]>200)&(arr_crop[:,:,2]>200)&(arr_crop[:,:,3]>100)).mean()
            if alpha > 30:
                print(f'  {fname}: {w}x{h} | at[742,3]: alpha={alpha:.0f} white={white:.2f}')
                if white > 0.2:
                    crop.save(f'scripts/preview_ic_win_from_{fname}.png')
                    print(f'    -> Saved preview!')
    except Exception as e:
        pass
