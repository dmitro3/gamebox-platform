from PIL import Image
import numpy as np, os

print('All ~60x60 PNG files in pg_assets:')
for fname in sorted(os.listdir('scripts/pg_assets')):
    if not fname.endswith('.png'):
        continue
    path = f'scripts/pg_assets/{fname}'
    try:
        img = Image.open(path).convert('RGBA')
        w, h = img.size
        if 45 <= w <= 120 and 45 <= h <= 120:
            arr = np.array(img)
            alpha = arr[:,:,3].mean()
            white = ((arr[:,:,0]>200)&(arr[:,:,1]>200)&(arr[:,:,2]>200)&(arr[:,:,3]>100)).mean()
            print(f'  {fname}: {w}x{h} alpha={alpha:.0f} white={white:.2f}')
    except:
        pass

# Also check if the 2f32ef15 atlas (240x612) might contain icons
print('\nChecking 2f32ef15 atlas (240x612)...')
path = 'scripts/pg_assets/2f32ef15-62a7-48a1-a1c6-3f1c2c0ad4f8.d10ff.png'
if os.path.exists(path):
    img = Image.open(path).convert('RGBA')
    print(f'Size: {img.size}')
    # Check top portion
    top = img.crop((0, 0, 240, 200))
    arr = np.array(top)
    white = ((arr[:,:,0]>200)&(arr[:,:,1]>200)&(arr[:,:,2]>200)&(arr[:,:,3]>100)).mean()
    print(f'Top 200px white_ratio={white:.2f}')
    top.save('scripts/preview_2f32ef15_top.png')
