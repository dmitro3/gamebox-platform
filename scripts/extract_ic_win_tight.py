from PIL import Image
import numpy as np

locale = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__zh__setting_menu_locale.png').convert('RGBA')
arr = np.array(locale)

# Find tight bounds of the award badge (x=390-444)
icon_region = locale.crop((390, 0, 444, 110))
icon_arr = np.array(icon_region)

# Find rows with content
rows_with_alpha = np.where(icon_arr[:,:,3].max(axis=1) > 10)[0]
if len(rows_with_alpha) > 0:
    y_min = rows_with_alpha.min()
    y_max = rows_with_alpha.max() + 1
    print(f'Content rows: {y_min} to {y_max}')

# Extract tight crop
tight = locale.crop((390, y_min, 444, y_max))
print(f'Tight icon size: {tight.size}')

# Preview on dark bg
dark = Image.new('RGBA', (tight.size[0]*6, tight.size[1]*6), (40, 20, 8, 255))
icon_large = tight.resize((tight.size[0]*6, tight.size[1]*6), Image.LANCZOS)
dark.paste(icon_large, (0, 0), icon_large)
dark.save('scripts/preview_ic_win_tight.png')

# Save as 60x60
icon_60 = tight.resize((60, 60), Image.LANCZOS)
icon_60.save('client-app/public/images/games/mahjong/pg/ui/icon-win.png')
print('Saved icon-win.png 60x60')

# Final comparison with all icons
atlas_sm = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__setting_menu.png').convert('RGBA')
ic_wallet = atlas_sm.crop((472, 419, 532, 479))
ic_chip = atlas_sm.crop((490, 357, 550, 417))

strip = Image.new('RGBA', (210, 70), (40, 20, 8, 255))
for i, ico in enumerate([ic_wallet, ic_chip, icon_60]):
    px = i*70+5
    strip.paste(ico, (px, 5), ico)
strip.save('scripts/preview_hud_icons_final.png')
print('Saved final 3-icon strip')
