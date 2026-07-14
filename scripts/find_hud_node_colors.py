import json

with open('scripts/pg-cocos-dump.json', encoding='utf-8') as f:
    dump = json.load(f)

def search_nodes(node_list, depth=0, parent=''):
    for n in node_list:
        if not isinstance(n, dict):
            continue
        name = n.get('name', '')
        sprite = n.get('sprite', '') or ''
        path = f'{parent}/{name}'
        
        # Look for bg_round_solid and ic_ icon nodes
        if 'bg_round_solid' in sprite or 'bg_round' in sprite:
            color = n.get('color')
            opacity = n.get('opacity')
            print(f'BG_ROUND: {path!r} color={color} opacity={opacity} sprite={sprite!r}')
        
        if sprite in ('ic_chip', 'ic_wallet_open', 'ic_win'):
            color = n.get('color')
            opacity = n.get('opacity')
            print(f'ICON: {path!r} sprite={sprite!r} color={color} opacity={opacity}')
        
        # Look for GameInfo/left_slot/middle_Slot/right_Slot
        if name in ('GameInfo', 'left_slot', 'middle_Slot', 'right_Slot', 'BalanceValue', 'bet_amount_value', 'WinCashValue'):
            color = n.get('color')
            opacity = n.get('opacity')
            print(f'HUD NODE: {path!r} color={color} opacity={opacity}')
        
        children = n.get('children', [])
        if children:
            search_nodes(children, depth+1, path)

search_nodes(dump.get('nodes', []))
