import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

results = []
def walk(node, path=''):
    name = node.get('name','')
    p = path+'/'+name
    wp = node.get('worldPct')
    sprite = node.get('sprite','')
    active = node.get('active', True)
    string = node.get('string','')   # text label content
    lbl = node.get('label','')
    
    if wp and 77.0 <= wp.get('topPct',0) <= 82.0:
        results.append({
            'name': name, 
            'top': wp['topPct'], 
            'left': wp['leftPct'],
            'w': wp['widthPct'],
            'h': wp['heightPct'],
            'sprite': sprite, 
            'active': active,
            'string': string,
            'label': lbl,
        })
    for child in node.get('children', []):
        walk(child, p)

walk(dump['sceneTree'])
results.sort(key=lambda r: (r['top'], r['left']))

for r in results:
    print(f"name={r['name']:30s} top={r['top']:5.2f}% left={r['left']:5.2f}% w={r['w']:5.2f}% h={r['h']:5.2f}% sprite={r['sprite']:20s} active={r['active']} string={repr(r['string'])}")
