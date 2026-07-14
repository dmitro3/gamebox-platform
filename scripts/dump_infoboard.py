import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

scene = data.get('sceneTree', data)

def find_node(node, target_name):
    name = node.get('name', '')
    if name == target_name:
        return node
    for child in node.get('children', []):
        result = find_node(child, target_name)
        if result:
            return result
    return None

def print_tree(node, depth=0, max_depth=6):
    if depth > max_depth:
        return
    name = node.get('name', '?')
    sprite = node.get('sprite', '')
    text_val = node.get('text', '')
    active = node.get('active', '')
    opacity = node.get('opacity', '')
    wpct = node.get('worldPct', {})
    top = round(wpct.get('top', 0), 3) if wpct else ''
    h = round(wpct.get('height', 0), 3) if wpct else ''
    left = round(wpct.get('left', 0), 3) if wpct else ''
    w = round(wpct.get('width', 0), 3) if wpct else ''

    info_parts = [f'active={active}']
    if sprite: info_parts.append(f'sprite={sprite}')
    if text_val: info_parts.append(f'text={repr(text_val[:40])}')
    if opacity != '' and opacity != 255: info_parts.append(f'opacity={opacity}')
    if top: info_parts.append(f'pos: top={top}% h={h}% left={left}% w={w}%')

    print(f'{"  "*depth}{name}  [{", ".join(info_parts)}]')
    for child in node.get('children', []):
        print_tree(child, depth+1, max_depth)

# Find and print infoboard_controller
node = find_node(scene, 'infoboard_controller')
if node:
    print('=== infoboard_controller full tree ===')
    print_tree(node, max_depth=6)
else:
    print('infoboard_controller NOT found')

# Also find win_amount to see current value
print('\n=== win_amount node ===')
node2 = find_node(scene, 'win_amount')
if node2:
    print_tree(node2, max_depth=4)

# Find total_win_controller
print('\n=== total_win_controller ===')
node3 = find_node(scene, 'total_win_controller')
if node3:
    print_tree(node3, max_depth=4)
