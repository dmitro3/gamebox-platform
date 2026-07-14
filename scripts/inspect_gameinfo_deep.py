import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

scene = dump.get('sceneTree', {})

def search_tree(node, depth=0, parent=''):
    if not isinstance(node, dict):
        return
    name = node.get('name', '')
    path = f'{parent}/{name}' if parent else name
    
    if name == 'GameInfo':
        # Print deep structure
        def print_tree(n, d=0):
            if not isinstance(n, dict):
                return
            nname = n.get('name','')
            nsprite = n.get('sprite')
            ncolor = n.get('color')
            nopacity = n.get('opacity')
            nwpct = n.get('worldPct')
            active = n.get('active', True)
            print(f'{"  "*d}{nname!r} sprite={nsprite!r} color={ncolor} opacity={nopacity} wpct={nwpct} active={active}')
            for c in n.get('children', []):
                print_tree(c, d+1)
        print_tree(node)
        return
    
    children = node.get('children', [])
    for c in children:
        search_tree(c, depth+1, path)

if isinstance(scene, dict):
    search_tree(scene)
