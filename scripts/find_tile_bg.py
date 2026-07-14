import json

with open('all_sprite_frames.json') as f:
    frames = json.load(f)

keywords = ['tile', 'bg', 'base', 'back', 'plate', 'frame', 'board', 'normal', 'slot', 'cell']
results = []
for fr in frames:
    name = fr['name'].lower()
    for k in keywords:
        if k in name:
            results.append(fr)
            break

print(f'Found {len(results)} potential tile BG frames:')
for r in results[:50]:
    tex = r.get("tex","")
    print(f'  {r["name"]} tex={tex[:8] if tex else "none"} rect={r.get("rect","?")}')

# Also look at what's in the symbols atlas (3856b7c5) but is NOT one of the known symbols
KNOWN_SYMBOLS = {'h_char_8', 'h_char_2_stick', 'h_char_5_stick', 'h_char_2_circle', 
                 'h_char_5_circle', 'h_char_fa', 'h_char_zhong', 'h_char_bai',
                 's_wild', 's_scatter', 'l_ball_2', 'l_ball_5', 'l_bamboo_2', 'l_bamboo_5'}
MAIN_TEX = '3856b7c5'
print('\nAll frames in main symbols atlas:')
for fr in frames:
    if fr.get('tex','').startswith(MAIN_TEX) or fr.get('texUuid','').startswith(MAIN_TEX):
        print(f'  {fr["name"]} rect={fr["rect"]}')
