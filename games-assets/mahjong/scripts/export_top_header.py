"""顶栏导出：从一体式原稿还原，仅去黑底裁边，不做分块缩放。"""
from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parent.parent / 'assets'
CURSOR_ASSETS = Path(r'C:\Users\pc\.cursor\projects\c-Users-pc-Desktop-bj\assets')

SRC_CANDIDATES = [
    CURSOR_ASSETS / 'mj-top-header-unified.png',
    ASSETS / 'top-header-ai.png',
]


def black_to_alpha(im: Image.Image, thresh: int = 30) -> Image.Image:
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r <= thresh and g <= thresh and b <= thresh:
                px[x, y] = (0, 0, 0, 0)
    return im


def trim(im: Image.Image, thresh: int = 28) -> Image.Image:
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()

    def ok(x, y):
        r, g, b, a = px[x, y]
        return a > 0 and (r > thresh or g > thresh or b > thresh)

    top = next((y for y in range(h) if any(ok(x, y) for x in range(w))), 0)
    bot = next((y for y in range(h - 1, -1, -1) if any(ok(x, y) for x in range(w))), h - 1) + 1
    left = next((x for x in range(w) if any(ok(x, y) for y in range(h))), 0)
    right = next((x for x in range(w - 1, -1, -1) if any(ok(x, y) for y in range(h))), w - 1) + 1
    pad = 2
    return im.crop((max(0, left - pad), max(0, top - pad), min(w, right + pad), min(h, bot + pad)))


def main():
    src_path = next((p for p in SRC_CANDIDATES if p.exists()), None)
    if not src_path:
        raise FileNotFoundError('缺少一体顶栏原图 mj-top-header-unified.png')
    out = trim(black_to_alpha(Image.open(src_path)))
    out.save(ASSETS / 'top-header.png', optimize=True)
    if src_path != ASSETS / 'top-header-ai.png':
        ASSETS.joinpath('top-header-ai.png').write_bytes(src_path.read_bytes())
    print('OK', out.size)


if __name__ == '__main__':
    main()
