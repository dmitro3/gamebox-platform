import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

sf = dump.get('spriteFrames', {})

print('== ic_ sprites in setting atlas ==')
for uid, val in sf.items():
    if not isinstance(val, dict):
        continue
    name = val.get('name', '')
    atlas = val.get('atlasUrl') or ''
    if 'setting' in atlas and ('ic_' in name or name.startswith('ic')):
        print(f'  {name:40s} rect={val.get("rect")} atlas=...{atlas[-30:]}')

print()
print('== any sprite with win/trophy/prize/award/ingot ==')
for uid, val in sf.items():
    if not isinstance(val, dict):
        continue
    name = val.get('name', '')
    atlas = val.get('atlasUrl') or ''
    for keyword in ['win', 'trophy', 'prize', 'award', 'ingot', 'cup', 'coin', 'ic_win']:
        if keyword in name.lower():
            print(f'  {name:40s} rect={val.get("rect")} atlas=...{(atlas or "NONE")[-30:]}')
            break
