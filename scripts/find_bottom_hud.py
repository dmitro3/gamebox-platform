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
    
    if wp and wp.get('topPct', 0) > 75:
        results.append({'name': name, 'path': p[-90:], 'worldPct': wp, 'sprite': sprite[:30], 'active': active})
    for child in node.get('children', []):
        walk(child, p)

walk(dump['sceneTree'])
results.sort(key=lambda r: r['worldPct']['topPct'])

for r in results[:80]:
    wp = r['worldPct']
    print(f"{r['name']:30s} sprite:{r['sprite']:25s} top:{wp['topPct']:6.2f}% left:{wp['leftPct']:6.2f}% w:{wp['widthPct']:6.2f}% h:{wp['heightPct']:6.2f}% active:{r['active']}")
