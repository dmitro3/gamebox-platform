import json

with open('uuid_batch.json') as f:
    pairs = json.load(f)
with open('native_urls.json') as f:
    entries = json.load(f)
with open('uuid_ext.json') as f:
    uuid_to_ext = json.load(f)

# Important path indices from the core (non-locale) asset list
important = {
    54: 'symbols/symbols',
    207: 'symbols/feature_symbols',
    333: 'background_controller',
    366: 'symbols/symbols_2',
    417: 'foreground_controller',
    528: 'multiplier_bar_controller',
    544: 'infoboard_controller',
    109: 'total_win',
    110: 'big_win',
    114: 'audio/bgm_mg',
    155: 'click_atlas',
    195: 'free_spins',
    196: 'setting_payout',
    230: 'bonus_loading',
    251: 'turbo_icon_up',
    492: 'click_effect',
    501: 'click_atlas_2',
}

found = []
for i, (p, e) in enumerate(zip(pairs, entries)):
    idx = p[0]
    if idx in important:
        ext = uuid_to_ext.get(e['uuid'], '?')
        print(f'  path={important[idx]!s:<35} uuid={e["uuid"][:20]}  hash={p[2]}  ext={ext}')
        found.append({
            'path_idx': idx,
            'path': important[idx],
            'uuid': e['uuid'],
            'hash': p[2],
            'ext': ext,
            'url_base': e['url_base'],
        })

print(f'\nFound {len(found)} / {len(important)} important assets')
