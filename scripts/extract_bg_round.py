import urllib.request
import os
from PIL import Image

atlas_url = "https://www.pgf-nvgais.com/65/assets/resources/native/75/75e507a6-3bc5-4aa1-89ff-8fc31c86ef0c.f8847.png"
local_atlas = "scripts/atlas_75e507.png"

if not os.path.exists(local_atlas):
    print("Downloading atlas...")
    req = urllib.request.Request(atlas_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as r:
        data = r.read()
    with open(local_atlas, 'wb') as f:
        f.write(data)
    print(f"Downloaded {len(data)} bytes")
else:
    print("Atlas already cached")

img = Image.open(local_atlas)
print(f"Atlas size: {img.size}, mode: {img.mode}")

# Crop bg_round_solid: rect [428, 357, 60, 60]
x, y, w, h = 428, 357, 60, 60
# Cocos uses bottom-left origin for rects, PIL uses top-left
# Need to convert: PIL_y = atlas_height - cocos_y - h
atlas_h = img.size[1]
pil_y = atlas_h - y - h
print(f"Cropping at PIL coords: ({x}, {pil_y}, {x+w}, {pil_y+h})")

crop = img.crop((x, pil_y, x+w, pil_y+h))
crop_path = "scripts/bg_round_solid_preview.png"
crop.save(crop_path)
print(f"Saved to {crop_path}")

# Analyze pixels - what color is the center?
import numpy as np
arr = np.array(crop)
print(f"Array shape: {arr.shape}")
center = arr[30, 30]
print(f"Center pixel RGBA: {center}")
print(f"Corner pixels: TL={arr[0,0]}, TR={arr[0,-1]}, BL={arr[-1,0]}, BR={arr[-1,-1]}")

# Show average color of non-transparent pixels
if arr.shape[2] == 4:
    mask = arr[:,:,3] > 50
    visible = arr[mask]
    if len(visible) > 0:
        avg = visible.mean(axis=0)
        print(f"Average RGBA of visible pixels: R={avg[0]:.0f} G={avg[1]:.0f} B={avg[2]:.0f} A={avg[3]:.0f}")
        print(f"Hex: #{int(avg[0]):02x}{int(avg[1]):02x}{int(avg[2]):02x}")
