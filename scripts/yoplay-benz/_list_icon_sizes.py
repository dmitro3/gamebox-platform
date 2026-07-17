# -*- coding: utf-8 -*-
import json
from pathlib import Path

m = json.loads(
    Path("client-app/public/images/games/bcbm/benz/bet/meta.json").read_text(
        encoding="utf-8"
    )
)
for k, v in sorted(m.items()):
    if k.startswith("yben_icon_bet_") or k.startswith("yben_txt_x"):
        print(f"{k}: {v['w']}x{v['h']}")
