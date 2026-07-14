import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

def search_sprite(nodes, depth=0):
    for n in nodes:
        sprite = n.get('sprite', '')
        name = n.get('name', '')
        if sprite and ('info' in str(sprite).lower() or 'info' in name.lower()):
            print(f"{'  '*depth}[{name}] sprite={sprite} blend={n.get('blendMode','')} active={n.get('active','')} world={n.get('worldPct',{})}")
        for c in n.get('children', []):
            search_sprite([c], depth+1)

# sceneTree contains all nodes
tree = data.get('sceneTree', {})
print('sceneTree type:', type(tree))
if isinstance(tree, list):
    print('sceneTree list len:', len(tree))
    search_sprite(tree)
elif isinstance(tree, dict):
    children = tree.get('children', [])
    print('sceneTree children:', len(children))
    if children:
        print('First child:', children[0].get('name','?'))
        search_sprite(children)
