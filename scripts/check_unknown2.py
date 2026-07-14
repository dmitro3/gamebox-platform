from PIL import Image
import os

files = [
    'unknown_267.png',   # 228x256
    'unknown_269.png',   # 124x1604  
    'unknown_278.jpg',   # 813x813
    'unknown_288.jpg',   # 813x251
    'unknown_294.jpg',   # 117x55
    'unknown_298.png',   # 1029x1029
    'unknown_302.jpg',   # 341x218
    'unknown_307.png',   # 240x612
    'unknown_315.jpg',   # 275x275
    'unknown_316.jpg',   # 650x650
    'unknown_331.jpg',   # 962x902
    'unknown_344.jpg',   # 432x432
    'unknown_345.jpg',   # 1978x1978
    'unknown_356.png',   # 864x864
    'unknown_363.jpg',   # 1013x868
    'unknown_365.jpg',   # 1818x1818
]

os.makedirs('pg_assets/sprites', exist_ok=True)

for fname in files:
    path = f'pg_assets/{fname}'
    if os.path.exists(path):
        img = Image.open(path)
        thumb = img.copy()
        thumb.thumbnail((240, 180))
        out = f'pg_assets/sprites/preview2_{fname}'
        thumb.save(out)
        print(f'{fname} ({img.size}) -> preview saved')
