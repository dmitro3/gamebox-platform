import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

def find(obj, kws, depth=0):
    if depth > 30:
        return
    if isinstance(obj, dict):
        name = obj.get('name', '')
        sprite = obj.get('sprite', '')
        wp = obj.get('worldPct', {})
        top = wp.get('topPct', -1) if isinstance(wp, dict) else -1
        if any(k in str(name).lower() or k in str(sprite).lower() for k in kws):
            if 74 <= top <= 92 or top == -1:
                if 74 <= top <= 92:
                    print(f'name={name:30s} sprite={sprite}')
                    print(f'  wp={wp} size={obj.get("size")} active={obj.get("active")}')
                    print()
        for v in obj.values():
            find(v, kws, depth + 1)
    elif isinstance(obj, list):
        for v in obj:
            find(v, kws, depth + 1)

print('=== Button area nodes (74-92% top) ===')
find(data, ['spin', 'turbo', 'auto', 'minus', 'plus', 'menu', 'bet_option', 'btn_'])
