import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

def find_nodes(obj, keywords, path='', depth=0):
    results = []
    if depth > 20:
        return results
    if isinstance(obj, dict):
        name = obj.get('name', '')
        if any(k.lower() in name.lower() for k in keywords):
            results.append((path + '/' + name, obj))
        for k, v in obj.items():
            results.extend(find_nodes(v, keywords, path + '/' + k, depth+1))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            results.extend(find_nodes(v, keywords, path + f'[{i}]', depth+1))
    return results

keywords = ['gameinfo', 'balance', 'credit', 'bet_amount', 'totalwin', 'wallet_button', 'ic_wallet', 'ic_chip', 'ic_rule']
hits = find_nodes(data, keywords)
for path, node in hits[:30]:
    print(f'PATH: {path}')
    for k in ['name','fontSize','color','worldPct','sprite','active','string','text']:
        if k in node:
            print(f'  {k}: {node[k]}')
    print()
