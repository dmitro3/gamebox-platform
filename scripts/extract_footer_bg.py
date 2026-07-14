from PIL import Image
import numpy as np

atlas = Image.open("scripts/atlas_75e507.png")
W, H = atlas.size
print(f"Atlas: {W}x{H}")

# setting_info_footer_bg rect: [1, 183, 3, 305]
x, y, w, h = 1, 183, 3, 305

# Try y-from-top (PNG standard)
crop_top = atlas.crop((x, y, x+w, y+h))
arr = np.array(crop_top)
print(f"\nY-from-top crop shape: {arr.shape}")
print("Sample pixels (top→bottom):")
for i in [0, 10, 30, 60, 100, 150, 200, 250, 280, 304]:
    px = arr[i, 1]
    print(f"  row {i:3d}: RGBA={px}  hex=#{px[0]:02x}{px[1]:02x}{px[2]:02x} a={px[3]}")

# Save enlarged preview
big = crop_top.resize((60, crop_top.height), Image.NEAREST)
big.save("scripts/footer_bg_strip.png")
print(f"\nSaved footer_bg_strip.png ({crop_top.size} → {big.size})")
