from PIL import Image
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'assets', 'result')

RULES = {
    'laurel-gold.png': lambda r, g, b: r > 250 and 100 <= g <= 145 and b <= 10,
    'laurel-silver.png': lambda r, g, b: 160 <= r <= 200 and 180 <= g <= 210 and 200 <= b <= 230,
    'laurel-bronze.png': lambda r, g, b: r >= 200 and 75 <= g <= 95 and 10 <= b <= 30,
}

def hrun(im, y, pred):
    w = im.width
    xs = [x for x in range(w) if im.getpixel((x, y))[3] > 200 and pred(*im.getpixel((x, y))[:3])]
    if not xs:
        return None
    segs = []
    s = xs[0]
    p = xs[0]
    for x in xs[1:]:
        if x == p + 1:
            p = x
        else:
            segs.append((s, p))
            s = p = x
    segs.append((s, p))
    seg = max(segs, key=lambda t: t[1] - t[0])
    return seg, seg[1] - seg[0]

for name, pred in RULES.items():
    im = Image.open(os.path.join(BASE, name)).convert('RGBA')
    w, h = im.size
    best = None
    for y in range(int(h * 0.45), int(h * 0.70)):
        got = hrun(im, y, pred)
        if not got:
            continue
        seg, width = got
        if best is None or width > best[0]:
            best = (width, y, seg)
    max_w, mid_y, mid_seg = best
    cx = (mid_seg[0] + mid_seg[1]) / 2
    min_w = max_w * 0.55
    ys = []
    for y in range(h):
        got = hrun(im, y, pred)
        if not got:
            continue
        seg, width = got
        if width >= min_w and abs((seg[0] + seg[1]) / 2 - cx) < w * 0.04:
            ys.append(y)
    y0, y1 = min(ys), max(ys)
    print(f'{name}: center=({cx/w:.4f},{(y0+y1)/2/h:.4f}) disk=({max_w/w:.4f}x{(y1-y0)/h:.4f})')
