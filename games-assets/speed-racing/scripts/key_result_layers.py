"""开奖公布分层素材：黑底转透明（聚光灯保留黑底供 screen 混合）"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'result'
AI = ROOT / 'ai-sources'

# 黑底 → 透明；threshold 越高抠得越狠
KEY = 28


def key_black(src: Path, dst: Path, threshold: int = KEY) -> None:
    im = Image.open(src).convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r <= threshold and g <= threshold and b <= threshold:
                px[x, y] = (0, 0, 0, 0)
    im.save(dst, 'PNG', optimize=True)
    print('keyed', dst.name, im.size)


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    AI.mkdir(parents=True, exist_ok=True)
    for name in ('podium', 'laurel-gold', 'laurel-silver', 'laurel-bronze', 'race-car'):
        src = AI / f'{name}.png'
        if not src.exists():
            src = ROOT / f'{name}.png'
        if not src.exists():
            print('skip missing', name)
            continue
        key_black(src, ROOT / f'{name}.png')
    # 背景、聚光灯不抠
    for name in ('bg', 'spotlight'):
        src = AI / f'{name}.png'
        if src.exists():
            Image.open(src).convert('RGBA').save(ROOT / f'{name}.png', 'PNG', optimize=True)
            print('copied', name)


if __name__ == '__main__':
    main()
