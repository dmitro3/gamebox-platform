import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

# Navigate into GameInfo children to find icon + text nodes
def find_nodes_with_wp(obj, top_min, top_max, depth=0):
    if depth > 30:
        return
    if isinstance(obj, dict):
        wp = obj.get('worldPct', {})
        if isinstance(wp, dict):
            top = wp.get('topPct', -1)
            if top_min <= top <= top_max:
                name = obj.get('name', '?')
                left = wp.get('leftPct', 0)
                width = wp.get('widthPct', 0)
                height = wp.get('heightPct', 0)
                sprite = obj.get('sprite', '')
                fontsize = obj.get('fontSize', '')
                color = obj.get('color', '')
                active = obj.get('active', '')
                size = obj.get('size', '')
                if name not in ['', '?']:
                    print(f"  name={name:30s} L={left:6.2f}% T={top:6.2f}% W={width:6.2f}% H={height:6.2f}% | sprite={sprite} font={fontsize} color={color}")
        for k, v in obj.items():
            find_nodes_with_wp(v, top_min, top_max, depth+1)
    elif isinstance(obj, list):
        for item in obj:
            find_nodes_with_wp(item, top_min, top_max, depth+1)

print("=== All nodes in HUD area (77-82% top) ===")
find_nodes_with_wp(data, 77.0, 82.5)
