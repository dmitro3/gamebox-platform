import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent / "麻将胡了"


def main() -> None:
    files = sorted(
        [p for p in ROOT.iterdir() if p.is_file() and p.name != "pg-assets-manifest.json"],
        key=lambda p: p.stat().st_size,
        reverse=True,
    )
    total = sum(p.stat().st_size for p in files)

    print(f"目录: {ROOT}")
    print(f"文件数: {len(files) + 1}（含 manifest）")
    print(f"总大小: {total / 1024 / 1024:.2f} MB")
    print()

    print("=== 按前缀分类 ===")
    prefixes = ("native__", "import__", "config__", "images__", "audio__", "json__")
    for pref in prefixes:
        n = len(list(ROOT.glob(pref + "*")))
        print(f"  {pref[:-2]:8s} {n}")

    print("\n=== 最大的 12 个文件 ===")
    for p in files[:12]:
        print(f"  {p.stat().st_size // 1024:4d} KB  {p.name}")

    print("\n=== 音频 (9) ===")
    for p in sorted(ROOT.glob("audio__*")):
        print(f"  {p.name}")

    print("\n=== 配置 ===")
    for p in sorted(ROOT.glob("config__*")):
        print(f"  {p.name} ({p.stat().st_size // 1024} KB)")

    plists: dict[str, list[str]] = {}
    for p in ROOT.glob("import__*.json"):
        text = p.read_text(encoding="utf-8", errors="ignore")
        for m in re.finditer(r'"([a-zA-Z0-9_]+\.plist)"', text):
            plists.setdefault(m.group(1), []).append(p.name)

    print(f"\n=== 图集定义 plist ({len(plists)} 个) ===")
    for name in sorted(plists):
        print(f"  {name}")

    print("\n=== 最大的 10 张 native 图集 ===")
    for p in sorted(ROOT.glob("native__*.png"), key=lambda x: x.stat().st_size, reverse=True)[:10]:
        with Image.open(p) as im:
            w, h = im.size
        print(f"  {w:4d}x{h:<4d}  {p.stat().st_size // 1024:3d}KB  {p.name}")

    cfg = json.loads((ROOT / "config__resources_config.f413e.json").read_text(encoding="utf-8"))
    interesting = []
    for val in cfg.get("paths", {}).values():
        if isinstance(val, list) and val:
            path = val[0]
            if any(
                k in path
                for k in (
                    "symbol",
                    "spin_button",
                    "multiplier",
                    "bonus_loading",
                    "big_win",
                    "free_spins",
                    "total_win",
                    "info_message",
                    "game_icon",
                )
            ):
                interesting.append(path)
    print("\n=== config 里关键资源路径 ===")
    for s in sorted(set(interesting)):
        print(f"  {s}")


if __name__ == "__main__":
    main()
