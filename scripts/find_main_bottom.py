import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

def find(obj, kws, depth=0):
    if depth > 30:
        return
    if isinstance(obj, dict):
        n = obj.get('name', '')
        s = obj.get('sprite', '')
        if any(k in str(n).lower() or k in str(s).lower() for k in kws):
            wp = obj.get('worldPct', {})
            print('name=%s sprite=%s' % (n, s))
            print('  wp=%s size=%s' % (wp, obj.get('size')))
            au = obj.get('atlasUrl') or ''
            if au:
                print('  atlas=%s' % au[:100])
        for v in obj.values():
            find(v, kws, depth + 1)
    elif isinstance(obj, list):
        for v in obj:
            find(v, kws, depth + 1)

find(data, ['main_bottom'])
