import urllib.request, json, os
from PIL import Image

# The setting_menu atlas UUID is 75e507a6
# URL pattern: https://www.pgf-nvgais.com/65/assets/resources/native/75/75e507a6-3bc5-4aa1-89ff-8fc31c86ef0c.f8847.png

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

textures = dump.get('textures', [])
target_url = None
for t in textures:
    if isinstance(t, dict):
        url = t.get('url', '')
        if '75e507a6' in url:
            target_url = url
            print(f'Found: {url}  size={t.get("w")}x{t.get("h")}')

# Also look for any atlas that's ~802+ wide (could contain ic_win at x=742)
print('\nAll textures >= 802px wide:')
for t in textures:
    if isinstance(t, dict):
        w = t.get('w', 0)
        h = t.get('h', 0)
        url = t.get('url', '')
        if w >= 802 and h <= 600:  # likely a sprite sheet (not a square texture)
            print(f'  {w}x{h}  {url[-60:]}')

# Try to download the setting_menu atlas
if target_url:
    out_path = 'scripts/pg_assets/setting_menu_online.png'
    print(f'\nDownloading {target_url}...')
    try:
        req = urllib.request.Request(target_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as r:
            data = r.read()
        with open(out_path, 'wb') as f:
            f.write(data)
        img = Image.open(out_path)
        print(f'Downloaded! Size: {img.size}')
    except Exception as e:
        print(f'Download failed: {e}')
