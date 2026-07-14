from PIL import Image
import os

LOCALE = 'scripts/pg_assets/lib__setting_menu__texture__hd__zh__setting_menu_locale.png'
ATLAS75 = 'scripts/atlas_75e507.png'
OUT = 'client-app/public/images/games/mahjong/pg/ui'

locale = Image.open(LOCALE).convert('RGBA')
atlas75 = Image.open(ATLAS75).convert('RGBA')

# From setting_menu_locale plist (zh)
locale_crops = {
    'label-turbo-off': (203, 1, 90, 90),
    'label-turbo-on': (295, 1, 90, 90),
    'label-auto': (111, 1, 90, 90),
}

atlas75_crops = {
    'btn-turbo-bg': (336, 331, 90, 90),
    'btn-minus': (305, 1, 108, 108),
    'btn-plus': (6, 183, 108, 108),
    'btn-auto-center': (446, 203, 90, 90),
    'btn-auto-arrow': (630, 145, 66, 63),
    'auto-shadow': (635, 1, 70, 70),
    'btn-menu': (446, 111, 90, 90),
}

for name, (x, y, w, h) in locale_crops.items():
    crop = locale.crop((x, y, x+w, y+h))
    path = f'{OUT}/{name}.png'
    crop.save(path)
    print('saved locale', path, crop.size)

for name, (x, y, w, h) in atlas75_crops.items():
    crop = atlas75.crop((x, y, x+w, y+h))
    path = f'{OUT}/{name}.png'
    crop.save(path)
    print('saved atlas75', path, crop.size)

# spin_base from spin atlas
import urllib.request
SPIN = 'scripts/atlas_spin.d10ff.png'
if not os.path.exists(SPIN):
    url = 'https://www.pgf-nvgais.com/65/assets/resources/native/2f/2f32ef15-62a7-48a1-a1c6-3f1c2c0ad4f8.d10ff.png'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    open(SPIN, 'wb').write(urllib.request.urlopen(req, timeout=20).read())

spin = Image.open(SPIN).convert('RGBA')
# rotated=True rect [1,189,186,195] -> in Cocos rotated means w/h swapped in atlas storage
x, y, w, h = 1, 189, 186, 195
crop = spin.crop((x, y, x+w, y+h)).rotate(90, expand=True)
crop.save(f'{OUT}/btn-spin-frame.png')
print('saved spin', crop.size)
