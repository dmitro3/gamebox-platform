import json

with open('all_sprite_frames.json') as f:
    frames = json.load(f)

print('=== All sprite frame names ===')
# Print all unique names that look like game symbols
all_names = sorted(set(f['name'] for f in frames))
for n in all_names:
    # filter for short names or symbol-like names
    if len(n) <= 20 or any(k in n.lower() for k in ['symbol','s_','bg','reel','board','scatter','wild','multiplier','glow','spin','info']):
        print(f'  {n}')
