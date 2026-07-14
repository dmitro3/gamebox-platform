from PIL import Image
import os, numpy as np

# ic_win might be a standalone PNG (60x60)
# Also list all icons that are exactly 60x60 or similar sizes

print('All 60x60 ish PNG files:')
for fname in sorted(os.listdir('scripts/pg_assets')):
    if not fname.endswith('.png'):
        continue
    try:
        img = Image.open(f'scripts/pg_assets/{fname}')
        w, h = img.size
        if 55 <= w <= 70 and 55 <= h <= 70:
            arr = np.array(img.convert('RGBA'))
            alpha = arr[:,:,3].mean()
            white = ((arr[:,:,0]>200)&(arr[:,:,1]>200)&(arr[:,:,2]>200)&(arr[:,:,3]>100)).mean()
            print(f'  {fname}: {w}x{h} alpha={alpha:.0f} white={white:.2f}')
    except:
        pass

print()
print('Searching for win-related standalone files:')
for fname in sorted(os.listdir('scripts/pg_assets')):
    nl = fname.lower()
    if 'win' in nl or 'trophy' in nl or 'prize' in nl or 'cup' in nl or 'ic_' in nl:
        if fname.endswith('.png'):
            try:
                img = Image.open(f'scripts/pg_assets/{fname}')
                print(f'  {fname}: {img.size}')
            except:
                pass
