"""从 ssc 模板生成极速赛车 H5 资源（界面同时时彩，玩法为 PK10）"""
import os
import re

ROOT = os.path.join(os.path.dirname(__file__), '..', 'games-assets')
SRC = os.path.join(ROOT, 'ssc')
DST = os.path.join(ROOT, 'speed-racing')
BJSC_CSS = os.path.join(ROOT, 'bjsc', 'css', 'bjsc.css')
BJSC_ASSETS = os.path.join(ROOT, 'bjsc', 'assets')


def rename_ssc_to_jsr(text: str) -> str:
    text = text.replace('快乐时时彩', '极速赛车')
    text = text.replace('ssc-in-iframe', 'jsr-in-iframe')
    text = text.replace('ssc_bet_log_', 'jsr_bet_log_')
    text = text.replace('ssc-bet-log-updated', 'jsr-bet-log-updated')
    text = text.replace('ssc_stats_', 'jsr_stats_')
    text = text.replace("game: 'ssc'", "game: 'speed-racing'")
    text = text.replace('game=ssc', 'game=speed-racing')
    text = text.replace('./css/ssc.css', './css/jsr.css')
    text = text.replace('./js/ssc.js', './js/jsr.js')
    text = text.replace('./js/result-card.js', '')
    text = re.sub(r'<script src=""></script>\n', '', text)
    text = re.sub(r'\bssc\b', 'jsr', text)
    text = text.replace('const INTERVAL = 120', 'const INTERVAL = 60')
    text = text.replace(
        '2 分钟一期 = 1:56 下注倒计时 + 4s 准备中',
        '1 分钟一期 = 0:56 下注倒计时 + 4s 准备中',
    )
    text = text.replace(
        'placeholder="玩法/金额，如 十百59/100、万单/梭哈"',
        'placeholder="玩法/金额，如 冠军大/100、冠亚单/梭哈"',
    )
    return text


def patch_index_html(text: str) -> str:
    text = text.replace(
        '<script src="./js/result-card.js"></script>\n',
        '',
    )
    text = text.replace(
        '<col class="col-ball" span="5">',
        '<col class="col-ball" span="10">',
    )
    text = text.replace(
        '<th>万</th><th>千</th><th>百</th><th>十</th><th>个</th>\n'
        '              <th>和值</th>\n'
        '              <th>斗牛</th>',
        '<th>一</th><th>二</th><th>三</th><th>四</th><th>五</th>\n'
        '              <th>六</th><th>七</th><th>八</th><th>九</th><th>十</th>\n'
        '              <th>冠亚</th>\n'
        '              <th>龙虎</th>',
    )
    text = text.replace(
        '<button type="button" data-tab="niu">斗牛</button>',
        '<button type="button" data-tab="gy">冠亚</button>',
    )
    text = text.replace(
        '<button type="button" data-tab="digit">号码</button>\n'
        '      <button type="button" data-tab="shape">形态</button>',
        '<button type="button" data-tab="gy">冠亚</button>\n'
        '      <button type="button" data-tab="num">车号</button>',
    )
    return text


def extract_ball_css() -> str:
    with open(BJSC_CSS, 'r', encoding='utf-8') as f:
        css = f.read()
    blocks = []
    for line in css.splitlines():
        if '.bjsc-ball' in line or (blocks and line.strip() and not line.startswith('.jsr-')):
            blocks.append(line.replace('.bjsc-ball', '.jsr-ball').replace('bjsc-', 'jsr-'))
        elif blocks and line.strip() == '' and len(blocks) > 5:
            break
    # grab ball section more reliably
    m = re.search(r'(\.bjsc-ball[\s\S]*?\.bjsc-ball\.podium\[data-n="10"\][^\n]*\n)', css)
    if not m:
        return ''
    ball_css = m.group(1).replace('.bjsc-ball', '.jsr-ball')
    podium = re.search(r'(\.bjsc-result-card[\s\S]*?\.bjsc-podium-slot[\s\S]*?\})', css)
    extra = ''
    if podium:
        extra = podium.group(1).replace('bjsc-', 'jsr-')
    return '\n/* ---------- PK10 赛车球 ---------- */\n' + ball_css + '\n' + extra + '\n'


def copy_assets():
    import shutil
    dst_assets = os.path.join(DST, 'assets')
    if os.path.isdir(dst_assets):
        shutil.rmtree(dst_assets)
    shutil.copytree(BJSC_ASSETS, dst_assets)
    print('copied assets from bjsc')


def main():
    os.makedirs(os.path.join(DST, 'css'), exist_ok=True)
    os.makedirs(os.path.join(DST, 'js'), exist_ok=True)

    with open(os.path.join(SRC, 'css', 'ssc.css'), 'r', encoding='utf-8') as f:
        css = rename_ssc_to_jsr(f.read())
    css += extract_ball_css()
    with open(os.path.join(DST, 'css', 'jsr.css'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(css)
    print('wrote css/jsr.css')

    with open(os.path.join(SRC, 'index.html'), 'r', encoding='utf-8') as f:
        html = patch_index_html(rename_ssc_to_jsr(f.read()))
    with open(os.path.join(DST, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    print('wrote index.html')

    copy_assets()


if __name__ == '__main__':
    main()
