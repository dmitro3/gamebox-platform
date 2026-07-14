"""
Find the missing atlas by fetching the game's JS bundle.
The missing atlas likely contains: ic_hist, txt_auto, txt_turbo_on/off, ic_win
All start at y=3, atlas width >= 802px.
"""
import urllib.request, re, os
from PIL import Image
import numpy as np

def try_url(url, save_as=None, read_bytes=5000):
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.pgf-nvgais.com/'
        })
        with urllib.request.urlopen(req, timeout=12) as r:
            data = r.read() if save_as else r.read(read_bytes)
        if save_as:
            with open(save_as, 'wb') as f:
                f.write(data)
            return True, len(data)
        return True, data
    except Exception as e:
        return False, str(e)

# Try to fetch the game's main index.html to extract asset URLs
print('Fetching game index.html...')
ok, data = try_url('https://www.pgf-nvgais.com/65/index.html?btt=1&oc=0&iwk=1&ops=cd80d3917ab04319939d5502c46f7a85&l=zh&or=https://www.pgf-nvgais.com&card=1&game_code=65', read_bytes=50000)
if ok:
    text = data.decode('utf-8', errors='replace')
    # Find all PNG/atlas URLs
    urls = re.findall(r'https?://[^\s"\'<>]+\.png', text)
    print(f'Found {len(urls)} PNG URLs in index.html')
    for u in urls[:20]:
        print(f'  {u}')
    
    # Find JS bundle URLs
    js_urls = re.findall(r'https?://[^\s"\'<>]+\.js', text)
    print(f'Found {len(js_urls)} JS URLs')
    for u in js_urls[:10]:
        print(f'  {u}')
    
    # Find any numeric UUIDs that might be atlas references
    uuids = re.findall(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', text)
    print(f'Found {len(set(uuids))} unique UUIDs')
else:
    print(f'Failed: {data}')

# Try the game's main JS file (try common paths)
print('\nTrying game JS bundle paths...')
js_paths = [
    'https://www.pgf-nvgais.com/65/index.js',
    'https://www.pgf-nvgais.com/65/game.js',
    'https://www.pgf-nvgais.com/65/main.js',
]
for url in js_paths:
    ok, data = try_url(url)
    if ok:
        print(f'SUCCESS: {url}')
        # Search for ic_win or UUID
        text = data.decode('utf-8', errors='replace')
        if 'ic_win' in text:
            idx = text.index('ic_win')
            print(f'  Found ic_win at idx={idx}')
            print(f'  Context: {text[max(0,idx-100):idx+200]}')
    else:
        print(f'  FAILED {url}: {data[:80]}')
