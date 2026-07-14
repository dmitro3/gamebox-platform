from PIL import Image
import numpy as np

# Look at the zh locale atlas on dark background
locale = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__zh__setting_menu_locale.png').convert('RGBA')
print(f'ZH Locale atlas: {locale.size}')

# Create dark background version
dark = Image.new('RGBA', locale.size, (40, 20, 8, 255))
dark.paste(locale, (0,0), locale)
dark_large = dark.resize((dark.size[0]*4, dark.size[1]*4), Image.LANCZOS)
dark_large.save('scripts/preview_zh_locale_dark.png')

# Also look at all sprite frame entries in the dump that reference the locale atlas
import json
with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

sf = dump.get('spriteFrames', {})
LOCALE_ATLAS = 'setting_menu_locale'
ZH_LOCALE_ATLAS = 'zh'
print('\nSprites in locale atlases:')
for uid, val in sf.items():
    if not isinstance(val, dict):
        continue
    atlas = val.get('atlasUrl') or ''
    if 'locale' in atlas.lower() or 'setting_menu_locale' in atlas.lower():
        print(f'  {val.get("name"):40s} rect={val.get("rect")} atlas=...{atlas[-40:]}')

# Check if ic_win might be in the setting_menu texture with different coordinates
# by checking Cocos Creator's atlas packing - maybe the atlas is bigger than 706px
# but shows correctly at 706px (transparent right edge)

# Let's look at the right edge of setting_menu atlas
atlas_sm = Image.open('scripts/pg_assets/lib__setting_menu__texture__hd__setting_menu.png').convert('RGBA')
print(f'\nSetting menu atlas: {atlas_sm.size}')
# Check columns from 680 to the end
arr = np.array(atlas_sm)
for x in range(680, atlas_sm.size[0]):
    col = arr[:,x,3]
    if col.max() > 0:
        print(f'  Alpha at column {x}: max={col.max()}')
