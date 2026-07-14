from PIL import Image
import os

atlas = Image.open("scripts/atlas_75e507.png")
W, H = atlas.size

# setting_info_footer_bg rect: [x=1, y=183, w=3, h=305] (y from top)
x, y, w, h = 1, 183, 3, 305
crop = atlas.crop((x, y, x+w, y+h))

# Scale up width to 100px so it's usable as a stretched background image
# The texture is designed to be stretched horizontally (9-slice)
out = crop.resize((100, h), Image.NEAREST)
out_path = "client-app/public/images/games/mahjong/pg/footer-dark-grad.png"
os.makedirs(os.path.dirname(out_path), exist_ok=True)
out.save(out_path)
print(f"Saved: {out_path} ({out.size})")

# Also preview
import numpy as np
arr = np.array(out)
for i in [0, 30, 60, 100, 150, 200, 304]:
    px = arr[i, 50]
    print(f"  row {i:3d}: RGBA={px}  hex=#{px[0]:02x}{px[1]:02x}{px[2]:02x} a={px[3]}")
