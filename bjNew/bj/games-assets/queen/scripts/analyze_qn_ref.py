# -*- coding: utf-8
"""分析赏金女王参考图 → 元素清单（仅用于布局/尺寸，不直接裁剪进成品）"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

REF = Path(
    r'C:\Users\pc\Desktop\jyh\_cgi-bin_mmwebwx-bin_webwxgetmsgimg__'
    r'&MsgID=2926183929875032804&skey=@crypt_511e7dcf_3b6445d6780a896513ce41c31e84003e'
    r'&mmweb_appid=wx_webfilehelper.jpg'
)
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'element-manifest.json'

W, H = 1280, 2781  # 参考图尺寸

# 归一化分区（相对全图 0~1）
ZONES = {
    'info_banner': {'y0': 0.0, 'y1': 0.065, 'desc': '顶部信息条（可选）'},
    'header_character': {'y0': 0.065, 'y1': 0.33, 'desc': '海盗女王 + 船舵 + 炮筒倍数条'},
    'reel_frame': {'y0': 0.33, 'y1': 0.68, 'desc': '5×3 绳框木栏转轴区'},
    'stats_bar': {'y0': 0.68, 'y1': 0.755, 'desc': '余额/投注/赢奖三栏'},
    'control_deck': {'y0': 0.755, 'y1': 1.0, 'desc': '船舵旋转钮 + 极速/自动/±'},
}

GRID = {'x0': 0.061, 'x1': 0.939, 'y0': 0.342, 'y1': 0.568, 'cols': 5, 'rows': 3}

# 参考图可见符号位置 → 元素 ID（用于对照，成品用 AI 重绘）
TILE_SAMPLES = [
    {'id': 'queen', 'row': 0, 'col': 0, 'desc': '女王肖像，紫粉光晕'},
    {'id': 'map', 'row': 0, 'col': 1, 'desc': '藏宝图卷轴 + 红X'},
    {'id': 'pistol', 'row': 0, 'col': 2, 'desc': '交叉金色燧发枪'},
    {'id': 'compass', 'row': 0, 'col': 3, 'desc': '金色罗盘'},
    {'id': 'a', 'row': 0, 'col': 4, 'desc': '金属字母 A'},
    {'id': 'k', 'row': 1, 'col': 0, 'desc': '金属字母 K'},
    {'id': 'wild', 'row': 1, 'col': 1, 'desc': '宝箱百搭，金边「百搭」'},
    {'id': 'q', 'row': 1, 'col': 2, 'desc': '金属字母 Q'},
    {'id': 'scatter', 'row': 1, 'col': 3, 'desc': '火炮夺宝，「夺宝」字'},
]

ELEMENTS = [
    {'id': 'room-bg', 'type': 'background', 'size': [1080, 1920],
     'desc': '竖屏全屏：日落天空 + 船甲板 + 绳结，中间留空给转轴'},
    {'id': 'top-header', 'type': 'header', 'size': [1080, 520],
     'desc': '女王立绘 + 船舵 + 四门炮筒倍数槽 x1/x2/x3/x5'},
    {'id': 'reel-frame', 'type': 'overlay', 'size': [980, 580],
     'desc': '木纹绳框 5×3 栅格（透明底）'},
    {'id': 'bottom-deco', 'type': 'footer', 'size': [1536, 360],
     'desc': '雕花木栏 + 消息区 + 三统计槽'},
    {'id': 'spin-btn', 'type': 'ui', 'size': [512, 512],
     'desc': '船舵旋转钮 + 金色双箭头'},
    {'id': 'splash', 'type': 'splash', 'size': [1080, 1920],
     'desc': '加载页：女王 + 宝藏 + 标题区'},
    {'id': 'qn-icon-wallet', 'type': 'icon', 'size': [64, 64]},
    {'id': 'qn-icon-coin', 'type': 'icon', 'size': [64, 64]},
    {'id': 'qn-icon-prize', 'type': 'icon', 'size': [64, 64]},
    {'id': 'mult-active-x1', 'type': 'mult', 'size': [220, 88]},
    {'id': 'mult-active-x2', 'type': 'mult', 'size': [220, 88]},
    {'id': 'mult-active-x3', 'type': 'mult', 'size': [220, 88]},
    {'id': 'mult-active-x5', 'type': 'mult', 'size': [220, 88]},
]

for t in TILE_SAMPLES:
    ELEMENTS.append({
        'id': f"tile-{t['id']}", 'type': 'tile', 'size': [288, 360],
        'desc': t['desc'], 'grid': {'row': t['row'], 'col': t['col']},
    })


def cell_bounds(col: int, row: int, pad: float = 0.08) -> dict:
    gx0, gx1 = GRID['x0'] * W, GRID['x1'] * W
    gy0, gy1 = GRID['y0'] * H, GRID['y1'] * H
    cw = (gx1 - gx0) / GRID['cols']
    ch = (gy1 - gy0) / GRID['rows']
    x0 = gx0 + col * cw + cw * pad
    y0 = gy0 + row * ch + ch * pad
    x1 = gx0 + (col + 1) * cw - cw * pad
    y1 = gy0 + (row + 1) * ch - ch * pad
    return {
        'px': [int(x0), int(y0), int(x1), int(y1)],
        'norm': [x0 / W, y0 / H, x1 / W, y1 / H],
    }


def main():
    if not REF.exists():
        raise FileNotFoundError(REF)

    im = Image.open(REF)
    manifest = {
        'reference': str(REF),
        'reference_size': list(im.size),
        'target_canvas': [1080, 1920],
        'zones': ZONES,
        'grid': GRID,
        'tile_samples': [
            {**t, 'bounds': cell_bounds(t['col'], t['row'])} for t in TILE_SAMPLES
        ],
        'elements': ELEMENTS,
        'css_layout': {
            'body_y': f"{ZONES['header_character']['y1'] * 100:.2f}%",
            'foot_y': f"{ZONES['stats_bar']['y0'] * 100:.2f}%",
        },
        'mult_slots_norm': [
            {'label': 'x1', 'left': 0.072, 'top': 0.74, 'width': 0.19},
            {'label': 'x2', 'left': 0.292, 'top': 0.74, 'width': 0.19},
            {'label': 'x3', 'left': 0.512, 'top': 0.74, 'width': 0.19},
            {'label': 'x5', 'left': 0.732, 'top': 0.74, 'width': 0.19},
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
    print('OK', OUT, 'elements:', len(ELEMENTS))


if __name__ == '__main__':
    main()
