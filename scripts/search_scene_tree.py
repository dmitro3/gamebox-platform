import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

scene = dump.get('sceneTree', {})
print('sceneTree type:', type(scene).__name__)

def search_tree(node, depth=0, parent=''):
    if not isinstance(node, dict):
        return
    name = node.get('name', '')
    path = f'{parent}/{name}' if parent else name
    
    if name in ('GameInfo', 'left_slot', 'middle_Slot', 'right_Slot'):
        print(f'{"  "*depth}FOUND: {name!r} at {path}')
        print(f'{"  "*depth}  keys: {list(node.keys())}')
        sprite = node.get('sprite')
        color = node.get('color')
        opacity = node.get('opacity')
        print(f'{"  "*depth}  sprite={sprite!r} color={color} opacity={opacity}')
        
        children = node.get('children', [])
        for c in children:
            if isinstance(c, dict):
                cname = c.get('name','')
                csprite = c.get('sprite','')
                ccolor = c.get('color')
                print(f'{"  "*(depth+1)}{cname!r} sprite={csprite!r} color={ccolor}')
        return
    
    children = node.get('children', [])
    for c in children:
        search_tree(c, depth+1, path)

if isinstance(scene, dict):
    search_tree(scene)
elif isinstance(scene, list):
    for n in scene:
        search_tree(n)
