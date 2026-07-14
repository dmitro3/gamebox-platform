from PIL import Image

files = ['unknown_255.jpg', 'unknown_298.png', 'unknown_345.jpg', 'unknown_380.jpg', 'unknown_419.png', 'unknown_434.png', 'unknown_435.png']

for f in files:
    img = Image.open(f'pg_assets/{f}')
    thumb = img.copy()
    thumb.thumbnail((200, 200))
    thumb.save(f'pg_assets/sprites/preview_x_{f}')
    print(f'{f}: {img.size}')
