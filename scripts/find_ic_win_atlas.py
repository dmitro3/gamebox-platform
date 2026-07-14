import json, os

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

# Find what atlases contain our HUD icon sprites
sf = dump.get('spriteFrames', {})

# Collect all unique atlasUrls used by ic_ sprites
print('=== All ic_ sprites and their atlasUrls ===')
for uid, val in sf.items():
    if not isinstance(val, dict):
        continue
    name = val.get('name', '')
    if name.startswith('ic_'):
        atlas = val.get('atlasUrl') or 'NONE'
        rect = val.get('rect')
        print(f'  {name:30s} rect={rect}  atlas=...{atlas[-40:]}')

print()

# Find sprites that share the same atlas as ic_chip (75e507a6)
print('=== All sprites in setting_menu atlas (75e507a6) ===')
SETTING_ATLAS = '75e507a6'
setting_sprites = []
for uid, val in sf.items():
    if not isinstance(val, dict):
        continue
    atlas = val.get('atlasUrl') or ''
    if SETTING_ATLAS in atlas:
        setting_sprites.append((val.get('name'), val.get('rect')))
for name, rect in sorted(setting_sprites):
    print(f'  {name:40s} rect={rect}')

print()

# Look for any atlas that might be wider than 706px and contain ic_win at [742,3]
print('=== Textures section (first 20) ===')
textures = dump.get('textures', [])
if isinstance(textures, list):
    for t in textures[:20]:
        print(f'  {t}')
elif isinstance(textures, dict):
    for k, v in list(textures.items())[:20]:
        print(f'  {k}: {v}')
