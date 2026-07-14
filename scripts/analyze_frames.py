import json

with open(r'C:\Users\pc\.cursor\browser-logs\cdp-response-Runtime.evaluate-2026-06-21T00-07-40-308Z.json') as f:
    data = json.load(f)

result_str = data.get('result', {}).get('value', '')
parsed = json.loads(result_str)
frames = parsed['frames']
print(f'Total sprite frames: {parsed["total"]}')
print()

# Find symbol-related frames
keywords = ['2s','2t','5s','5t','8w','bai','fa','hu','wild','zhong','symbol','tile','slot','icon',
            'bg','reel','frame','board','scatter','multiplier','glow','bonus','spin','wheel',
            'stone','jade','coin','golden']
print('=== Relevant frames ===')
for f in frames:
    name = f['name'].lower()
    if any(kw in name for kw in keywords):
        texUuid = (f.get('texUuid') or '')[:20]
        print(f'  {f["name"]:<40} rect={f["rect"]}  tex={texUuid}')

# Also save all frames
with open('all_sprite_frames.json', 'w', encoding='utf-8') as f:
    json.dump(frames, f, indent=2, ensure_ascii=False)
print(f'\nAll {len(frames)} frames saved to all_sprite_frames.json')
