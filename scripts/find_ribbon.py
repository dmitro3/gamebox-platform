import json

with open('scripts/pg-cocos-dump.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sprite_frames = data.get('spriteFrames', {})

print('=== All info/message/ribbon sprites ===')
for key, val in sprite_frames.items():
    if not isinstance(val, dict):
        continue
    name = val.get('name', '')
    if any(x in name.lower() for x in ['message', 'ribbon', 'info2', 'info_m', 'info-m', 'info_r']):
        rect = val.get('rect')
        orig = val.get('originalSize')
        url = str(val.get('atlasUrl', ''))[:90]
        print(f"  name={name!r}")
        print(f"    rect={rect}")
        print(f"    originalSize={orig}")
        print(f"    atlasUrl={url}")
        print()

# Also look for info-message-text or similar
print()
print('=== info-* sprites ===')
for key, val in sprite_frames.items():
    if not isinstance(val, dict):
        continue
    name = val.get('name', '')
    if name.startswith('info') and not name.startswith('info_vfx') and not name.startswith('info_glow') and not name.startswith('info_flare'):
        rect = val.get('rect')
        orig = val.get('originalSize')
        url = str(val.get('atlasUrl', ''))[:90]
        print(f"  name={name!r}")
        print(f"    rect={rect}")
        print(f"    atlasUrl={url}")
