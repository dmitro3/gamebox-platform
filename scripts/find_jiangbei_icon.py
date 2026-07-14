from PIL import Image
import numpy as np

# The win icon looks like an "award/ingot with 奖 character" icon
# Let's check all available atlases for this type of icon

# First, let's look at the right side of the screenshot more carefully
screenshot_path = r'C:\Users\pc\.cursor\projects\c-Users-pc-Desktop-gamebox-platform\assets\c__Users_pc_AppData_Roaming_Cursor_User_workspaceStorage_bbfa37c4b1fe9e363db589261f2c1322_images_image-5605ed0b-7371-4827-8791-f62c2020612f.png'

img = Image.open(screenshot_path)
w, h = img.size
half = w // 2
right = img.crop((half, 0, w, h))
right_w, right_h = right.size

# Win panel icon is at left side of win panel (rightmost 1/3)
# Panel starts at ~66% of right side width  
# Icon is at very left of win panel, about 2-5% into it
# Let's try to isolate just the icon
for x1_pct, x2_pct in [(0.65, 0.73), (0.66, 0.72), (0.65, 0.70)]:
    x1 = int(right_w * x1_pct)
    x2 = int(right_w * x2_pct)
    icon_crop = right.crop((x1, 0, x2, right_h))
    icon_large = icon_crop.resize((icon_crop.size[0]*6, icon_crop.size[1]*6), Image.LANCZOS)
    icon_large.save(f'scripts/preview_icon_precise_{int(x1_pct*100)}.png')
    print(f'Saved icon crop x={x1_pct*100:.0f}%-{x2_pct*100:.0f}%: {icon_crop.size} -> {icon_large.size}')

# Also check the locale atlas for an award/prize icon
locale = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__setting_menu_locale.png').convert('RGBA')
print(f'\nLocale atlas: {locale.size}')
# Show it larger
locale_large = locale.resize((locale.size[0]*3, locale.size[1]*3), Image.LANCZOS)
locale_large.save('scripts/preview_locale_large.png')

# Check each sprite in the locale atlas
# Typically these contain button overlay text
arr = np.array(locale)
alpha_nonzero = (arr[:,:,3] > 50).sum()
print(f'Non-zero pixels: {alpha_nonzero}')
