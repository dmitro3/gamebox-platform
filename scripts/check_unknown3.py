from PIL import Image
import os

files = [
    'unknown_376.jpg',   # 1516x1740
    'unknown_377.jpg',   # 1548x1548
    'unknown_380.jpg',   # 610x610
    'unknown_386.png',   # 1007x1686
    'unknown_419.png',   # 408x408
    'unknown_434.png',   # 503x503
    'unknown_435.png',   # 448x448
    'unknown_446.jpg',   # 1606x1606
    'unknown_459.jpg',   # 912x950
    'unknown_471.png',   # 763x763
    'unknown_476.jpg',   # 864x864
    'unknown_480.jpg',   # 1310x1310
    'unknown_485.png',   # 351x790
    'unknown_486.png',   # 40x40
    'unknown_493.jpg',   # 140x140
    'unknown_513.jpg',   # 314x916
    'unknown_520.jpg',   # 1736x1736
    'unknown_527.jpg',   # 1403x691
    'unknown_542.jpg',   # 1837x1837
    'unknown_546.jpg',   # 326x1265
    'unknown_549.jpg',   # 543x219
    'unknown_554.png',   # 40x40
    'unknown_561.png',   # 256x342
    'unknown_567.jpg',   # 355x825
    'unknown_574.jpg',   # 878x878
    'unknown_572.png',   # 100x100
]

os.makedirs('pg_assets/sprites', exist_ok=True)
for fname in files:
    path = f'pg_assets/{fname}'
    if os.path.exists(path):
        img = Image.open(path)
        thumb = img.copy()
        thumb.thumbnail((200, 150))
        out = f'pg_assets/sprites/preview3_{fname}'
        thumb.save(out)
        print(f'{fname} ({img.size})')
    else:
        print(f'{fname} NOT FOUND')
