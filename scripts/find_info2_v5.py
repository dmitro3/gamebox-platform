import json

with open('scripts/pg-cocos-dump.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def get_sprite_name(sprite):
    if isinstance(sprite, dict):
        return sprite.get('name')
    elif isinstance(sprite, str):
        return sprite
    return None

def walk(node, path='', depth=0):
    name = node.get('name', '')
    full_path = path + '/' + name
    sprite = node.get('sprite')
    sprite_name = get_sprite_name(sprite)
    world = node.get('worldPct', {})
    active = node.get('active', True)
    
    indent = '  ' * depth
    print(f"{indent}[{name}] active={active} sprite={sprite_name} world={world}")
    
    for child in node.get('children', []):
        walk(child, full_path, depth+1)

# Find infoboard_holder in sceneTree
def find_node(node, target_name):
    if node.get('name') == target_name:
        return node
    for child in node.get('children', []):
        result = find_node(child, target_name)
        if result:
            return result
    return None

root = data['sceneTree']
ib = find_node(root, 'infoboard_holder')
if ib:
    print("=== infoboard_holder subtree ===")
    walk(ib)
else:
    print("infoboard_holder NOT found")
    # Walk top level
    walk(root)
