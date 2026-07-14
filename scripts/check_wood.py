from PIL import Image

# Check files that might be wood/panel textures
files = ['unknown_257.png', 'unknown_248.png', 'unknown_298.png', 'unknown_316.jpg', 'unknown_344.jpg']
for f in files:
    img = Image.open(f'pg_assets/{f}')
    thumb = img.copy()
    thumb.thumbnail((200, 200))
    thumb.save(f'pg_assets/sprites/preview_wood_{f}')
    print(f'{f}: {img.size}')
