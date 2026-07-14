import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

def search_nodes(node_list, depth=0, parent=''):
    for n in node_list:
        if not isinstance(n, dict):
            continue
        name = n.get('name', '')
        path = f'{parent}/{name}'
        
        if name == 'GameInfo':
            print(f'FOUND GameInfo at {path}')
            print(f'  Keys: {list(n.keys())}')
            print(f'  worldPct: {n.get("worldPct")}')
            # Print all child names
            children = n.get('children', [])
            print(f'  Children ({len(children)}):')
            for c in children:
                if isinstance(c, dict):
                    cname = c.get('name','')
                    csprite = c.get('sprite','')
                    ccolor = c.get('color')
                    cckeys = list(c.keys())
                    print(f'    {cname!r} sprite={csprite!r} color={ccolor} keys={cckeys}')
            return
        
        children = n.get('children', [])
        if children:
            search_nodes(children, depth+1, path)

search_nodes(dump.get('nodes', []))
