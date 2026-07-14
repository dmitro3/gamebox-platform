from PIL import Image
import numpy as np

locale = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__zh__setting_menu_locale.png').convert('RGBA')
arr = np.array(locale)

# The "奖" badge icon is the rightmost element
# From alpha profile: x spans ~380-444, full height 0-110
# But icon content is mainly in top half

# Find exact bounding box
rows_with_alpha = np.where(arr[:,:,3].max(axis=1) > 50)[0]
print(f'Y range with content: {rows_with_alpha.min()} - {rows_with_alpha.max()}')

# Find right icon boundary (separate from main circle icons on left)
# The main content ends around x=389 (gap), then icon at 395-444
# Let's find the gap in the middle
for x in range(360, 410):
    col_alpha = arr[:,x,3].mean()
    print(f'  x={x}: mean_alpha={col_alpha:.1f}')
