import json

with open('scripts/pg-cocos-dump.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sprite_frames = data.get('spriteFrames', {})

# Search by name value
print("=== info* frames (by name field) ===")
for key, val in sprite_frames.items():
    name = val.get('name', '') if isinstance(val, dict) else ''
    if 'info' in name.lower() or 'message' in name.lower():
        print(f"\n  name={name!r}")
        print(f"  rect={val.get('rect')}")
        print(f"  originalSize={val.get('originalSize')}")
        print(f"  atlasUrl={str(val.get('atlasUrl',''))[:100]}")
        print(f"  rotated={val.get('rotated')}")

print("\n=== Searching by atlas URL containing 'info_message' or 'f3aab' ===")
for key, val in sprite_frames.items():
    if not isinstance(val, dict):
        continue
    url = str(val.get('atlasUrl',''))
    if 'f3aab' in url or 'info_message' in url:
        print(f"\n  name={val.get('name')!r}")
        print(f"  rect={val.get('rect')}")
        print(f"  originalSize={val.get('originalSize')}")
        print(f"  atlasUrl={url[:120]}")
        print(f"  rotated={val.get('rotated')}")
