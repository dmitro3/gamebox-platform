import json, urllib.request, os
from PIL import Image

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

textures = dump.get('textures', [])
print(f'Total textures: {len(textures)}')

# ic_win at [742,3,60,60] → needs atlas width > 802
# ic_hist at [356,3,108,108] → needs atlas width > 464
# Both start at y=3 → top of atlas

# List ALL textures that could contain ic_win (w>=802, h>=63)
print('\nAll textures that could contain ic_win (w>=802, h>=63):')
candidates = []
for t in textures:
    if isinstance(t, dict):
        w = t.get('w', 0)
        h = t.get('h', 0)
        url = t.get('url', '')
        if w >= 802 and h >= 63:
            candidates.append((w, h, url))
            print(f'  {w}x{h}  {url}')

# Also: the missing sprites ic_win and ic_hist have atlasUrl=NONE
# Maybe their atlas URL was not captured. Let's look for an atlas that has
# SIMILAR content to setting_menu (button/icon style)
# The setting_menu atlas is lib__setting_menu__texture__hd__setting_menu.png
# Maybe there's a ld (low def) version?

print('\nChecking if there are any setting_menu-like atlas files not yet downloaded:')
for t in textures:
    if isinstance(t, dict):
        url = t.get('url', '')
        w = t.get('w', 0)
        h = t.get('h', 0)
        # Setting menu atlas is 706x512 - look for similar aspect ratio panels
        if 500 <= w <= 1200 and 300 <= h <= 700:
            # Check if this file is in our pg_assets
            fname = url.split('/')[-1]
            exists = os.path.exists(f'scripts/pg_assets/{fname}')
            if not exists:
                print(f'  NOT DOWNLOADED: {w}x{h} {url[-60:]}')

print('\nNow trying to download each candidate that might contain ic_win...')
for w, h, url in candidates:
    if w <= 1200 and h <= 700:  # Skip very large square textures
        fname = url.split('/')[-1]
        out_path = f'scripts/pg_assets/{fname}'
        if not os.path.exists(out_path):
            print(f'  Downloading {w}x{h} {fname}...')
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=15) as r:
                    data = r.read()
                with open(out_path, 'wb') as f:
                    f.write(data)
                img = Image.open(out_path).convert('RGBA')
                # Check ic_win area [742,3,802,63]
                import numpy as np
                crop = img.crop((742, 3, 802, 63))
                arr = np.array(crop)
                alpha = arr[:,:,3].mean()
                white = ((arr[:,:,0]>200)&(arr[:,:,1]>200)&(arr[:,:,2]>200)&(arr[:,:,3]>100)).mean()
                print(f'    -> {img.size} alpha_at_icwin={alpha:.0f} white={white:.2f}')
                if white > 0.15:
                    crop.save(f'scripts/preview_icwin_from_{fname[:20]}.png')
                    print(f'    -> FOUND ic_win! Saved preview.')
            except Exception as e:
                print(f'    -> Failed: {e}')
