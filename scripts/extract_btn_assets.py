import json, urllib.request, os
from PIL import Image

ATLAS = 'scripts/atlas_75e507.png'
if not os.path.exists(ATLAS):
    url = 'https://www.pgf-nvgais.com/65/assets/resources/native/75/75e507a6-3bc5-4aa1-89ff-8fc31c86ef0c.f8847.png'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    open(ATLAS, 'wb').write(urllib.request.urlopen(req, timeout=20).read())

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    sp = json.load(f).get('spriteFrames', {})

img = Image.open(ATLAS)
OUT = 'client-app/public/images/games/mahjong/pg/ui'

items = {
    'btn-turbo-bg': 'btn_turbo_bg',
    'center-turbo-off': 'center_turbo_off',
    'btn-auto-center': 'center_autoplay',
    'btn-auto-arrow': 'auto_arrow',
    'btn-menu': 'btn_menu',
    'auto-shadow': 'auto_shadow',
    'btn-minus': 'btn_minus',
    'btn-plus': 'btn_add',
}

for out_name, sprite_name in items.items():
    for uid, info in sp.items():
        if info.get('name') != sprite_name:
            continue
        au = info.get('atlasUrl')
        if au and '75e507' not in au:
            print('skip', sprite_name, 'wrong atlas')
            continue
        x, y, w, h = info['rect']
        crop = img.crop((x, y, x+w, y+h))
        path = f'{OUT}/{out_name}.png'
        crop.save(path)
        print('saved', path, crop.size)
        break

# spin_base from other atlas
SPIN_ATLAS = 'scripts/atlas_spin.d10ff.png'
if not os.path.exists(SPIN_ATLAS):
    url = 'https://www.pgf-nvgais.com/65/assets/resources/native/15/1562a7-48a1-a1c6-3f1c2c0ad4f8.d10ff.png'
    # fix url from dump
    url = 'https://www.pgf-nvgais.com/65/assets/resources/native/15/1562a7-48a1-a1c6-3f1c2c0ad4f8.d10ff.png'
