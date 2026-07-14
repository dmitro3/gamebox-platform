import json, re

with open('scripts/pg-cocos-dump.json', 'r', encoding='utf-8') as f:
    raw = f.read()
    data = json.loads(raw)

def walk(node, path=''):
    name = node.get('name', '')
    full_path = path + '/' + name
    
    # print all nodes that match
    if 'message' in name.lower() or 'info' in name.lower() or 'ad' in name.lower():
        sprite = node.get('sprite', {})
        world = node.get('worldPct', {})
        print(f"[{name}] path={full_path[-60:]} active={node.get('active')} sprite={sprite.get('name') if sprite else None}")
        print(f"  world={world}")
    
    for child in node.get('children', []):
        walk(child, full_path)

# find top level structure
print(f"Root type: {type(data)}")
if isinstance(data, dict):
    print(f"Root keys: {list(data.keys())[:10]}")
    if 'sceneTree' in data:
        root = data['sceneTree']
    elif 'children' in data:
        root = data
    else:
        root = data
elif isinstance(data, list):
    root = {'children': data, 'name': 'root'}

walk(root)
