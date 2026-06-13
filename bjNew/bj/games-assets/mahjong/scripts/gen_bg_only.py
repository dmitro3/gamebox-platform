"""导出竖屏背景
- AI 横图左右留黑边 → 裁切中心 9:16 → 1080×1920
- 顶栏两块：比 pg-ref 略大、比 pg-v2 略小（CONTENT_RATIO 微调可见区）
- 不做后期 P 字
"""
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
W, H = 1080, 1920

CONTENT_RATIO = 0.54
SAFE_BOTTOM_RATIO = 1.0 - CONTENT_RATIO

AI = ASSETS / 'room-bg-ai-baked.png'
AI_FALLBACK = Path(
    r'C:\Users\pc\.cursor\projects\c-Users-pc-Desktop-bj\assets\mj-bg-plain-crop.png'
)

# 1536×1024 横图：中心竖屏宽 = 1024×9/16 = 576，左右黑边各 480px
PORTRAIT_W_RATIO = 9 / 16  # 相对高度


def _is_black_column(im: Image.Image, x: int, threshold: int = 28) -> bool:
    col = im.crop((x, 0, x + 1, im.size[1]))
    pixels = list(col.getdata())
    return sum(sum(p) for p in pixels) / (len(pixels) * 3) < threshold


def crop_black_sidebars(im: Image.Image) -> Image.Image:
    """去掉左右纯黑边，得到 9:16 竖屏内容区"""
    sw, sh = im.size
    target_w = int(sh * PORTRAIT_W_RATIO)

    left = 0
    for x in range(sw):
        if not _is_black_column(im, x):
            left = x
            break

    right = sw
    for x in range(sw - 1, -1, -1):
        if not _is_black_column(im, x):
            right = x + 1
            break

    cropped_w = right - left
    # 黑边检测失败或裁切比例不对时，按几何中心 9:16 裁切
    if cropped_w < target_w * 0.85 or cropped_w > target_w * 1.15:
        left = max(0, (sw - target_w) // 2)
        right = left + target_w
        print('crop: center math', left, right, 'target_w', target_w)
    else:
        # 居中微调为精确 9:16
        cx = (left + right) // 2
        left = max(0, cx - target_w // 2)
        right = min(sw, left + target_w)
        left = max(0, right - target_w)
        print('crop: black bars', left, right, 'w', right - left)

    return im.crop((left, 0, right, sh))


def main():
    src_path = AI if AI.exists() else AI_FALLBACK
    if not src_path.exists():
        raise FileNotFoundError('缺少 AI 原图 room-bg-ai-baked.png')
    ASSETS.mkdir(parents=True, exist_ok=True)
    if src_path != AI:
        AI.write_bytes(src_path.read_bytes())

    raw = Image.open(src_path).convert('RGB')
    print('source', raw.size)

    src = crop_black_sidebars(raw)
    sw, sh = src.size
    print('portrait crop', src.size, 'ratio', round(sw / sh, 4))

    # 裁切后已是 9:16，直接缩放到 1080×1920（不再拉伸底部安全区，避免模糊）
    if abs(sw / sh - PORTRAIT_W_RATIO) < 0.02:
        canvas = src.resize((W, H), Image.Resampling.LANCZOS)
    else:
        content_h = int(H * CONTENT_RATIO)
        scale = content_h / sh
        nw, nh = int(sw * scale), int(sh * scale)
        scaled = src.resize((nw, nh), Image.Resampling.LANCZOS)
        left = max(0, (nw - W) // 2)
        content = scaled.crop((left, 0, left + W, min(nh, content_h)))
        if content.size[1] < content_h:
            pad = Image.new('RGB', (W, content_h - content.size[1]), (28, 14, 6))
            full = Image.new('RGB', (W, content_h))
            full.paste(content, (0, 0))
            full.paste(pad, (0, content.size[1]))
            content = full
        elif content.size[1] > content_h:
            content = content.crop((0, 0, W, content_h))
        plain_src = src.crop((0, int(sh * 0.88), sw, sh))
        safe_h = H - content_h
        plain = plain_src.resize((W, safe_h), Image.Resampling.LANCZOS)
        canvas = Image.new('RGB', (W, H), (24, 12, 6))
        canvas.paste(content, (0, 0))
        canvas.paste(plain, (0, content_h))

    canvas = ImageEnhance.Contrast(canvas).enhance(1.04)
    canvas = ImageEnhance.Color(canvas).enhance(1.05)
    canvas = ImageEnhance.Sharpness(canvas).enhance(1.06)

    canvas.save(ASSETS / 'room-bg.png', 'PNG', optimize=True)
    canvas.save(ASSETS / 'room-bg.jpg', 'JPEG', quality=94, optimize=True, progressive=True)
    print('OK', ASSETS / 'room-bg.jpg', canvas.size)


if __name__ == '__main__':
    main()
