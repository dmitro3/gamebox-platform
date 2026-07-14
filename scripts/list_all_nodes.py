import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

scene = data.get('sceneTree', data)

def list_nodes(node, depth=0):
    name = node.get('name', '?')
    sprite = node.get('sprite', '')
    text = node.get('text', '')
    wpct = node.get('worldPct', {})
    top = wpct.get('top', '') if wpct else ''
    extra = ''
    if sprite: extra += f' sprite={sprite}'
    if text: extra += f' text={repr(text[:30])}'
    if top: extra += f' top={round(top,2)}'
    print(f'{"  "*depth}{name}{extra}')
    for child in node.get('children', []):
        list_nodes(child, depth+1)

list_nodes(scene)
