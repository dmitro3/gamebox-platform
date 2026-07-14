import json

with open('scripts/pg-cocos-dump.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def find_all(node, results=None, path=''):
    if results is None:
        results = []
    name = node.get('name','')
    label = node.get('label')
    sprite = node.get('sprite')
    richtext = node.get('richText')
    
    if label and label.get('string','').strip():
        results.append({'path': path+'/'+name, 'type':'label', 'text': label.get('string',''), 'node': node})
    if richtext and richtext.get('string','').strip():
        results.append({'path': path+'/'+name, 'type':'richtext', 'text': richtext.get('string',''), 'node': node})
    if sprite and 'info2' in sprite.get('name',''):
        results.append({'path': path+'/'+name, 'type':'sprite', 'sprite': sprite.get('name'), 'node': node})
    
    for child in node.get('children', []):
        find_all(child, results, path+'/'+name)
    return results

root = data if isinstance(data, list) else [data]
all_results = []
for n in (root if isinstance(root, list) else [root]):
    find_all(n, all_results)

print('=== Labels with text ===')
for r in all_results:
    if r['type'] == 'label':
        active = r['node'].get('active', True)
        world = r['node'].get('worldPct', {})
        print(f"  active={active} | text={repr(r['text'][:100])}")
        print(f"    world={world}")

print()
print('=== info2 sprites ===')
for r in all_results:
    if r['type'] == 'sprite':
        n = r['node']
        sp = n.get('sprite',{})
        print(f"  [{n['name']}] sprite={sp.get('name')} active={n.get('active')} world={n.get('worldPct')}")
        print(f"    atlasUrl={str(sp.get('atlasUrl',''))[:80]}")
        print(f"    rect={sp.get('rect')}")
