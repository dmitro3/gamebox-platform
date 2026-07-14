from PIL import Image
import numpy as np

# View the newly downloaded atlas files to identify content
files = [
    ('03ad56a3-4bda-4204-9d2c-37ed4d38e249.ffa25.png', '758x1668'),
    ('3c02cdc3-0697-43d9-ad79-2cce25e0efeb.44816.png', '756x1638'),
    ('3a86452c-ea91-482c-9947-9be84128f230.76e69.png', '756x1051'),
]

for fname, size in files:
    path = f'scripts/pg_assets/{fname}'
    img = Image.open(path).convert('RGBA')
    print(f'{fname}: {img.size}')
    
    # Check the top 200px for white icon content (where ic_win might be if at y=3)
    # ic_win would be at [742,3,802,63] - but these are ~756px wide, too narrow
    
    # Save a full view scaled down  
    scale = 200 / img.size[0]
    new_w = 200
    new_h = int(img.size[1] * scale)
    thumb = img.resize((new_w, min(new_h, 400)), Image.LANCZOS)
    thumb.save(f'scripts/preview_full_{fname[:15]}.png')
    print(f'  Saved thumbnail {thumb.size}')

# Also check the dump summary field
import json
with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)
summary = dump.get('summary', {})
print(f'\nDump summary keys: {list(summary.keys()) if isinstance(summary, dict) else type(summary)}')
if isinstance(summary, dict):
    for k, v in summary.items():
        if isinstance(v, str) and len(v) < 200:
            print(f'  {k}: {v}')
        else:
            print(f'  {k}: {type(v).__name__} len={len(str(v))}')
