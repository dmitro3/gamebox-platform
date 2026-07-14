import json

with open('all_sprite_frames.json') as f:
    frames = json.load(f)

# Show all short names (likely game symbols)
all_names = sorted(set(f['name'] for f in frames))

print('=== Short names (possible symbols) ===')
for n in all_names:
    if len(n) <= 25:
        print(f'  {n}')

print()
# Get all frame data grouped by texture UUID for symbols atlas
with open('native_urls.json') as f:
    entries = json.load(f)
symbols_uuid = '3856b7c5-0c59-4514-9770-eb3e800f4e09'
feature_uuid = 'e32de5a8-67c4-4001-a575-d7c08bd1c0ba'

print(f'=== Frames using symbols atlas ({symbols_uuid[:20]}) ===')
for f in frames:
    if f.get('texUuid','') == symbols_uuid:
        print(f'  {f["name"]:<30} rect={f["rect"]}')

print(f'\n=== Frames using feature atlas ({feature_uuid[:20]}) ===')
for f in frames:
    if f.get('texUuid','') == feature_uuid:
        print(f'  {f["name"]:<30} rect={f["rect"]}')

# Find all unique texture UUIDs
tex_uuids = {}
for f in frames:
    tx = f.get('texUuid','')
    if tx:
        tex_uuids[tx] = tex_uuids.get(tx, 0) + 1
print('\n=== Texture UUIDs (count of sprite frames) ===')
for uuid, count in sorted(tex_uuids.items(), key=lambda x:-x[1])[:20]:
    print(f'  {uuid}  ({count} frames)')
