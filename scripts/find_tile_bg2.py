import json

with open('all_sprite_frames.json') as f:
    frames = json.load(f)

# Find frames that could be tile backgrounds - look for 130x144 or similar tile-sized frames
# From win_frame_a_00: rect=[1,1,130,144] - this is the tile size!
# Also look for 'normal', 'reel', 'tile' keywords  
keywords = ['reel', 'normal', 'mahjong', 'tile_', '_tile', 'symbol_bg', 'sym_bg', 'scatter_bg']

print('=== Keyword search ===')
for fr in frames:
    name = fr['name'].lower()
    for k in keywords:
        if k in name:
            print(f'  {fr["name"]} rect={fr.get("rect","?")}')
            break

# Find frames with 130x144 dimensions (tile size)
print('\n=== Frames approx 130x144 ===')
for fr in frames:
    rect = fr.get('rect')
    if rect and len(rect) >= 4:
        w, h = rect[2], rect[3]
        if 120 <= w <= 170 and 130 <= h <= 200:
            print(f'  {fr["name"]} rect={rect} tex={fr.get("tex","")[:12]}')

# List all unique texture UUIDs to understand what textures we have
print('\n=== All unique texture UUIDs ===')
textures = set()
for fr in frames:
    t = fr.get('tex') or fr.get('texUuid', '')
    if t:
        textures.add(t[:8])
for t in sorted(textures):
    count = sum(1 for fr in frames if (fr.get('tex','') or fr.get('texUuid','')).startswith(t))
    print(f'  {t} ({count} frames)')
