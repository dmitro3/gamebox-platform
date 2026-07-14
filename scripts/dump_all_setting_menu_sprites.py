import json
from PIL import Image
import numpy as np

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

sf = dump.get('spriteFrames', {})
atlas_uuid = '75e507a6'

# Find all sprites in the setting_menu atlas
print('All sprites in setting_menu atlas (75e507a6):')
setting_sprites = []
for uid, val in sf.items():
    if not isinstance(val, dict):
        continue
    atlas = val.get('atlasUrl') or ''
    if atlas_uuid in atlas:
        setting_sprites.append((val.get('name'), val.get('rect'), uid[:8]))

for name, rect, uid in sorted(setting_sprites):
    print(f'  {name:40s} rect={rect}')

# Also view the atlas image at each sprite position
atlas = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__setting_menu.png').convert('RGBA')
print(f'\nAtlas size: {atlas.size}')

# Annotate the atlas with sprite positions
from PIL import ImageDraw
draw = ImageDraw.Draw(atlas)
for name, rect, uid in setting_sprites:
    if rect:
        x, y, w, h = rect
        draw.rectangle([x, y, x+w, y+h], outline=(255, 0, 0, 255), width=2)
atlas.save('scripts/preview_setting_menu_annotated.png')
print('Saved annotated atlas')
