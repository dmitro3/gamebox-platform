import json
import re
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
FLAT = ROOT / "麻将胡了"
ORG = ROOT / "麻将胡了_已整理"


def load_manifest(path: Path) -> dict | None:
    p = path / "pg-assets-manifest.json"
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def flat_files(path: Path) -> dict[str, int]:
    return {f.name: f.stat().st_size for f in path.iterdir() if f.is_file()}


def org_files(path: Path) -> dict[str, int]:
    out = {}
    for f in path.rglob("*"):
        if f.is_file() and f.name != "organize-report.json":
            out[f.relative_to(path).as_posix()] = f.stat().st_size
    return out


def url_to_flat_name(url: str) -> str:
    parts = url.split("/")
    if len(parts) >= 2:
        return "__".join(parts[-2:])
    return parts[-1]


def main() -> None:
    flat_m = load_manifest(FLAT)
    org_m = load_manifest(ORG)

    print("=" * 60)
    print("麻将胡了 资源对比报告")
    print("=" * 60)

    # Summary table
    rows = []
    for label, m, folder in [
        ("新下载(扁平)", flat_m, FLAT),
        ("上次整理", org_m, ORG),
    ]:
        if not m:
            rows.append((label, "-", "-", "-"))
            continue
        ok = sum(1 for i in m["items"] if i.get("ok"))
        fail = sum(1 for i in m["items"] if not i.get("ok"))
        cats = Counter(i.get("category") for i in m["items"])
        rows.append(
            (
                label,
                m.get("collectedAt", "?")[:19],
                str(m["summary"].get("http", "?")),
                f"native={cats.get('native',0)} import={cats.get('import',0)} png={len(list(folder.glob('**/*.png')))}",
            )
        )

    print("\n【概览】")
    for r in rows:
        print(f"  {r[0]:12s}  时间={r[1]}  HTTP={r[2]}  {r[3]}")

    if flat_m and org_m:
        flat_urls = {i["url"]: i for i in flat_m["items"]}
        org_urls = {i["url"]: i for i in org_m["items"]}
        added = set(flat_urls) - set(org_urls)
        removed = set(org_urls) - set(flat_urls)
        same = set(flat_urls) & set(org_urls)

        print(f"\n【URL 对比】")
        print(f"  相同: {len(same)}")
        print(f"  新增: {len(added)}")
        print(f"  旧有但这次没有: {len(removed)}")
        print(f"  净增: {len(added) - len(removed)}")

        fails = [i for i in flat_m["items"] if not i.get("ok")]
        if fails:
            print(f"\n【本次下载失败 ({len(fails)})】")
            for i in fails:
                print(f"  - {i.get('filename') or i['url']}: {i.get('error')}")

        print(f"\n【新增资源详情】")
        by_cat = Counter(flat_urls[u].get("category") for u in added)
        print(f"  分类: {dict(by_cat)}")
        for u in sorted(added):
            item = flat_urls[u]
            cat = item.get("category", "?")
            name = u.split("/")[-2] + "/" + u.split("/")[-1]
            print(f"  + [{cat}] {name}")

        print(f"\n【旧有但本次缺失（可能没触发加载或下载失败）】")
        by_cat_rm = Counter(org_urls[u].get("category") for u in removed)
        print(f"  分类: {dict(by_cat_rm)}")
        important = []
        for u in sorted(removed):
            item = org_urls[u]
            name = u.split("/")[-2] + "/" + u.split("/")[-1]
            line = f"  - [{item.get('category')}] {name}"
            if any(k in u for k in ("025c23820", "02ba035c3", "014aab3a8", "01beca5b1", "09dcf71b3", "0d5178806")):
                important.append(line)
            print(line)
        if important:
            print("\n  ⚠ 含关键 plist/import，需确认扁平目录里是否仍有对应文件")

    # Plist inventory flat
    plists: dict[str, list[str]] = {}
    for p in FLAT.glob("import__*.json"):
        text = p.read_text(encoding="utf-8", errors="ignore")
        for m in re.finditer(r'"([a-zA-Z0-9_]+\.plist)"', text):
            plists.setdefault(m.group(1), []).append(p.name)

    print(f"\n【新包 plist 图集 ({len(plists)})】")
    for name in sorted(plists):
        print(f"  {name}")

    # New native PNGs not in old organized
    old_native_names = {f.name for f in ORG.rglob("native/*/*")} if ORG.exists() else set()
    new_native = []
    for p in FLAT.glob("native__*.png"):
        # organized name: native/38/uuid.hash.png -> native__38_uuid.hash.png
        equiv = p.name
        if equiv not in {f"native__{Path(rel).parts[0]}_{Path(rel).parts[1]}" for rel in [str(x.relative_to(ORG)).replace("/", "__").replace("native__", "native/") for x in ORG.rglob("native/*/*.png")]}:
            pass
        # simpler: compare by uuid part
        uuid_part = "_".join(p.name.split("_")[2:]) if p.name.startswith("native__") else p.name
        old_uuids = set()
        for op in ORG.rglob("native/*/*.png"):
            old_uuids.add(op.name)
        old_flat_equiv = {f"native__{op.parent.name}_{op.name}".replace("/", "_") for op in ORG.rglob("native/*/*.png")}
        # fix: native/38/foo.png -> native__38_foo.png
        old_flat = set()
        for op in ORG.rglob("native/*/*.png"):
            old_flat.add(f"native__{op.parts[-2]}_{op.parts[-1]}")
        if p.name not in old_flat:
            with Image.open(p) as im:
                new_native.append((p.name, im.size, p.stat().st_size // 1024))

    if new_native:
        print(f"\n【新增 native PNG ({len(new_native)})】")
        for name, size, kb in sorted(new_native, key=lambda x: -x[2]):
            print(f"  {size[0]}x{size[1]:<5} {kb:3d}KB  {name[:55]}")

    print("\n【结论】")
    if flat_m and org_m:
        http_new = flat_m["summary"]["http"]
        http_old = org_m["summary"]["http"]
        diff = http_new - http_old
        if diff <= 10:
            print(f"  本次仅比上次多 {diff} 个 HTTP 资源，仍主要是「进门包」级别。")
            print("  虽有 30 个新 URL，但也有 23 个旧 URL 未再加载（会话差异）。")
            print("  按钮/倍数条等 UI 大概率仍未采全，需边玩边录并确认 [PG+] 数字持续增长。")
        else:
            print(f"  本次多 {diff} 个资源，有明显进展。")


if __name__ == "__main__":
    main()
