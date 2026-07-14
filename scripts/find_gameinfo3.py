import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

# Deep search for ALL nodes with fontSize
def find_text_nodes(obj, path='', depth=0):
    if depth > 30:
        return
    if isinstance(obj, dict):
        name = obj.get('name', '')
        if 'fontSize' in obj:
            wp = obj.get('worldPct', {})
            top = wp.get('topPct', 0) if isinstance(wp, dict) else 0
            if 74 <= top <= 84:
                print(f"NODE: {name} @ top={top:.2f}%")
                for k in ['fontSize','font','color','worldPct','string','active']:
                    if k in obj:
                        print(f"  {k}: {obj[k]}")
                print()
        for k, v in obj.items():
            find_text_nodes(v, path+'/'+k, depth+1)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            find_text_nodes(v, path+f'[{i}]', depth+1)

print("=== Text nodes in HUD area (74-84%) ===")
find_text_nodes(data)

# Also look for bg_round_solid sprite to find panel background
print("\n=== bg_round_solid nodes ===")
def find_sprite(obj, name_kw, depth=0):
    if depth > 30:
        return
    if isinstance(obj, dict):
        sprite = obj.get('sprite', '')
        name = obj.get('name', '')
        if name_kw in str(sprite) or name_kw in str(name):
            wp = obj.get('worldPct', {})
            print(f"  name={name} sprite={sprite} wp={wp}")
            for k in ['color','active','size']:
                if k in obj:
                    print(f"    {k}: {obj[k]}")
        for k, v in obj.items():
            find_sprite(v, name_kw, depth+1)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            find_sprite(v, name_kw, depth+1)

find_sprite(data, 'bg_round')
