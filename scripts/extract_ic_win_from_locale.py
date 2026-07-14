from PIL import Image
import numpy as np

# The zh locale atlas (448x110) has the "奖" badge icon on the right side
# Let's extract just that icon

locale = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__zh__setting_menu_locale.png').convert('RGBA')
w, h = locale.size
print(f'Locale atlas: {w}x{h}')

arr = np.array(locale)

# Find where the rightmost icon starts (look for rightmost column with alpha > 0)
# Scan from right to find icon boundaries
for x in range(w-1, 0, -1):
    if arr[:,x,3].max() > 0:
        icon_right = x
        break

for x in range(w-1, 0, -1):
    if arr[:,x,3].mean() > 20:
        # Find the left edge of the rightmost icon
        pass

# Show alpha profile to find icon X boundaries
print('Alpha profile (from right):')
for x in range(w-1, 350, -1):
    col_alpha = arr[:,x,3].max()
    if col_alpha > 0:
        print(f'  x={x}: alpha_max={col_alpha}')

# Extract the rightmost icon - looks like it starts around x=380
icon = locale.crop((380, 0, w, h))  # Rightmost icon
# Preview on dark background
dark_icon = Image.new('RGBA', icon.size, (40, 20, 8, 255))
dark_icon.paste(icon, (0,0), icon)
dark_icon_large = dark_icon.resize((dark_icon.size[0]*6, dark_icon.size[1]*6), Image.LANCZOS)
dark_icon_large.save('scripts/preview_ic_win_extracted.png')
print(f'\nExtracted icon size: {icon.size}')

# Save as icon-win.png (60x60)
icon_small = icon.resize((60, 60), Image.LANCZOS)
icon_small.save('client-app/public/images/games/mahjong/pg/ui/icon-win.png')
print('Saved as icon-win.png (60x60)')
