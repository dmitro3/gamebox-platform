from PIL import Image
import os

# Check unknown files that might be UI atlases
files = [
    ('unknown_324.png', '736x341 - possible infoboard/multbar atlas'),
    ('unknown_340.png', '538x62 - narrow bar?'),
    ('unknown_342.png', '253x141 - small UI element?'),
    ('unknown_408.png', '888x94 - wide narrow bar?'),
    ('unknown_571.png', '538x62 - duplicate of 340?'),
    ('unknown_245.png', '758x1668 - tall - main bg or wood?'),
    ('unknown_321.png', '756x1051 - main wood or bg?'),
    ('unknown_323.png', '756x1638 - another wood?'),
]

for fname, desc in files:
    path = f'pg_assets/{fname}'
    if os.path.exists(path):
        img = Image.open(path)
        # Save small preview
        thumb = img.copy()
        thumb.thumbnail((300, 200))
        out = f'pg_assets/sprites/preview_{fname}'
        thumb.save(out)
        print(f'{fname} ({img.size}) - {desc} -> preview saved')
    else:
        print(f'{fname} NOT FOUND')
