import json, urllib.request
from PIL import Image
import os

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

# Get main_bottom_a and main_bottom_b rects from spriteFrames
sp = data.get('spriteFrames', {})
for uid, info in sp.items():
    if info.get('name') in ('main_bottom_a', 'main_bottom_b'):
        print(info)
        atlas_url = info['atlasUrl']
        rect = info['rect']
        print()

atlas_url = 'https://www.pgf-nvgais.com/65/assets/resources/native/67/6737e5a0-4b0b-4887-8c8b-de2915097fa8.f1b49.png'
local = 'scripts/atlas_6737e5.png'
if not os.path.exists(local):
    req = urllib.request.Request(atlas_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=20) as r:
        open(local, 'wb').write(r.read())

img = Image.open(local)
print('Atlas size:', img.size)

for name, rect in [('main_bottom_a', None), ('main_bottom_b', None)]:
    for uid, info in sp.items():
        if info.get('name') == name:
            rect = info['rect']
            break
    x, y, w, h = rect
    crop = img.crop((x, y, x+w, y+h))
    out = f'scripts/{name}_crop.png'
    crop.save(out)
    print(f'Saved {out} size={crop.size}')
