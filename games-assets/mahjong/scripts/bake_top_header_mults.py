"""检测顶栏四格凹槽内框（四根线），在中心烘焙 x1/x2/x3/x5。"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
SRC = ASSETS / 'top-header-base.png'
OUT = ASSETS / 'top-header.png'
SLOTS_JSON = ASSETS / 'top-header-slots.json'
DEBUG_OUT = ASSETS / 'top-header-slots-debug.png'

LABELS = ['x1', 'x2', 'x3', 'x5']


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for p in (
        'C:/Windows/Fonts/arialbd.ttf',
        'C:/Windows/Fonts/msyhbd.ttc',
        'C:/Windows/Fonts/simhei.ttf',
    ):
        try:
            return ImageFont.truetype(p, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def _peaks_1d(values: np.ndarray, min_ratio: float = 1.5) -> list[tuple[int, float]]:
    if len(values) < 5:
        return []
    mean = float(values.mean())
    out: list[tuple[int, float]] = []
    for i in range(2, len(values) - 2):
        v = float(values[i])
        if v > values[i - 1] and v > values[i + 1] and v > mean * min_ratio:
            out.append((i, v))
    return out


def detect_slot_rects(im: Image.Image) -> list[dict]:
    """从底图检测四格凹槽内框：left/top/right/bottom（像素）。"""
    w, h = im.size
    gray = np.array(im.convert('RGB'), dtype=np.float32).mean(axis=2)

    y0, y1 = int(h * 0.58), int(h * 0.88)
    x_scan_lo, x_scan_hi = int(w * 0.04), int(w * 0.96)
    panel = gray[y0:y1, x_scan_lo:x_scan_hi]
    gx = np.abs(np.diff(panel, axis=1))
    col_edge = gx.sum(axis=0)

    peaks = _peaks_1d(col_edge, min_ratio=1.8)
    peaks = [(x_scan_lo + i, v) for i, v in peaks]
    if not peaks:
        raise RuntimeError('未检测到凹槽竖边')

    max_v = max(v for _, v in peaks)
    strong = sorted([p for p in peaks if p[1] >= max_v * 0.55], key=lambda t: t[0])

    # 合并过近的峰（同一条棱边）
    merged: list[tuple[int, float]] = []
    for x, v in strong:
        if merged and x - merged[-1][0] < 28:
            if v > merged[-1][1]:
                merged[-1] = (x, v)
        else:
            merged.append((x, v))

    if len(merged) < 8:
        raise RuntimeError(f'竖边数量不足: {len(merged)}')

    # 取最外侧左棱 + 中间 6 条分隔棱 + 最外侧右棱 → 四格
    outer_left = merged[0][0]
    outer_right = merged[-1][0]
    inner = merged[1:-1]
    if len(inner) < 6:
        inner = merged[1:]
    dividers = inner[:6]
    pairs = [
        (outer_left, dividers[1][0]),
        (dividers[1][0], dividers[3][0]),
        (dividers[3][0], dividers[5][0]),
        (dividers[5][0], outer_right),
    ]

    inset_x = max(14, round(w * 0.012))
    inset_y_top = max(10, round(h * 0.022))
    inset_y_bot = max(8, round(h * 0.018))

    slots: list[dict] = []
    for label, (x_lo, x_hi) in zip(LABELS, pairs):
        l = x_lo + inset_x
        r = x_hi - inset_x
        cx = (l + r) // 2

        col = gray[:, cx]
        gy = np.abs(np.diff(col))
        y_scan_lo, y_scan_hi = int(h * 0.45), int(h * 0.94)
        seg = gy[y_scan_lo:y_scan_hi]
        h_peaks = _peaks_1d(seg, min_ratio=1.4)
        h_peaks = [(y_scan_lo + i, v) for i, v in h_peaks]

        strong_h = [p for p in h_peaks if p[1] >= max(v for _, v in h_peaks) * 0.45]
        top_edges = [y for y, _ in strong_h if int(h * 0.50) < y < int(h * 0.62)]
        bot_edges = [y for y, _ in strong_h if int(h * 0.78) < y < int(h * 0.92)]

        t = (top_edges[0] + inset_y_top) if top_edges else y0 + inset_y_top
        b = (bot_edges[-1] - inset_y_bot) if bot_edges else y1 - inset_y_bot
        if b <= t:
            t, b = y0 + inset_y_top, y1 - inset_y_bot

        cy = (t + b) / 2
        slots.append({
            'label': label,
            'left': int(l),
            'top': int(t),
            'right': int(r),
            'bottom': int(b),
            'cx': int(cx),
            'cy': int(round(cy)),
            'norm': {
                'left': round(l / w, 6),
                'top': round(t / h, 6),
                'right': round(r / w, 6),
                'bottom': round(b / h, 6),
                'width': round((r - l) / w, 6),
                'height': round((b - t) / h, 6),
                'cx': round(cx / w, 6),
                'cy': round(cy / h, 6),
            },
        })

    return slots


def draw_debossed_label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font) -> None:
    x, y = xy
    draw.text((x + 2, y + 2), text, font=font, fill=(18, 10, 4, 210), anchor='mm')
    draw.text((x - 1, y - 1), text, font=font, fill=(120, 82, 38, 170), anchor='mm')
    draw.text((x, y), text, font=font, fill=(62, 38, 18, 255), anchor='mm')


def save_debug(im: Image.Image, slots: list[dict], path: Path) -> None:
    dbg = im.copy().convert('RGBA')
    draw = ImageDraw.Draw(dbg)
    for slot in slots:
        l, t, r, b = slot['left'], slot['top'], slot['right'], slot['bottom']
        draw.rectangle([l, t, r, b], outline=(255, 60, 60, 220), width=2)
        draw.line([l, slot['cy'], r, slot['cy']], fill=(60, 200, 255, 180), width=1)
        draw.line([slot['cx'], t, slot['cx'], b], fill=(60, 200, 255, 180), width=1)
        draw.ellipse([slot['cx'] - 3, slot['cy'] - 3, slot['cx'] + 3, slot['cy'] + 3], fill=(255, 220, 0, 255))
    dbg.save(path, optimize=True)


def main() -> None:
    src = SRC if SRC.exists() else OUT
    if not src.exists():
        raise SystemExit(f'缺少底图: {src}')

    im = Image.open(src).convert('RGBA')
    w, h = im.size
    slots = detect_slot_rects(im)

    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for slot in slots:
        box_w = slot['right'] - slot['left']
        box_h = slot['bottom'] - slot['top']
        font_size = max(22, min(round(box_w * 0.38), round(box_h * 0.42)))
        font = load_font(font_size)
        draw_debossed_label(draw, (slot['cx'], slot['cy']), slot['label'], font)

    out = Image.alpha_composite(im, layer)
    if not SRC.exists():
        im.save(SRC, optimize=True)
    out.save(OUT, optimize=True)
    save_debug(im, slots, DEBUG_OUT)

    payload = {'size': [w, h], 'slots': slots}
    SLOTS_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding='utf-8')

    print('OK', OUT, (w, h))
    for slot in slots:
        n = slot['norm']
        print(
            f"  {slot['label']}: LTRB=({slot['left']},{slot['top']},{slot['right']},{slot['bottom']}) "
            f"center=({slot['cx']},{slot['cy']}) norm=({n['cx']},{n['cy']})"
        )
    print('slots json:', SLOTS_JSON)
    print('debug:', DEBUG_OUT)


if __name__ == '__main__':
    main()
