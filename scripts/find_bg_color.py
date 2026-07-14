import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

# Find bg_round_solid sprite source and color tint
def deep_search(obj, path='', depth=0):
    if depth > 30:
        return
    if isinstance(obj, dict):
        name = obj.get('name', '')
        sprite = obj.get('sprite', '')
        # Find panels with bg_round_solid AND check parent color
        if 'bg_round_solid' in str(sprite):
            wp = obj.get('worldPct', {})
            top = wp.get('topPct', 0) if isinstance(wp, dict) else 0
            if 75 <= top <= 82:
                print(f"PANEL bg: {path}/{name}")
                print(f"  worldPct: {wp}")
                print(f"  size: {obj.get('size')}")
                print(f"  color: {obj.get('color')}")
                print(f"  atlasUrl: {obj.get('atlasUrl')}")
                print(f"  spriteFrame: {obj.get('spriteFrame')}")
        
        # Look for color info on all nodes in HUD area 
        if 'color' in obj:
            wp = obj.get('worldPct', {})
            top = wp.get('topPct', 0) if isinstance(wp, dict) else 0
            if 75 <= top <= 82:
                print(f"COLOR node: {name} @ {path}")
                print(f"  color: {obj['color']}")
                print(f"  sprite: {obj.get('sprite')}")
                print()
        
        for k, v in obj.items():
            deep_search(v, path+'/'+str(k), depth+1)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            deep_search(v, path+f'[{i}]', depth+1)

deep_search(data)

# Also check spriteFrames for bg_round_solid
print("\n=== spriteFrames with bg_round ===")
sp = data.get('spriteFrames', {})
for uid, info in sp.items():
    name = info.get('name','')
    if 'bg_round' in name.lower():
        print(f"  {name}: {info}")
