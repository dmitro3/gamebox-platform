from PIL import Image
import numpy as np

locale = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__zh__setting_menu_locale.png').convert('RGBA')
w, h = locale.size

# Gap at x=386-389 separates the circle icons from the award badge
# Award badge: x=390-444, y=0-97
icon = locale.crop((390, 0, 444, 97))

# Preview on dark background
dark = Image.new('RGBA', (icon.size[0]*6, icon.size[1]*6), (40, 20, 8, 255))
icon_large = icon.resize((icon.size[0]*6, icon.size[1]*6), Image.LANCZOS)
dark.paste(icon_large, (0, 0), icon_large)
dark.save('scripts/preview_ic_win_final.png')
print(f'Icon size: {icon.size}')

# Save as 60x60
icon_60 = icon.resize((60, 60), Image.LANCZOS)
icon_60.save('client-app/public/images/games/mahjong/pg/ui/icon-win.png')
print('Saved icon-win.png 60x60')

# Also save comparison of all 3 icons on dark bg
atlas_sm = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__setting_menu.png').convert('RGBA')
ic_wallet = atlas_sm.crop((472, 419, 532, 479))
ic_chip = atlas_sm.crop((490, 357, 550, 417))
ic_win = icon_60

strip = Image.new('RGBA', (200, 70), (40, 20, 8, 255))
for i, ico in enumerate([ic_wallet, ic_chip, ic_win]):
    strip.paste(ico.resize((60,60), Image.LANCZOS), (i*65+5, 5), ico.resize((60,60), Image.LANCZOS))
strip.save('scripts/preview_final_hud_icons.png')
print('Saved comparison strip')
