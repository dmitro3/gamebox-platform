import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

frames = data.get('spriteFrames', {})

# Get rects for all sprites from f3aabdc9 atlas
print('=== All sprites from f3aabdc9 atlas (2040x208) ===')
for guid, v in frames.items():
    if isinstance(v, dict):
        atlas = v.get('atlasUrl', '') or ''
        if 'f3aabdc9' in atlas:
            print(f"  name={v['name']}  rect={v.get('rect')}  origSize={v.get('originalSize')}  rotated={v.get('rotated')}")

print()

# Find the node using info2 sprite and check blend mode
def search(nodes, depth=0):
    for n in nodes:
        sprite = n.get('sprite', '')
        if sprite and 'info2' in str(sprite).lower():
            blend = n.get('blendMode', n.get('blend', ''))
            props = {k: v for k, v in n.items() if k not in ['children']}
            print(f"{'  '*depth}NODE: {n.get('name','')}  blend={blend}")
            print(f"{'  '*depth}  full_props: {props}")
        children = n.get('children', [])
        if children:
            search(children, depth + 1)

search(data.get('nodes', []))
