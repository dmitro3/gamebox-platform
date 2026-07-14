from PIL import Image
import numpy as np

atlas = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__setting_menu.png').convert('RGBA')

# bg_round_solid at [428, 357, 60, 60]
bg_solid = atlas.crop((428, 357, 488, 417))
bg_solid.save('scripts/preview_bg_round_solid.png')
arr = np.array(bg_solid)
print(f'bg_round_solid sample pixels:')
# Print some pixel colors
for y in [5, 15, 25, 35]:
    for x in [5, 15, 25, 35]:
        r,g,b,a = arr[y,x]
        print(f'  [{x},{y}]: rgba({r},{g},{b},{a})')

# bg_round_border at [570, 295, 60, 60]
bg_border = atlas.crop((570, 295, 630, 355))
bg_border.save('scripts/preview_bg_round_border.png')
