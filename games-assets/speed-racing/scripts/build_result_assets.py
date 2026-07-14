"""开奖公布 v15：正面冠军车 + 侧面亚季军车（双母版换色 + 车牌号 + 边缘平滑）"""
from __future__ import annotations

import colorsys
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'result'
AI = ROOT / 'ai-sources'
CURSOR = Path(r'C:\Users\pc\.cursor\projects\c-Users-pc-Desktop-gamebox-platform\assets')

from car_colors import CAR_COLORS

V14_SOURCES = {
    'jsr-car-front-v14': 'race-car-front',
    'jsr-car-angle-v11': 'race-car-side',
}

PLATE = {
    'race-car-front': (0.4972, 0.762, 0.0),
    'race-car-side': (0.1631, 0.798, 0.0),
}

PLATE_RECT = {
    'race-car-front': (0.275, 0.0923),
    'race-car-side': (0.1381, 0.1023),
}


def save_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'PNG', optimize=True)
    print('saved', path.name, im.size)


def is_bg(r: int, g: int, b: int, t: int = 22) -> bool:
    return r <= t and g <= t and b <= t


def key_flood(im: Image.Image, threshold: int = 22) -> Image.Image:
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    bg = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h or bg[y][x]:
            return
        r, g, b, _ = px[x, y]
        if is_bg(r, g, b, threshold):
            bg[y][x] = True
            q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)
    while q:
        x, y = q.popleft()
        push(x - 1, y)
        push(x + 1, y)
        push(x, y - 1)
        push(x, y + 1)
    for y in range(h):
        for x in range(w):
            if bg[y][x]:
                px[x, y] = (0, 0, 0, 0)
    return im


def trim_alpha(im: Image.Image, pad: int = 6) -> Image.Image:
    im = im.convert('RGBA')
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def fit_width(im: Image.Image, max_w: int) -> Image.Image:
    if im.width <= max_w:
        return im
    ratio = max_w / im.width
    return im.resize((max_w, max(1, int(im.height * ratio))), Image.Resampling.LANCZOS)


def is_body_paint(r: int, g: int, b: int) -> bool:
    if r > 230 and g > 230 and b > 230:
        return False
    if r < 35 and g < 35 and b < 35:
        return False
    h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
    if v < 0.14 or v > 0.9:
        return False
    if s < 0.42 and v > 0.22:
        return True
    return r > 95 and r >= g - 10 and g >= b - 5 and r > b + 20


def smooth_alpha(im: Image.Image, radius: float = 0.85) -> Image.Image:
    im = im.convert('RGBA')
    r, g, b, a = im.split()
    a = a.filter(ImageFilter.GaussianBlur(radius))
    return Image.merge('RGBA', (r, g, b, a))


def _plate_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        Path(r'C:\Windows\Fonts\arialbd.ttf'),
        Path(r'C:\Windows\Fonts\ariblk.ttf'),
        Path(r'C:\Windows\Fonts\impact.ttf'),
        Path('arialbd.ttf'),
        Path('Arial Bold.ttf'),
    )
    for fp in candidates:
        try:
            return ImageFont.truetype(str(fp), size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def _plate_font_size(w: int, h: int, prefix: str) -> int:
    pw_r, ph_r = PLATE_RECT[prefix]
    pw, ph = int(w * pw_r), int(h * ph_r)
    return max(16, int(min(pw * 0.52, ph * 0.92)))


def is_plate_pixel(r: int, g: int, b: int, a: int) -> bool:
    if a < 20:
        return False
    h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
    return v > 0.68 and s < 0.22 and r > 150 and g > 150


def build_plate_mask(master: Image.Image, prefix: str) -> Image.Image:
    """从母版原牌照区域 flood fill 得到 mask，不另画白块。"""
    im = master.convert('RGBA')
    w, h = im.size
    px = im.load()
    cx_r, cy_r, _ = PLATE[prefix]
    pw_r, ph_r = PLATE_RECT[prefix]
    cx, cy = int(w * cx_r), int(h * cy_r)
    pw, ph = int(w * pw_r), int(h * ph_r)
    x0, y0 = max(0, cx - pw // 2), max(0, cy - ph // 2)
    x1, y1 = min(w, cx + pw // 2), min(h, cy + ph // 2)

    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    seed = None
    for y in range(y0, y1):
        for x in range(x0, x1):
            if is_plate_pixel(*px[x, y]):
                seed = (x, y)
                break
        if seed:
            break
    if not seed:
        raise RuntimeError(f'plate seed not found: {prefix}')

    q.append(seed)
    while q:
        x, y = q.popleft()
        if seen[y][x]:
            continue
        if x < x0 or x >= x1 or y < y0 or y >= y1:
            continue
        seen[y][x] = True
        r, g, b, a = px[x, y]
        if not is_plate_pixel(r, g, b, a):
            continue
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if x0 <= nx < x1 and y0 <= ny < y1 and not seen[ny][nx]:
                q.append((nx, ny))

    mask = Image.new('L', (w, h), 0)
    mpx = mask.load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            if seen[y][x] and is_plate_pixel(*px[x, y]):
                mpx[x, y] = 255
    return mask


def whiten_plate(im: Image.Image, mask: Image.Image) -> Image.Image:
    out = im.copy().convert('RGBA')
    px = out.load()
    mpx = mask.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            if mpx[x, y] > 128:
                r, g, b, a = px[x, y]
                px[x, y] = (255, 255, 255, a)
    return out


def stamp_plate_number(im: Image.Image, n: int, prefix: str) -> Image.Image:
    cx_r, cy_r, _ = PLATE[prefix]
    out = im.copy().convert('RGBA')
    w, h = out.size
    cx, cy = int(w * cx_r), int(h * cy_r)
    sz = _plate_font_size(w, h, prefix)
    font = _plate_font(sz)
    text = str(n)
    draw = ImageDraw.Draw(out)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = cx - tw // 2 - bbox[0], cy - th // 2 - bbox[1]
    draw.text((tx, ty), text, fill=(0, 0, 0, 255), font=font)
    return out


def recolor_car_glossy(
    src: Image.Image,
    target: tuple[int, int, int],
    plate_mask: Image.Image | None = None,
) -> Image.Image:
    im = src.copy()
    px = im.load()
    w, h = im.size
    tr, tg, tb = [c / 255.0 for c in target]
    th, ts, tv = colorsys.rgb_to_hsv(tr, tg, tb)
    gray = ts < 0.12

    mpx = plate_mask.load() if plate_mask else None

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 24 or (mpx and mpx[x, y] > 128):
                continue
            if not is_body_paint(r, g, b):
                continue
            h0, s0, v0 = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            if gray:
                lum = 0.299 * tr + 0.587 * tg + 0.114 * tb
                v1 = max(0.08, min(1.0, v0 * (lum / max(0.01, tv))))
                nr = ng = nb = int(v1 * 255)
            else:
                sat_mix = 0.94
                s_out = max(0.42, min(1.0, s0 * (1 - sat_mix) + ts * sat_mix))
                nr, ng, nb = colorsys.hsv_to_rgb(th, s_out, v0)
                nr, ng, nb = int(nr * 255), int(ng * 255), int(nb * 255)
            px[x, y] = (nr, ng, nb, a)

    return ImageEnhance.Contrast(im).enhance(1.03)


def stage_sources() -> bool:
    AI.mkdir(parents=True, exist_ok=True)
    ok = True
    for src_name, dst_name in V14_SOURCES.items():
        src = CURSOR / f'{src_name}.png'
        if not src.exists():
            ok = False
            continue
        save_png(Image.open(src), AI / f'{dst_name}.png')
    return ok


def build_set(master: Image.Image, prefix: str, max_w: int, stamp_plate: bool = True) -> None:
    m = smooth_alpha(fit_width(trim_alpha(key_flood(master)), max_w))
    save_png(m, ROOT / f'{prefix}-master.png')
    plate_mask = build_plate_mask(m, prefix)
    for n, rgb in CAR_COLORS.items():
        car = smooth_alpha(recolor_car_glossy(m, rgb, plate_mask))
        car = whiten_plate(car, plate_mask)
        if stamp_plate:
            car = stamp_plate_number(car, n, prefix)
        save_png(car, ROOT / f'{prefix}-{n:02d}.png')


def main() -> None:
    if not stage_sources():
        print('skip staging — using existing ai-sources')
    build_set(Image.open(AI / 'race-car-front.png'), 'race-car-front', 360, True)
    build_set(Image.open(AI / 'race-car-side.png'), 'race-car-side', 420, False)


if __name__ == '__main__':
    main()
