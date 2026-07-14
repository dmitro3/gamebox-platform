import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

sf = dump.get('spriteFrames', {})

# Look at ALL sprites in the main game atlas (6737e5a0) = 1007x1686
MAIN_ATLAS = '6737e5a0'
print(f'Sprites in main game atlas ({MAIN_ATLAS}):')
for uid, val in sf.items():
    if not isinstance(val, dict):
        continue
    atlas = val.get('atlasUrl') or ''
    if MAIN_ATLAS in atlas:
        name = val.get('name', '')
        rect = val.get('rect')
        print(f'  {name:40s} rect={rect}')

# Also look at the symbols atlas (3856b7c5)
SYMBOLS_ATLAS = '3856b7c5'
print(f'\nSprites in symbols atlas ({SYMBOLS_ATLAS}):')
for uid, val in sf.items():
    if not isinstance(val, dict):
        continue
    atlas = val.get('atlasUrl') or ''
    if SYMBOLS_ATLAS in atlas:
        name = val.get('name', '')
        rect = val.get('rect')
        print(f'  {name:40s} rect={rect}')

# Count all None-atlas sprites
none_atlas = [(val.get('name'), val.get('rect')) for uid, val in sf.items() 
              if isinstance(val, dict) and not val.get('atlasUrl')]
print(f'\nAll sprites with None atlasUrl ({len(none_atlas)}):')
for name, rect in sorted(none_atlas):
    print(f'  {name:40s} rect={rect}')
