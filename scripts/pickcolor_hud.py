from PIL import Image
import numpy as np

# Load comparison screenshot
img_path = r"C:\Users\pc\.cursor\projects\c-Users-pc-Desktop-gamebox-platform\assets\c__Users_pc_AppData_Roaming_Cursor_User_workspaceStorage_bbfa37c4b1fe9e363db589261f2c1322_images_image-484f7f00-0893-403d-b39c-6ea05fc5b9a9.png"
img = Image.open(img_path).convert('RGB')
arr = np.array(img)
W, H = img.size
print(f"Screenshot size: {W}x{H}")

# Right half = original game
# The panels are in the bottom area of the screenshot
# Right panel area: approx x from W//2 to W, y from top (since the screenshot is cropped)

# Estimate the panel background color from the RIGHT side
# Looking at the screenshot, the right side panels start at about 50% of width
# Panel appears to start y around 5-10% from top of this crop and extends to ~80% height

# Sample from the middle of the right-side balance panel
# Right side starts at W//2
# Panel background (avoiding text and icon): sample from left portion of right panel
# Approximate: x = 0.55*W to 0.60*W, y = 0.2*H to 0.8*H

right_half = arr[:, W//2:, :]
print(f"Right half shape: {right_half.shape}")

# Show a grid of samples from the right panel background area
print("\nSampling right-side panel background (avoid icons/text):")
for y_frac in [0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85]:
    for x_frac in [0.05, 0.15, 0.20]:  # Left part of panel (before icon)
        ry = int(y_frac * right_half.shape[0])
        rx = int(x_frac * right_half.shape[1])
        pixel = right_half[ry, rx]
        print(f"  ({y_frac:.2f}, {x_frac:.2f}): RGB={pixel} hex=#{pixel[0]:02x}{pixel[1]:02x}{pixel[2]:02x}")

print("\n\nLeft half (ours) panel background samples:")
left_half = arr[:, :W//2, :]
for y_frac in [0.35, 0.5, 0.65]:
    for x_frac in [0.05, 0.10, 0.15]:
        ry = int(y_frac * left_half.shape[0])
        rx = int(x_frac * left_half.shape[1])
        pixel = left_half[ry, rx]
        print(f"  ({y_frac:.2f}, {x_frac:.2f}): RGB={pixel} hex=#{pixel[0]:02x}{pixel[1]:02x}{pixel[2]:02x}")

# Save a zoomed crop of just the right panel for visual inspection
right_panel = img.crop((W//2, 0, W, H))
right_panel_big = right_panel.resize((right_panel.width * 3, right_panel.height * 3), Image.NEAREST)
right_panel_big.save("scripts/right_panel_zoom.png")
print("\nSaved right_panel_zoom.png")
