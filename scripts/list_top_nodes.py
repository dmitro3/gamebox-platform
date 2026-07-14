import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

print('Top level keys:', list(dump.keys())[:10])
nodes = dump.get('nodes', [])
print(f'Nodes type: {type(nodes).__name__}, length: {len(nodes) if isinstance(nodes, list) else "N/A"}')

if isinstance(nodes, list):
    for i, n in enumerate(nodes[:5]):
        if isinstance(n, dict):
            print(f'  nodes[{i}]: name={n.get("name")!r} keys={list(n.keys())}')
        else:
            print(f'  nodes[{i}]: type={type(n).__name__}')
elif isinstance(nodes, dict):
    for k, v in list(nodes.items())[:5]:
        print(f'  {k!r}: {type(v).__name__}')
