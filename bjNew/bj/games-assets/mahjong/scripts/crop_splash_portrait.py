"""从带宽黑边的横图裁切出 9:16 竖屏启动页。"""
from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parents[1] / "assets"
SRC = ASSETS / "splash-source.png"
OUT = ASSETS / "splash.png"
TARGET = (1080, 1920)


def crop_portrait(src: Path, out: Path, target: tuple[int, int] = TARGET) -> None:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    crop_w = min(w, int(h * 9 / 16))
    left = (w - crop_w) // 2
    cropped = im.crop((left, 0, left + crop_w, h))
    final = cropped.resize(target, Image.Resampling.LANCZOS)
    final.save(out, quality=95)
    print(f"{src.name} {w}x{h} -> crop {cropped.size} -> {out.name} {final.size}")


if __name__ == "__main__":
    crop_portrait(SRC, OUT)
