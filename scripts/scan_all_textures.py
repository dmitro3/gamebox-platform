import json, urllib.request, os
from PIL import Image
import numpy as np

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

textures = dump.get('textures', [])

# Download and check ALL png textures from the game to find ic_win
# ic_win rect=[742,3,60,60] → white icon on transparent at that position
results = []

print(f'Total textures: {len(textures)}')
print('Downloading all PNG textures not yet in pg_assets...')

for t in textures:
    if not isinstance(t, dict):
        continue
    url = t.get('url', '')
    w = t.get('w', 0)
    h = t.get('h', 0)
    
    if not url.endswith('.png'):
        continue
    
    fname = url.split('/')[-1]
    out_path = f'scripts/pg_assets/{fname}'
    
    # Skip very large textures
    if w > 2100 or h > 2100:
        continue
    
    if not os.path.exists(out_path):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as r:
                data = r.read()
            with open(out_path, 'wb') as f:
                f.write(data)
            print(f'  Downloaded: {fname} ({w}x{h})')
        except Exception as e:
            print(f'  FAILED: {fname}: {e}')

print('\nNow checking ALL png files for ic_win at [742,3,60,60]...')
for fname in sorted(os.listdir('scripts/pg_assets')):
    if not fname.endswith('.png'):
        continue
    try:
        img = Image.open(f'scripts/pg_assets/{fname}').convert('RGBA')
        w, h = img.size
        if w < 802 or h < 63:
            continue
        crop = img.crop((742, 3, 802, 63))
        arr = np.array(crop)
        alpha = arr[:,:,3].mean()
        white = ((arr[:,:,0]>200)&(arr[:,:,1]>200)&(arr[:,:,2]>200)&(arr[:,:,3]>100)).mean()
        if white > 0.10:
            print(f'  CANDIDATE: {fname} ({w}x{h}) white={white:.2f}')
            crop.save(f'scripts/preview_icwin_candidate_{fname[:15]}.png')
    except:
        pass
print('Done.')
