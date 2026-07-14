from PIL import Image

atlas = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__setting_menu.png').convert('RGBA')

# ic_paytable at [116, 403, 108, 108] - resize to 60x60
ic_paytable = atlas.crop((116, 403, 116+108, 403+108))
ic_paytable_small = ic_paytable.resize((60, 60), Image.LANCZOS)
ic_paytable_small.save('client-app/public/images/games/mahjong/pg/ui/icon-win.png')
ic_paytable_small.save('scripts/preview_ic_paytable_60.png')
print('Saved ic_paytable 60x60 as icon-win.png')

# Also preview all 4 icons side by side on dark bg for comparison
from PIL import ImageDraw

icons_data = {
    'ic_chip':        atlas.crop((490, 357, 550, 417)),
    'ic_wallet_open': atlas.crop((472, 419, 532, 479)),
    'ic_paytable':    ic_paytable_small,
    'ic_rule':        atlas.crop((226, 149, 226+108, 149+108)).resize((60,60), Image.LANCZOS),
}

strip = Image.new('RGBA', (4*80, 80), (60, 30, 10, 255))
for i, (name, ico) in enumerate(icons_data.items()):
    x = i*80 + 10
    y = 10
    strip.paste(ico, (x, y), ico)

strip.save('scripts/preview_all_icons.png')
print('Saved comparison strip')
