"""
ic_win rect=[742,3,60,60] with atlasUrl=None
ic_hist rect=[356,3,108,108] with atlasUrl=None

Both sprites start at y=3. Both are likely in the SAME MISSING ATLAS.
The missing atlas needs width >= 802.

Strategy: Try to find the Cocos asset bundle config for setting_menu
which would list ALL atlas files.
"""
import urllib.request, json

BASE = 'https://www.pgf-nvgais.com/65/'

# Try known Cocos Creator bundle paths
paths_to_try = [
    'assets/setting_menu/index.js',
    'src/setting_menu.js',
    'assets/resources/native/config.json',
    'assets/main/config.json',
    'src/chunks/setting_menu.js',
    'chunks/setting_menu.js',
    # Also try to find the setting_menu bundle UUID/config
    'assets/setting_menu/config.json',
]

print('Searching for setting_menu bundle config...')
for path in paths_to_try:
    url = BASE + path
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as r:
            data = r.read(3000)
        print(f'\nSUCCESS: {url}')
        print(f'Content: {data[:500]}')
    except Exception as e:
        print(f'  {path}: {type(e).__name__}')

# Also try to find the sprite frame meta for ic_win UUID
# ic_win UID: 1c5cdc83-9074-473d-8ef9-6afd93fabf0b
ic_win_uid = '1c5cdc83'
uid_paths = [
    f'assets/resources/native/{ic_win_uid[:2]}/{ic_win_uid}-9074-473d-8ef9-6afd93fabf0b.json',
    f'assets/resources/{ic_win_uid[:2]}/{ic_win_uid}-9074-473d-8ef9-6afd93fabf0b.json',
]
print('\nSearching for ic_win sprite frame meta...')
for path in uid_paths:
    url = BASE + path
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as r:
            data = r.read()
        print(f'SUCCESS: {url}')
        print(f'Content: {data[:500]}')
    except Exception as e:
        print(f'  {path}: {type(e).__name__}')
