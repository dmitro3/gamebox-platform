import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

def find_sprite_nodes(obj, kws, depth=0):
    if depth > 30: return
    if isinstance(obj, dict):
        name = obj.get('name', '')
        sprite = obj.get('sprite', '')
        wp = obj.get('worldPct', {})
        top = wp.get('topPct', -1) if isinstance(wp, dict) else -1
        if any(k.lower() in str(sprite).lower() or k.lower() in str(name).lower() for k in kws):
            print(f"  name={name:35s} sprite={sprite}")
            print(f"    worldPct={wp}")
            print(f"    atlasUrl={obj.get('atlasUrl','')}")
            print(f"    color={obj.get('color','')}")
            print()
        for k, v in obj.items():
            find_sprite_nodes(v, kws, depth+1)
    elif isinstance(obj, list):
        for item in obj:
            find_sprite_nodes(item, kws, depth+1)

print("=== setting_info_footer / dark bar nodes ===")
find_sprite_nodes(data, ['setting_info_footer', 'black_tint', 'bottom_bg', 'footer_bg'])

# Also check spriteFrames
print("\n=== spriteFrames with footer/tint ===")
sp = data.get('spriteFrames', {})
for uid, info in sp.items():
    name = info.get('name', '')
    if any(k in name.lower() for k in ['footer', 'tint', 'bottom_bg', 'dark']):
        print(f"  {name}: {info}")
