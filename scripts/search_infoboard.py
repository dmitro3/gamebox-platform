import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

def search_node(node, path=''):
    name = node.get('name', '')
    current_path = f'{path}/{name}'
    if 'info' in name.lower() or 'message' in name.lower() or 'win_' in name.lower() or 'ticker' in name.lower() or 'ad_' in name.lower() or 'board' in name.lower():
        sprite = node.get('sprite', '')
        text = node.get('text', '')
        active = node.get('active', '')
        wpct = node.get('worldPct', '')
        print(f'{current_path}')
        if sprite: print(f'   sprite={sprite}')
        if text: print(f'   text={repr(text)}')
        if wpct: print(f'   worldPct={wpct}')
        print(f'   active={active}')
    for child in node.get('children', []):
        search_node(child, current_path)

search_node(data)
