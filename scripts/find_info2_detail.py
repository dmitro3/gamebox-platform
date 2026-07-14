import json, re

with open('scripts/pg-cocos-dump.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def walk(node, path=''):
    name = node.get('name', '')
    sprite = node.get('sprite')
    
    # Print full info for message-related nodes
    if name in ('message', 'info2') or (sprite and 'info2' in str(sprite.get('name', ''))):
        print(f"\n=== NODE: {path}/{name} ===")
        print(f"  active: {node.get('active')}")
        print(f"  worldPct: {node.get('worldPct')}")
        if sprite:
            print(f"  sprite.name: {sprite.get('name')}")
            print(f"  sprite.rect: {sprite.get('rect')}")
            print(f"  sprite.atlasUrl: {str(sprite.get('atlasUrl',''))[:120]}")
        children = node.get('children', [])
        print(f"  children: {[c['name'] for c in children]}")
        for c in children:
            print(f"    child [{c['name']}] active={c.get('active')} worldPct={c.get('worldPct')} sprite={c.get('sprite',{}).get('name') if c.get('sprite') else None}")
    
    for child in node.get('children', []):
        walk(child, path+'/'+name)

root = data if isinstance(data, list) else [data]
for n in (root if isinstance(root, list) else [root]):
    walk(n)

# Also find the atlas file that contains info2
print("\n\n=== ATLAS FILE for info2 ===")
raw = json.dumps(data)
# Find the atlas entry
m = re.search(r'"name":\s*"info2"[^}]{0,500}"atlasUrl":\s*"([^"]+)"', raw)
if m:
    print(f"atlasUrl: {m.group(1)}")
    
# Find the sprite rect
m2 = re.search(r'"name":\s*"info2"[^}]{0,500}"rect":\s*(\{[^}]+\})', raw)
if m2:
    print(f"rect: {m2.group(1)}")
