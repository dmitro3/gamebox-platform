"""从 ssc 复制并生成 ffc（1分时时彩）资源"""
import re
import os

ROOT = os.path.join(os.path.dirname(__file__), '..', 'games-assets')
PAIRS = [
    ('ssc/css/ssc.css', 'ffc/css/ffc.css'),
    ('ssc/js/ssc.js', 'ffc/js/ffc.js'),
    ('ssc/js/result-card.js', 'ffc/js/result-card.js'),
    ('ssc/index.html', 'ffc/index.html'),
]

for src, dst in PAIRS:
    src_path = os.path.join(ROOT, src)
    dst_path = os.path.join(ROOT, dst)
    with open(src_path, 'r', encoding='utf-8') as f:
        text = f.read()
    text = text.replace('快乐时时彩', '1分时时彩')
    text = text.replace('ssc-in-iframe', 'ffc-in-iframe')
    text = text.replace('SscResultCard', 'FfcResultCard')
    text = text.replace('ssc_bet_log_', 'ffc_bet_log_')
    text = text.replace('ssc-bet-log-updated', 'ffc-bet-log-updated')
    text = text.replace('ssc_stats_', 'ffc_stats_')
    text = text.replace("game: 'ssc'", "game: 'ffc'")
    text = text.replace('game=ssc', 'game=ffc')
    text = text.replace('./css/ssc.css', './css/ffc.css')
    text = text.replace('./js/ssc.js', './js/ffc.js')
    text = re.sub(r'\bssc\b', 'ffc', text)
    text = text.replace('const INTERVAL = 120', 'const INTERVAL = 60')
    text = text.replace(
        '2 分钟一期 = 1:56 下注倒计时 + 4s 准备中',
        '1 分钟一期 = 0:56 下注倒计时 + 4s 准备中',
    )
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    with open(dst_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print('wrote', dst)
