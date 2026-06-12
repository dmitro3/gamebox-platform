"""从 AI 生成图切分号码球并导入资源目录（按实际球体边界检测）"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets'
CURSOR_SRC = Path(r'C:\Users\pc\.cursor\projects\c-Users-pc-Desktop-bj\assets')
BALLS_DIR = ROOT / 'assets' / 'balls'
ASSETS = ROOT / 'assets'
OUT_SIZE = 160


def is_content_pixel(r, g, b, a):
    return a > 20 and (r + g + b) > 45


def find_ball_columns(img: Image.Image):
    """扫描整图，按列聚合内容区，再按间隙切成 10 个球"""
    rgba = img.convert('RGBA')
    w, h = rgba.size
    px = rgba.load()

    col_active = []
    for x in range(w):
        active = False
        for y in range(h):
            r, g, b, a = px[x, y]
            if is_content_pixel(r, g, b, a):
                active = True
                break
        col_active.append(active)

    # 合并连续有内容的列
    segments = []
    start = None
    for x, active in enumerate(col_active):
        if active and start is None:
            start = x
        elif not active and start is not None:
            segments.append((start, x))
            start = None
    if start is not None:
        segments.append((start, w))

    # 过滤过窄噪点段，保留主要 10 段
    min_width = max(20, w // 80)
    segments = [(a, b) for a, b in segments if (b - a) >= min_width]

    if len(segments) != 10:
        # 回退：在内容总宽度内均分 10 份
        if segments:
            left = segments[0][0]
            right = segments[-1][1]
        else:
            left, right = 0, w
        span = right - left
        step = span / 10
        segments = [(int(left + i * step), int(left + (i + 1) * step)) for i in range(10)]
        print('fallback equal split', len(segments))

    return segments[:10]


def crop_ball(img: Image.Image, x0: int, x1: int, pad: int = 6) -> Image.Image:
    rgba = img.convert('RGBA')
    w, h = rgba.size
    px = rgba.load()

    min_x, min_y, max_x, max_y = x1, h, x0, 0
    for y in range(h):
        for x in range(max(0, x0), min(w, x1)):
            r, g, b, a = px[x, y]
            if is_content_pixel(r, g, b, a):
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if max_x <= min_x or max_y <= min_y:
        return rgba.crop((x0, 0, x1, h))

    crop = rgba.crop((
        max(0, min_x - pad),
        max(0, min_y - pad),
        min(w, max_x + pad),
        min(h, max_y + pad),
    ))
    return crop


def center_square(img: Image.Image) -> Image.Image:
    """以内容外接框为中心，扩展为正方形画布"""
    rgba = img.convert('RGBA')
    px = rgba.load()
    w, h = rgba.size
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_content_pixel(r, g, b, a):
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    if max_x <= min_x:
        side = max(w, h)
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(rgba, ((side - w) // 2, (side - h) // 2), rgba)
        return canvas

    pad = 4
    cx0 = max(0, min_x - pad)
    cy0 = max(0, min_y - pad)
    cx1 = min(w, max_x + pad)
    cy1 = min(h, max_y + pad)
    core = rgba.crop((cx0, cy0, cx1, cy1))
    cw, ch = core.size
    side = max(cw, ch)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    ox = (side - cw) // 2
    oy = (side - ch) // 2
    canvas.paste(core, (ox, oy), core)
    return canvas


def fit_square(img: Image.Image) -> Image.Image:
    sq = center_square(img)
    canvas = Image.new('RGBA', (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    sq.thumbnail((OUT_SIZE, OUT_SIZE), Image.Resampling.LANCZOS)
    ox = (OUT_SIZE - sq.width) // 2
    oy = (OUT_SIZE - sq.height) // 2
    canvas.paste(sq, (ox, oy), sq)
    return canvas


def resolve_sheet():
    for p in (SRC / 'pk10-balls-sheet.png', CURSOR_SRC / 'pk10-balls-sheet.png'):
        if p.exists():
            return p
    raise FileNotFoundError('pk10-balls-sheet.png not found')


def split_balls_sheet():
    sheet_path = resolve_sheet()
    img = Image.open(sheet_path)
    BALLS_DIR.mkdir(parents=True, exist_ok=True)

    segments = find_ball_columns(img)
    print('segments:', segments)

    for i, (x0, x1) in enumerate(segments):
        crop = crop_ball(img, x0, x1)
        out = fit_square(crop)
        path = BALLS_DIR / f'ball-{i + 1:02d}.png'
        out.save(path, 'PNG')
        print('saved', path.name, f'x={x0}-{x1}', 'crop', crop.size)


def import_stage():
    src = SRC / 'pk10-draw-stage.png'
    if not src.exists():
        src = CURSOR_SRC / 'pk10-draw-stage.png'
    if not src.exists():
        return
    dst = ASSETS / 'draw-result-stage.png'
    Image.open(src).convert('RGB').save(dst, 'PNG', optimize=True)
    print('saved', dst)


if __name__ == '__main__':
    split_balls_sheet()
    import_stage()
