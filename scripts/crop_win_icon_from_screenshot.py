from PIL import Image
import numpy as np

# User's screenshot (comparison image)
screenshot_path = r'C:\Users\pc\.cursor\projects\c-Users-pc-Desktop-gamebox-platform\assets\c__Users_pc_AppData_Roaming_Cursor_User_workspaceStorage_bbfa37c4b1fe9e363db589261f2c1322_images_image-5605ed0b-7371-4827-8791-f62c2020612f.png'

img = Image.open(screenshot_path)
w, h = img.size
print(f'Screenshot size: {w}x{h}')

# The image is a side-by-side comparison
# Left = our version, Right = original
# Right side starts at approximately w/2 = 

# Let's see the full image
half_w = w // 2
right = img.crop((half_w, 0, w, h))
print(f'Right side size: {right.size}')
right.save('scripts/preview_right_side.png')

# The original right side shows 3 HUD panels
# The image height is small (this seems to be a cropped view of just the HUD area)
# The panels occupy the full height approximately
# Panel 3 (win) is at rightmost ~1/3 of the right side
right_w = right.size[0]
right_h = right.size[1]

# Panel positions: each panel is ~1/3 width
# Win panel is the rightmost panel
win_panel = right.crop((int(right_w * 0.65), 0, right_w, right_h))
win_panel_large = win_panel.resize((win_panel.size[0]*3, win_panel.size[1]*3), Image.NEAREST)
win_panel_large.save('scripts/preview_win_panel_zoomed.png')
print(f'Saved win panel zoom: {win_panel_large.size}')

# Also zoom the icon area (leftmost ~20% of win panel)
icon_area = right.crop((int(right_w * 0.65), 0, int(right_w * 0.65 + right_w * 0.1), right_h))
icon_large = icon_area.resize((icon_area.size[0]*5, icon_area.size[1]*5), Image.NEAREST)
icon_large.save('scripts/preview_win_icon_area_zoomed.png')
print(f'Saved win icon area zoom: {icon_large.size}')
