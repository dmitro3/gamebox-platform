import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

sf = dump.get('spriteFrames', {})

# Find ic_chip, ic_wallet_open, ic_win, and other ic_ sprites
for uid, val in sf.items():
    if not isinstance(val, dict):
        continue
    name = val.get('name', '')
    if name in ('ic_chip', 'ic_wallet_open', 'ic_win', 'ic_wallet'):
        atlas = val.get('atlasUrl') or 'NONE'
        print(f'{name:30s} rect={val.get("rect")} atlas={atlas[-50:]}')
