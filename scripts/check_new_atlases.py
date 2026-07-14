from PIL import Image
import numpy as np, os

# Check newly downloaded atlases for ic_win at [742,3,60,60]
# and also view them to identify content
new_files = [
    '03ad56a3-4bda-4204-9d2c-37ed4d38e249.ffa25.png',  # 758x1668
    '3c02cdc3-0697-43d9-ad79-2cce25e0efeb.44816.png',  # 756x1638
    '3a86452c-ea91-482c-9947-9be84128f230.76e69.png',  # 756x1051
    '3d039d70-4483-4e81-8c2a-723f3e86a819.36c36.png',  # 736x341
    '0b4ae3cc-5d5a-4da1-92d8-8203ee193674.dc619.png',  # 660x660
    '28cb599e-6289-4433-a4ee-fc393dad8356.26ff7.png',  # 1029x1029
]

for fname in new_files:
    path = f'scripts/pg_assets/{fname}'
    if not os.path.exists(path):
        print(f'MISSING: {fname}')
        continue
    try:
        img = Image.open(path).convert('RGBA')
        w, h = img.size
        arr = np.array(img)
        alpha_overall = arr[:,:,3].mean()
        
        # Check top portion for white icon-like content
        if h >= 200 and w >= 200:
            top = img.crop((0, 0, min(w, 900), min(h, 200)))
            arr_top = np.array(top)
            white_top = ((arr_top[:,:,0]>200)&(arr_top[:,:,1]>200)&(arr_top[:,:,2]>200)&(arr_top[:,:,3]>100)).mean()
        else:
            white_top = 0
        
        print(f'{fname[:30]}: {w}x{h} alpha={alpha_overall:.0f} top_white={white_top:.2f}')
        
        # Save small preview of top 200px
        if h >= 100 and w >= 100:
            preview = img.crop((0, 0, min(w, 800), min(h, 200)))
            preview.save(f'scripts/preview_new_{fname[:20]}.png')
    except Exception as e:
        print(f'ERROR {fname}: {e}')
