"""去除 AI 桂冠 PNG 棋盘格/白底，去毛边，裁剪。"""

from __future__ import annotations



from collections import deque

from pathlib import Path



from PIL import Image



ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'result'

AI_ROOT = Path(r'C:\Users\pc\.cursor\projects\c-Users-pc-Desktop-gamebox-platform\assets')

NAMES = ('laurel-gold.png', 'laurel-silver.png', 'laurel-bronze.png')

AI_NAMES = {

    'laurel-gold.png': 'laurel-gold-ai.png',

    'laurel-silver.png': 'laurel-silver-ai.png',

    'laurel-bronze.png': 'laurel-bronze-ai.png',

}





def is_checker(r: int, g: int, b: int, a: int = 255) -> bool:

    if a < 16:

        return True

    if r > 246 and g > 246 and b > 246:

        return True

    if abs(r - g) <= 10 and abs(g - b) <= 10:

        if r >= 175:

            return True

        if r <= 36:

            return True

    return False





def key_flood(im: Image.Image) -> Image.Image:

    im = im.convert('RGBA')

    w, h = im.size

    px = im.load()

    bg = [[False] * w for _ in range(h)]

    q: deque[tuple[int, int]] = deque()



    def push(x: int, y: int) -> None:

        if x < 0 or y < 0 or x >= w or y >= h or bg[y][x]:

            return

        r, g, b, a = px[x, y]

        if is_checker(r, g, b, a):

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





def remove_checker_islands(im: Image.Image) -> Image.Image:

    """Remove checkerboard pixels enclosed inside badge strokes."""

    im = im.convert('RGBA')

    w, h = im.size

    px = im.load()

    seen = [[False] * w for _ in range(h)]



    for sy in range(h):

        for sx in range(w):

            if seen[sy][sx]:

                continue

            r, g, b, a = px[sx, sy]

            if a < 16 or not is_checker(r, g, b, a):

                continue

            comp: list[tuple[int, int]] = []

            q: deque[tuple[int, int]] = deque([(sx, sy)])

            seen[sy][sx] = True

            touches_void = False

            while q:

                x, y = q.popleft()

                comp.append((x, y))

                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):

                    nx, ny = x + dx, y + dy

                    if nx < 0 or ny < 0 or nx >= w or ny >= h:

                        touches_void = True

                        continue

                    nr, ng, nb, na = px[nx, ny]

                    if na < 16:

                        touches_void = True

                        continue

                    if seen[ny][nx]:

                        continue

                    if is_checker(nr, ng, nb, na):

                        seen[ny][nx] = True

                        q.append((nx, ny))

            if touches_void:

                continue

            for x, y in comp:

                px[x, y] = (0, 0, 0, 0)

    return im





def remove_dark_specks(im: Image.Image) -> Image.Image:

    im = im.convert('RGBA')

    w, h = im.size

    px = im.load()

    seen = [[False] * w for _ in range(h)]



    for sy in range(h):

        for sx in range(w):

            if seen[sy][sx]:

                continue

            r, g, b, a = px[sx, sy]

            if a < 16 or r > 55 or g > 55 or b > 55:

                continue

            comp: list[tuple[int, int]] = []

            q: deque[tuple[int, int]] = deque([(sx, sy)])

            seen[sy][sx] = True

            touches_void = False

            while q:

                x, y = q.popleft()

                comp.append((x, y))

                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):

                    nx, ny = x + dx, y + dy

                    if nx < 0 or ny < 0 or nx >= w or ny >= h:

                        touches_void = True

                        continue

                    nr, ng, nb, na = px[nx, ny]

                    if na < 16:

                        touches_void = True

                        continue

                    if nr > 55 or ng > 55 or nb > 55:

                        continue

                    if seen[ny][nx]:

                        continue

                    seen[ny][nx] = True

                    q.append((nx, ny))

            if touches_void or len(comp) > 400:

                continue

            for x, y in comp:

                px[x, y] = (0, 0, 0, 0)

    return im





def remove_dark_fringe(im: Image.Image, passes: int = 3) -> Image.Image:

    """Remove dark / semi-transparent halos touching transparency."""

    im = im.convert('RGBA')

    w, h = im.size

    px = im.load()

    for _ in range(passes):

        kill: list[tuple[int, int]] = []

        for y in range(h):

            for x in range(w):

                r, g, b, a = px[x, y]

                if a < 16:

                    continue

                dark = r < 72 and g < 72 and b < 72

                weak = a < 140 and (r + g + b) < 180

                if not dark and not weak:

                    continue

                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):

                    nx, ny = x + dx, y + dy

                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] < 16:

                        kill.append((x, y))

                        break

        for x, y in kill:

            px[x, y] = (0, 0, 0, 0)

    return im





def defringe(im: Image.Image, passes: int = 5) -> Image.Image:

    im = im.convert('RGBA')

    w, h = im.size

    px = im.load()

    for _ in range(passes):

        kill: list[tuple[int, int]] = []

        for y in range(h):

            for x in range(w):

                r, g, b, a = px[x, y]

                if a < 16:

                    continue

                neutral = abs(r - g) <= 14 and abs(g - b) <= 14

                light = neutral and 168 <= r <= 252

                if not light:

                    continue

                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):

                    nx, ny = x + dx, y + dy

                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] < 16:

                        kill.append((x, y))

                        break

        for x, y in kill:

            px[x, y] = (0, 0, 0, 0)

    return im





def trim(im: Image.Image, pad: int = 4) -> Image.Image:

    bbox = im.getbbox()

    if not bbox:

        return im

    x0, y0, x1, y1 = bbox

    x0 = max(0, x0 - pad)

    y0 = max(0, y0 - pad)

    x1 = min(im.width, x1 + pad)

    y1 = min(im.height, y1 + pad)

    return im.crop((x0, y0, x1, y1))





def load_source(name: str) -> Image.Image:

    ai = AI_ROOT / AI_NAMES[name]

    path = ROOT / name

    return Image.open(ai if ai.exists() else path)





def key_only(im: Image.Image) -> Image.Image:

    im = key_flood(im)

    im = remove_checker_islands(im)

    im = remove_dark_specks(im)

    im = remove_dark_fringe(im)

    return defringe(im)





def process(im: Image.Image) -> Image.Image:

    return trim(key_only(im))





def align_pair(a: Image.Image, b: Image.Image) -> tuple[Image.Image, Image.Image]:

    """Resize two keyed images to the same canvas for pixel repair."""

    a = a.convert('RGBA')

    b = b.convert('RGBA')

    w = max(a.width, b.width)

    h = max(a.height, b.height)

    out_a = Image.new('RGBA', (w, h), (0, 0, 0, 0))

    out_b = Image.new('RGBA', (w, h), (0, 0, 0, 0))

    out_a.paste(a, ((w - a.width) // 2, (h - a.height) // 2))

    out_b.paste(b, ((w - b.width) // 2, (h - b.height) // 2))

    return out_a, out_b





def remove_top_connected_title(

    im: Image.Image,

    y_seed_ratio: float = 0.06,

    y_max_ratio: float = 0.208,

) -> Image.Image:

    """Remove title text connected to the top edge within a y band."""

    im = im.convert('RGBA')

    w, h = im.size

    px = im.load()

    y_seed = int(h * y_seed_ratio)

    y_max = int(h * y_max_ratio)

    seen = [[False] * w for _ in range(h)]

    q: deque[tuple[int, int]] = deque()

    for y in range(y_seed):

        for x in range(w):

            if px[x, y][3] >= 16 and not seen[y][x]:

                seen[y][x] = True

                q.append((x, y))

    while q:

        x, y = q.popleft()

        px[x, y] = (0, 0, 0, 0)

        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):

            nx, ny = x + dx, y + dy

            if nx < 0 or ny < 0 or nx >= w or ny >= h or ny >= y_max or seen[ny][nx]:

                continue

            if px[nx, ny][3] < 16:

                continue

            seen[ny][nx] = True

            q.append((nx, ny))

    return im





def main() -> None:

    for name in NAMES:

        if name == 'laurel-silver.png':

            continue

        out = process(load_source(name))

        out.save(ROOT / name, 'PNG', optimize=True)

        print('fixed', name, out.size)





if __name__ == '__main__':

    main()

