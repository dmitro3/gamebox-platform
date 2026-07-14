import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

def nav(obj, keys):
    for k in keys:
        obj = obj[k]
    return obj

# footer_darken path
path = ['sceneTree', 'children', 0, 'children', 1, 'children', 0, 'children', 7, 'children', 0]
node = nav(data, path)
print('footer_darken full keys:', list(node.keys()))
print(json.dumps(node, indent=2, ensure_ascii=False)[:2000])

# parent
parent_path = path[:-1]
parent = nav(data, parent_path)
print('\nparent name:', parent.get('name'))
print('parent keys:', list(parent.keys()))

# siblings
grandparent = nav(data, path[:-2])
print('\nsiblings of footer_darken:')
for i, ch in enumerate(grandparent.get('children', [])):
    print(f'  [{i}] name={ch.get("name")} sprite={ch.get("sprite")} active={ch.get("active")} wp={ch.get("worldPct")}')
