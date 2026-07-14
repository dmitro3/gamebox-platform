import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

# Find nodes that use ic_win sprite
nodes = dump.get('nodes', [])

def search_nodes(node_list, depth=0):
    for n in node_list:
        if not isinstance(n, dict):
            continue
        sprite = n.get('sprite', '')
        name = n.get('name', '')
        if 'ic_win' in str(sprite):
            print(f'{"  "*depth}NODE: {name!r} sprite={sprite!r}')
            print(f'{"  "*depth}  worldPct={n.get("worldPct")} active={n.get("active")}')
        children = n.get('children', [])
        if children:
            search_nodes(children, depth+1)

search_nodes(nodes)

# Also find the spriteFrame entry for ic_win  
sf = dump.get('spriteFrames', {})
for uid, val in sf.items():
    if isinstance(val, dict) and val.get('name') == 'ic_win':
        print(f'\nSpriteFrame ic_win: uid={uid}')
        print(f'  rect={val.get("rect")}')
        print(f'  atlasUrl={val.get("atlasUrl")}')
        print(f'  original_size={val.get("original_size")}')
        print(f'  offset={val.get("offset")}')
        print(f'  rotated={val.get("rotated")}')
