from PIL import Image
import os, numpy as np

# Find the setting_menu atlas (706x512) that contains ic_chip at [490,357,60,60] and ic_wallet_open at [472,419,60,60]
# Then check if ic_win at [742,3,60,60] is in a wider version of the same atlas

for fname in sorted(os.listdir('scripts/pg_assets')):
    if not fname.endswith('.png'):
        continue
    try:
        img = Image.open(f'scripts/pg_assets/{fname}')
        w, h = img.size
        # Check if ic_chip position [490,357] is within this image and has alpha content
        if w >= 550 and h >= 417:
            chip = img.crop((490, 357, 550, 417))
            arr = np.array(chip.convert('RGBA'))
            alpha_mean = arr[:,:,3].mean()
            # White pixel ratio (ic_chip is white icon)
            white_ratio = ((arr[:,:,0] > 200) & (arr[:,:,1] > 200) & (arr[:,:,2] > 200) & (arr[:,:,3] > 100)).mean()
            if white_ratio > 0.2:
                print(f'FOUND setting atlas: {fname} ({w}x{h}) chip_alpha={alpha_mean:.0f} white={white_ratio:.2f}')
                # Try ic_win at various known positions in the same atlas
                for x, y in [(742, 3), (0, 60), (60, 60), (120, 60), (180, 60)]:
                    if x+60 <= w and y+60 <= h:
                        crop = img.crop((x, y, x+60, y+60))
                        arr2 = np.array(crop.convert('RGBA'))
                        a = arr2[:,:,3].mean()
                        wr = ((arr2[:,:,0] > 200) & (arr2[:,:,1] > 200) & (arr2[:,:,2] > 200) & (arr2[:,:,3] > 100)).mean()
                        print(f'  [{x},{y}]: alpha={a:.0f} white={wr:.2f}')
    except Exception as e:
        pass

print()
print('Looking for larger atlas (w>742) that has setting-like icons...')
for fname in sorted(os.listdir('scripts/pg_assets')):
    if not fname.endswith('.png'):
        continue
    try:
        img = Image.open(f'scripts/pg_assets/{fname}')
        w, h = img.size
        if w > 800:
            arr = np.array(img.convert('RGBA'))
            # Check for white icons (ic_ sprites are white)
            white_ratio = ((arr[:,:,0] > 220) & (arr[:,:,1] > 220) & (arr[:,:,2] > 220) & (arr[:,:,3] > 100)).mean()
            if white_ratio > 0.05:
                print(f'  {fname}: {w}x{h} white_ratio={white_ratio:.3f}')
    except:
        pass
