import json

with open('all_sprite_frames.json') as f:
    frames = json.load(f)

# Print all unique names
all_names = sorted(set(f['name'] for f in frames))

# Print ones that look like game symbol tiles
# Key patterns for PG Mahjong Ways symbols
symbol_patterns = ['s_', 'sym', 'tile', 'reel', 'board', 'scatter', 'wild', 
                   'multiplier', 'infoboard', 'info_glow', 'spin_glow', 'spin_base',
                   'spin_flare', 'win_glow', 'symbol_base', 'freespin',
                   'bg_', 'stone', 'jade', 'slot_bg', 'bonus_bg', 'mahjong',
                   'bai', 'zhong', 'fa', 'bamboo', 'char', 'wind']

print('=== All sprite names (searching for game symbols) ===')
found = []
for n in all_names:
    nl = n.lower()
    if any(p in nl for p in symbol_patterns):
        found.append(n)
        
for n in found:
    print(f'  {n}')

print(f'\nTotal: {len(found)} / {len(all_names)} frames')

# Also print specific names we want
print('\n=== Checking for specific symbol names ===')
targets = ['s_2s','s_2t','s_5s','s_5t','s_8w','s_bai','s_fa','s_hu','s_wild','s_zhong',
           's_2s_g','s_bai_g','s_wild_g',  # golden variants
           'bg','reel_bg','game_bg','background',
           'multiplier_bar', 'multiplier', 'payout']
for t in targets:
    matches = [n for n in all_names if t.lower() in n.lower()]
    if matches:
        print(f'  {t}: {matches}')
    else:
        print(f'  {t}: NOT FOUND')
