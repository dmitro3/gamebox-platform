# -*- coding: utf-8 -*-
import re
from pathlib import Path

s = Path("scripts/yoplay-benz/gamejs/benz2221.min.js").read_text(encoding="utf-8", errors="ignore")
print("len", len(s))
paths = sorted(set(re.findall(r"resource/Benz/[A-Za-z0-9_./-]+", s)))
print("Benz paths", len(paths))
for x in paths:
    print(x)

for pat in [
    r"benz\.thm\.[a-f0-9]+\.json",
    r"benz\.res\.[a-f0-9]+\.json",
    r"pc_benz\.thm\.[a-f0-9]+\.json",
    r"themeUrl[^,]{0,80}",
]:
    ms = re.findall(pat, s)
    print(pat, "->", len(ms), ms[:10])

# mobile skin size hints near GamePageSkin
for m in re.finditer(r"GamePageSkin.{0,200}", s):
    print("GamePageSkin ctx", m.group(0)[:200])
    break

# widths in exml-like strings for non-pc
ws = re.findall(r'width=\\?"(\d+)\\?"[^>]{0,40}height=\\?"(\d+)\\?"', s)
from collections import Counter
print("wh pairs top", Counter(ws).most_common(20))
