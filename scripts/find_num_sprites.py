import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

frames = data.get('spriteFrames', {})

# Get full info for digit sprites
digit_names = ['0','1','2','3','4','5','6','7','8','9','decimal']
print('=== Digit sprite frames (full info) ===')
for guid, v in frames.items():
    if isinstance(v, dict) and v.get('name','') in digit_names:
        print(f"  name={v['name']}  rect={v['rect']}  atlasUrl={v.get('atlasUrl','')}  originalSize={v.get('originalSize','')}  rotated={v.get('rotated','')}")
