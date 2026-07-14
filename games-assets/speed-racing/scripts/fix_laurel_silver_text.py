"""Build laurel-silver.png from keyed gold template + recolor + 亚军."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from key_laurel_assets import defringe, load_source, process, trim

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'result' / 'laurel-silver.png'
FONTS = (
    Path(r'C:\Windows\Fonts\msyhbd.ttc'),
    Path(r'C:\Windows\Fonts\simhei.ttf'),
)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for fp in FONTS:
        if fp.exists():
            return ImageFont.truetype(str(fp), size=size)
    return ImageFont.load_default()


def recolor_gold_to_silver(im: Image.Image) -> Image.Image:
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16:
                continue
            if b > r + 35 and r < 170:
                px[x, y] = (min(255, r + 10), min(255, g + 5), min(255, b + 15), a)
                continue
            if r > 220 and g > 100 and b < 80:
                px[x, y] = (min(255, 175 + (r - 220) // 4), min(255, 188 + (g - 100) // 5), min(255, 210 + b // 3), a)
                continue
            nr = int(min(255, 118 + (r + g + b) / 7))
            ng = int(min(255, 126 + (r + g + b) / 7))
            nb = int(min(255, 142 + (r + g + b) / 6))
            px[x, y] = (nr, ng, nb, a)
    return im


def clear_title(im: Image.Image) -> None:
    w, h = im.size
    px = im.load()
    for y in range(int(h * 0.20)):
        for x in range(int(w * 0.12), int(w * 0.88)):
            px[x, y] = (0, 0, 0, 0)


def draw_title(im: Image.Image) -> Image.Image:
    w, h = im.size
    draw = ImageDraw.Draw(im)
    font = load_font(max(52, int(w * 0.108)))
    text = '亚军'
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (w - tw) / 2 - bbox[0]
    y = h * 0.018 - bbox[1]
    draw.text(
        (x, y), text, font=font,
        fill=(236, 244, 252, 255),
        stroke_width=max(3, int(w * 0.006)),
        stroke_fill=(88, 98, 112, 255),
    )
    return im


def main() -> None:
    im = recolor_gold_to_silver(process(load_source('laurel-gold.png')))
    clear_title(im)
    im = draw_title(im)
    out = trim(defringe(im))
    out.save(OUT, 'PNG', optimize=True)
    print('saved', OUT, out.size)


if __name__ == '__main__':
    main()
