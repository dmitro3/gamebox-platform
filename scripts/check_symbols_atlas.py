from PIL import Image
import numpy as np

# Check if the symbols atlas (3856b7c5) contains s_scatter and s_wild
# which also have None atlasUrl in the dump
atlas = Image.open('scripts/pg_assets/3856b7c5-0c59-4514-9770-eb3e800f4e09.a7dd8.png').convert('RGBA')
print(f'Symbols atlas size: {atlas.size}')

# s_scatter at [806, 3, 162, 190]
scatter = atlas.crop((806, 3, 806+162, 3+190))
scatter.save('scripts/preview_s_scatter.png')
arr = np.array(scatter)
print(f's_scatter at [806,3]: alpha={arr[:,:,3].mean():.0f}')

# Check ic_win analog - look at what's at x=742 (but atlas is 1097px wide, so it fits)
crop_win = atlas.crop((742, 3, 802, 63))
arr2 = np.array(crop_win)
print(f'[742,3] in symbols atlas: alpha={arr2[:,:,3].mean():.0f}')

# Actually look for white icon at various y=3 positions
print('\nContent scan at y=3 (looking for icon-like content):')
for x_start in range(0, atlas.size[0]-60, 30):
    crop = atlas.crop((x_start, 0, x_start+60, 60))
    arr = np.array(crop.convert('RGBA'))
    alpha = arr[:,:,3].mean()
    white = ((arr[:,:,0]>200)&(arr[:,:,1]>200)&(arr[:,:,2]>200)&(arr[:,:,3]>100)).mean()
    if white > 0.15:
        print(f'  x={x_start}: white={white:.2f} alpha={alpha:.0f}')
        crop.save(f'scripts/preview_symbols_x{x_start}.png')
