"""
ic_win is at rect=[742, 3, 60, 60] in an unknown atlas.
Strategy: download all remaining PNGs from the game server that we haven't tried yet,
including any atlas files referenced in the game's asset bundles.

The Cocos dump has 84 textures, but the ic_win atlas might be in the BUNDLE system
where assets are loaded by UUID separately from the main textures.

Let's try downloading with the UUID pattern directly.
"""
import urllib.request, os
from PIL import Image
import numpy as np

BASE_URL = 'https://www.pgf-nvgais.com/65/assets/resources/native/'

# Sprites with atlasUrl=NONE: ic_win, ic_hist
# The atlas UUID might be embedded in the game's script files
# Let's try common UUID patterns for setting_menu bundles

# From cocos dump, the setting_menu uses UUID 75e507a6
# Maybe there's a "ld" (low-density) version or another variant
# Let's also check if there's a bundle at the setting_menu path
test_uuids = [
    # Try variants of 75e507a6
    '75e507a6-3bc5-4aa1-89ff-8fc31c86ef0c.f8847',
    # Try common PG Soft HUD atlas patterns
]

# Actually, let's search for the ic_win sprite UUID (1c5cdc83-9074-473d-8ef9-6afd93fabf0b) 
# in the game's meta/bundle data
# Cocos stores sprite frame data in JSON meta files

# The sprite frame UUID for ic_win is: 1c5cdc83-9074-473d-8ef9-6afd93fabf0b
# Try to find the parent atlas by looking for meta files
ic_win_uid = '1c5cdc83-9074-473d-8ef9-6afd93fabf0b'

# Try downloading meta files for potential setting_menu related assets
meta_test_urls = [
    # Setting menu path patterns
    f'https://www.pgf-nvgais.com/65/assets/resources/native/75/75e507a6-3bc5-4aa1-89ff-8fc31c86ef0c.f8847.json',
    f'https://www.pgf-nvgais.com/65/assets/resources/native/1c/1c5cdc83-9074-473d-8ef9-6afd93fabf0b.json',
]

print('Checking meta files...')
for url in meta_test_urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as r:
            data = r.read()
        print(f'SUCCESS: {url[-60:]}')
        print(f'  Content: {data[:200]}')
    except Exception as e:
        print(f'  FAILED: {url[-60:]}: {type(e).__name__}')

# Also try the game's asset bundle index to find all icon atlases
bundle_urls = [
    'https://www.pgf-nvgais.com/65/assets/resources/config.json',
    'https://www.pgf-nvgais.com/65/assets/main/index.js',
    'https://www.pgf-nvgais.com/65/assets/setting_menu/index.js',
]
print('\nChecking bundle indexes...')
for url in bundle_urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as r:
            data = r.read(2000)
        print(f'SUCCESS: {url}')
        print(f'  First 200 chars: {data[:200]}')
    except Exception as e:
        print(f'  FAILED {url}: {type(e).__name__}: {e}')
