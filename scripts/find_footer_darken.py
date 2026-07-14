import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

def find_by_name(obj, name, depth=0, path=''):
    if depth > 30:
        return
    if isinstance(obj, dict):
        n = obj.get('name', '')
        if n == name:
            print('PATH:', path)
            for k in ['name','sprite','worldPct','size','color','active','opacity','atlasUrl']:
                if k in obj:
                    print(f'  {k}: {obj[k]}')
            print()
        for k, v in obj.items():
            find_by_name(v, name, depth+1, path+'/'+k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            find_by_name(v, name, depth+1, path+f'[{i}]')

for n in ['footer_darken', 'main_bottom_a', 'main_bottom_b', 'black_tint_background']:
    print(f'=== {n} ===')
    find_by_name(data, n)
