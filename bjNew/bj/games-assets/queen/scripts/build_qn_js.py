"""从 mj.js 生成 qn.js 基础，再手工补丁关键常量。"""
import re
from pathlib import Path

src = Path(__file__).resolve().parent.parent.parent / 'mahjong' / 'js' / 'mj.js'
out = Path(__file__).resolve().parent.parent / 'js' / 'qn.js'

t = src.read_text(encoding='utf-8')
t = t.replace('bootMahjong', 'bootQueen')
t = t.replace('__mjBoot', '__qnBoot')
t = t.replace('麻将胡了', '赏金女王')
t = t.replace('.mj-', '.qn-')
t = t.replace('mj-', 'qn-')
t = re.sub(r'const ROWS = 4;', 'const ROWS = 3;', t)
t = re.sub(r"const LAYOUT_PREVIEW_TILE = 'wan1';", 'const LAYOUT_PREVIEW_TILE = null;', t)

TILES_BLOCK = """  const TILES = [
    { id: 'queen', img: 'queen.png', weight: 6, pay: 8 },
    { id: 'map', img: 'map.png', weight: 10, pay: 5 },
    { id: 'pistol', img: 'pistol.png', weight: 10, pay: 4 },
    { id: 'compass', img: 'compass.png', weight: 10, pay: 4 },
    { id: 'a', img: 'a.png', weight: 12, pay: 3 },
    { id: 'k', img: 'k.png', weight: 12, pay: 3 },
    { id: 'q', img: 'q.png', weight: 12, pay: 3 },
    { id: 'wild', img: 'wild.png', weight: 5, pay: 10, wild: true },
    { id: 'scatter', img: 'scatter.png', weight: 4, pay: 15, scatter: true }
  ];"""

t = re.sub(r'  const TILES = \[[\s\S]*?\];', TILES_BLOCK, t, count=1)

MULT_LAYOUT = """  const MULT_OVERLAY_LAYOUT = [
    { left: 0.068, top: 0.72, width: 0.19 },
    { left: 0.290, top: 0.72, width: 0.19 },
    { left: 0.512, top: 0.72, width: 0.19 },
    { left: 0.734, top: 0.72, width: 0.19 }
  ];"""

t = re.sub(r'  const MULT_OVERLAY_LAYOUT = \[[\s\S]*?\];', MULT_LAYOUT, t, count=1)

MSG_TIPS = """  const MSG_TIPS = [
    '百搭符号可替代除夺宝外的所有符号',
    '连赢递增倍数 x1 → x2 → x3 → x5',
    '3个或更多夺宝符号触发免费旋转',
    '赢得高达 8888 路赏金！'
  ];"""

t = re.sub(r'  const MSG_TIPS = \[[\s\S]*?\];', MSG_TIPS, t, count=1)

t = t.replace(
    "return { win: true, pay: 20 + huCount * 5, cells: winCells, hu: true, len: huCount };",
    "return { win: true, pay: 20 + huCount * 5, cells: winCells, scatter: true, len: huCount };"
)
t = t.replace("const label = ev.hu ? ('胡了 x' + ev.len)", "const label = ev.scatter ? ('夺宝 x' + ev.len)")

t = re.sub(
    r"function tileSrc\(tile\) \{[\s\S]*?\}",
    """function tileSrc(tile) {
    return './assets/tiles/' + tile.img + '?v=1';
  }""",
    t,
    count=1,
)

out.write_text(t, encoding='utf-8')
print('OK', out)
