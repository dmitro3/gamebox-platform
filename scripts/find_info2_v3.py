import json, re

with open('scripts/pg-cocos-dump.json', 'r', encoding='utf-8') as f:
    raw = f.read()
    data = json.loads(raw)

# Look for "message" node
def walk(node, path=''):
    name = node.get('name', '')
    full_path = path + '/' + name
    
    if name == 'message':
        print(f"\n=== NODE: {full_path} ===")
        # Print entire node as pretty JSON (truncated)
        s = json.dumps(node, ensure_ascii=False, indent=2)
        print(s[:3000])
    
    for child in node.get('children', []):
        walk(child, full_path)

root = data if isinstance(data, list) else [data]
for n in (root if isinstance(root, list) else [root]):
    walk(n)
