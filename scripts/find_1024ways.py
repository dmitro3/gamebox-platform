import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

def search(nodes, depth=0):
    for n in nodes:
        sprite = n.get('sprite', '')
        name = n.get('name', '')
        world = n.get('worldPct', {})
        active = n.get('active', '')
        # Show anything with 1024, info, message, ways, ad related sprites
        if sprite and any(x in str(sprite).lower() for x in ['1024', 'info', 'ways', 'win_info', 'totalwin', 'infoboard']):
            print(f"{'  '*depth}[{name}]  sprite={sprite}  active={active}")
            if world:
                print(f"{'  '*depth}  worldPct={world}")
        for c in n.get('children', []):
            search([c], depth+1)

tree = data.get('sceneTree', {})
search(tree.get('children', []))
