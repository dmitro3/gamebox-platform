"""合成麻将胡了竖屏背景 — 全 AI 底图 + 顶部标题烘焙"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
W, H = 1080, 1920

AI_CANDIDATES = [
    Path(r'C:\Users\pc\.cursor\projects\c-Users-pc-Desktop-bj\assets\mj-bg-final-portrait.png'),
    ASSETS / 'room-bg-ai-source.png',
]

ZONE = {
    'banner_y': 46,
    'banner_h': 92,
    'mult_y': 142,
    'mult_h': 96,
    'body_y': 244,
    'ctrl_mask_y': 1210,
}


def load_font(size: int):
    for p in (
        'C:/Windows/Fonts/stxinwei.ttf',
        'C:/Windows/Fonts/msyhbd.ttc',
        'C:/Windows/Fonts/simhei.ttf',
    ):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def find_ai() -> Path:
    for p in AI_CANDIDATES:
        if p.exists():
            return p
    raise FileNotFoundError('缺少 AI 底图 mj-bg-final-portrait.png')


def build_canvas(src: Image.Image) -> Image.Image:
    sw, sh = src.size
    canvas = Image.new('RGB', (W, H), (14, 6, 3))

    # 顶部：红栏 + 金木倍数条 + 部分木纹（约 38% 源图高度）
    head = src.crop((0, 0, sw, int(sh * 0.38)))
    head = head.resize((W, int(H * 0.375)), Image.Resampling.LANCZOS)
    canvas.paste(head, (0, 0))

    # 中段：纯木纹
    mid = src.crop((0, int(sh * 0.28), sw, int(sh * 0.72)))
    mid_h = ZONE['ctrl_mask_y'] - head.size[1]
    if mid_h > 0:
        mid = mid.resize((W, mid_h), Image.Resampling.LANCZOS)
        canvas.paste(mid, (0, head.size[1]))

    # 底部：金币 + 灯（源图最下方）
    foot = src.crop((0, int(sh * 0.72), sw, sh))
    foot_h = H - ZONE['ctrl_mask_y']
    foot = foot.resize((W, foot_h), Image.Resampling.LANCZOS)
    canvas.paste(foot, (0, ZONE['ctrl_mask_y']))

    return canvas


def draw_title(base: Image.Image):
    """1024 标题烘焙，左侧留返回键"""
    y0, bh = ZONE['banner_y'], ZONE['banner_h']
    layer = Image.new('RGBA', (W, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    left, right = 118, 48
    font = load_font(34)
    text = '1024 路中奖组合'
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = left + (W - left - right - tw) // 2
    ty = (bh - th) // 2 - 1

    def coin(cx, cy, r):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(218, 168, 62), outline=(255, 230, 150))
        hr = max(2, r // 4)
        d.rectangle((cx - hr, cy - hr, cx + hr, cy + hr), fill=(130, 88, 30))

    coin(tx - 40, ty + th // 2 + 1, 14)
    coin(tx + tw + 40, ty + th // 2 + 1, 14)

    glow = Image.new('RGBA', (W, bh), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for ox, oy, col, a in [
        (4, 4, (20, 4, 2), 200),
        (2, 2, (80, 35, 8), 170),
        (0, 0, (255, 215, 100), 255),
    ]:
        gd.text((tx + ox, ty + oy), text, fill=(*col, a), font=font)
    glow = glow.filter(ImageFilter.GaussianBlur(0.6))
    layer = Image.alpha_composite(layer, glow)
    d = ImageDraw.Draw(layer)
    d.text((tx, ty - 1), text, fill=(255, 248, 210, 140), font=font)
    base.paste(layer, (0, y0), layer)


def polish(im: Image.Image) -> Image.Image:
    im = ImageEnhance.Contrast(im).enhance(1.06)
    im = ImageEnhance.Color(im).enhance(1.08)
    im = ImageEnhance.Sharpness(im).enhance(1.12)
    return im


def export_css() -> str:
    lines = [':root {']
    for k, v in ZONE.items():
        lines.append(f'  --mj-{k.replace("_", "-")}: {v / H * 100:.3f}%;')
    lines.append('}')
    return '\n'.join(lines)


def main():
    ai = find_ai()
    ASSETS.mkdir(parents=True, exist_ok=True)
    if ai != ASSETS / 'room-bg-ai-source.png':
        (ASSETS / 'room-bg-ai-source.png').write_bytes(ai.read_bytes())

    src = Image.open(ai).convert('RGB')
    canvas = build_canvas(src)
    draw_title(canvas)
    canvas = polish(canvas)

    canvas.save(ASSETS / 'room-bg.png', 'PNG', optimize=True)
    canvas.save(ASSETS / 'room-bg.jpg', 'JPEG', quality=93, optimize=True, progressive=True)
    (ASSETS / 'room-bg-layout.txt').write_text(export_css(), encoding='utf-8')
    print('OK', ASSETS / 'room-bg.jpg', canvas.size)
    print(export_css())


if __name__ == '__main__':
    main()
