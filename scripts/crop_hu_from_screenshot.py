from PIL import Image
import os

# Load screenshot
img = Image.open(r'C:\Users\pc\AppData\Local\Temp\cursor\screenshots\page-2026-06-21T00-14-39-989Z.png')
print('Screenshot:', img.size)

# Save the full screenshot as reference
img.save('pg_assets/sprites/screenshot_ref.png')

# The game board tiles:
# Board spans approx x=15..695, y=130..650
# 5 cols each ~136px, 4 rows each ~130px
# Tile locations (col 0..4, row 0..3):
board_left = 22
board_top  = 135
tile_w     = 132
tile_h     = 128

def crop_tile(col, row):
    x = board_left + col * tile_w
    y = board_top + row * tile_h
    return img.crop((x, y, x+tile_w, y+tile_h))

# Save all tiles to identify them
os.makedirs('pg_assets/sprites/tiles', exist_ok=True)
for r in range(4):
    for c in range(5):
        tile = crop_tile(c, r)
        tile.save(f'pg_assets/sprites/tiles/tile_r{r}_c{c}.png')
        
print('Saved 20 tiles to pg_assets/sprites/tiles/')
print('Row 3 (bottom), Col 2 (middle) = hu scatter')

# Save hu tile at desired output size 162x190
hu_tile = crop_tile(2, 3)
hu_resized = hu_tile.resize((162, 190), Image.LANCZOS)
hu_resized.save('pg_assets/sprites/hu_from_screenshot.png')
print(f'Saved hu tile: {hu_tile.size} → (162, 190)')
