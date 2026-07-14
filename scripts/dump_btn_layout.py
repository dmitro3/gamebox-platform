import json
with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    data = json.load(f)

targets = [
    'ReturnLobbyButton', 'ReturnLobbySprite', 'minus_bet_button', 'chip_sprite',
    'plus_bet_button', 'AutoSpinButton', 'AutoSpinSprite', 'AutoSpinTurn',
    'AutoSpinIcon', 'MoreMenuButton', 'MoreMenuSprite',
    'spin_base', 'normal_spin_holder', 'spin_button_controller',
    'turbo_effect_sprite', 'lighthing_effect_sprite',
]

def find(obj, depth=0, parent=''):
    if depth > 30:
        return
    if isinstance(obj, dict):
        n = obj.get('name', '')
        if n in targets or (n == 'chip_sprite' and obj.get('sprite') in ('btn_minus', 'btn_add')):
            wp = obj.get('worldPct', {})
            print('%25s active=%s sprite=%s' % (n, obj.get('active'), obj.get('sprite', '')))
            print('  wp=%s size=%s anchor=%s' % (wp, obj.get('size'), obj.get('anchor')))
        for k, v in obj.items():
            find(v, depth + 1, n)
    elif isinstance(obj, list):
        for v in obj:
            find(v, depth + 1, parent)

find(data)

# spin arrows sprite
sp = data.get('spriteFrames', {})
for name in ['spin_icon', 'spin_arrow', 'spin_arrows', 'btn_spin', 'spin_button']:
    for uid, info in sp.items():
        if info.get('name') == name:
            print('SPRITE', info)
