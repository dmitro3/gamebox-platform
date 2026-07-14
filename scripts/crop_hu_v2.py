from PIL import Image
import os

# Use the new screenshot
img = Image.open(r'C:\Users\pc\AppData\Local\Temp\cursor\screenshots\page-2026-06-21T00-17-57-693Z.png')
print('Screenshot:', img.size)

# New screenshot is 693x1171
# Reel grid: x=5..695 (690px / 5cols = 138px/col), y=125..635 (510px / 4rows = 127px/row)
board_left = 5
board_top  = 128
tile_w     = 138
tile_h     = 127

# Hu (scatter) at row 3 (bottom), col 2 (middle - 0-indexed)
# Crop with some margin removed - get the tile face only
margin = 4

def crop_tile(col, row, m=0):
    x = board_left + col * tile_w + m
    y = board_top + row * tile_h + m
    w = tile_w - 2*m
    h = tile_h - 2*m
    return img.crop((x, y, x+w, y+h))

# Save all tiles
os.makedirs('pg_assets/sprites/tiles2', exist_ok=True)
for r in range(4):
    for c in range(5):
        t = crop_tile(c, r)
        t.save(f'pg_assets/sprites/tiles2/tile_r{r}_c{c}.png')

print('Saved tiles to tiles2/')

# The hu tile is at row 3, col 2
# Crop the actual symbol without the tile border
hu_raw = crop_tile(2, 3, margin)
hu_raw.save('pg_assets/sprites/hu_raw.png')
print(f'hu raw crop: {hu_raw.size}')

# Resize to match standard 162x190 symbol size
hu_final = hu_raw.resize((162, 190), Image.LANCZOS)
hu_final.save('pg_assets/sprites/hu_final.png')
print('hu_final saved')

# Deploy to client-app
dest_paths = [
    '../client-app/public/images/games/mahjong/classic/symbols/hu.png',
    '../client-app/public/images/games/mahjong/classic/symbols-golden/hu.png',
]
for p in dest_paths:
    hu_final.save(p)
    print(f'Deployed to {p}')
