import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

def find_in_range(obj, top_min, top_max, depth=0, path=''):
    if depth > 30:
        return
    if isinstance(obj, dict):
        wp = obj.get('worldPct', {})
        if isinstance(wp, dict):
            top = wp.get('topPct', -999)
            h = wp.get('heightPct', 0)
            if top_min <= top <= top_max or (top < top_max and top + h > top_min):
                name = obj.get('name', '?')
                sprite = obj.get('sprite', '')
                active = obj.get('active', True)
                if sprite or name in ['GameInfo', 'spin_base', 'btnBar', 'background']:
                    print(f'{name:35s} active={active} sprite={sprite}')
                    print(f'  wp={wp}')
                    au = obj.get('atlasUrl') or ''
                    if au:
                        print(f'  atlas={au[:90]}')
                    print()
        for k, v in obj.items():
            find_in_range(v, top_min, top_max, depth+1, path+'/'+str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            find_in_range(v, top_min, top_max, depth+1, path+f'[{i}]')

print('=== Nodes overlapping button area (65% - 95% top) ===')
find_in_range(data, 65, 95)
