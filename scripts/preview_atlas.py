from PIL import Image, ImageDraw, ImageFont
import os

atlas_path = "scripts/atlas_75e507.png"
img = Image.open(atlas_path)
print(f"Atlas size: {img.size}")

# Try both y-conventions for bg_round_solid rect [428, 357, 60, 60]
# Convention 1: y from top (PNG standard)
x, y, w, h = 428, 357, 60, 60
crop1 = img.crop((x, y, x+w, y+h))
crop1.save("scripts/bg_round_top.png")
import numpy as np
arr1 = np.array(crop1)
print(f"Y-from-top crop center pixel: {arr1[30,30]}")
print(f"Y-from-top non-transparent count: {(arr1[:,:,3]>50).sum()}")

# Convention 2: y from bottom (Cocos internal)
atlas_h = img.size[1]
pil_y = atlas_h - y - h
crop2 = img.crop((x, pil_y, x+w, pil_y+h))
crop2.save("scripts/bg_round_bottom.png")
arr2 = np.array(crop2)
print(f"Y-from-bottom crop center pixel: {arr2[30,30]}")
print(f"Y-from-bottom non-transparent count: {(arr2[:,:,3]>50).sum()}")

# Save a marked-up overview of the full atlas showing where bg_round_solid is
overview = img.copy().convert('RGBA')
draw = ImageDraw.Draw(overview)
# Mark the two candidate regions
draw.rectangle([x, y, x+w, y+h], outline=(255, 0, 0, 255), width=2)
draw.rectangle([x, pil_y, x+w, pil_y+h], outline=(0, 255, 0, 255), width=2)
overview.save("scripts/atlas_overview.png")
print("Saved atlas_overview.png with red=top, green=bottom")
