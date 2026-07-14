import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

# Navigate to GameInfo node path
path = ['sceneTree', 'children', 0, 'children', 16, 'children', 0, 'children', 4, 'children', 0, 'children', 2]

def nav(obj, keys):
    for k in keys:
        if isinstance(k, int):
            obj = obj[k]
        else:
            obj = obj[k]
    return obj

try:
    gameinfo_parent = nav(data, path)
    print("Found GameInfo parent, keys:", list(gameinfo_parent.keys()) if isinstance(gameinfo_parent, dict) else "list")
except Exception as e:
    print("nav error:", e)

# Deep search for font/color info near GameInfo
def find_text_nodes(obj, path='', depth=0):
    if depth > 25:
        return
    if isinstance(obj, dict):
        name = obj.get('name', '')
        has_font = 'fontSize' in obj or 'font' in obj
        has_color = 'color' in obj
        if has_font or has_color:
            wp = obj.get('worldPct', {})
            top = wp.get('topPct', 0) if isinstance(wp, dict) else 0
            # Only show nodes in HUD area (top 75-85%)
            if 75 <= top <= 85:
                print(f"NODE: {name} @ {path}")
                for k in ['fontSize','font','color','worldPct','string','active','overflow']:
                    if k in obj:
                        print(f"  {k}: {obj[k]}")
                print()
        for k, v in obj.items():
            find_text_nodes(v, path+'/'+k, depth+1)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            find_text_nodes(v, path+f'[{i}]', depth+1)

find_text_nodes(data)
