import json

with open('scripts/pg-cocos-dump.json', 'r', encoding='utf-8') as f:
    raw = f.read()

# Search for info2 in raw text
import re

# Find all occurrences of "info2" in context
matches = [(m.start(), m.group()) for m in re.finditer(r'info2\w*', raw)]
print(f"Found {len(matches)} 'info2*' occurrences")

# Print context around first 20 matches
for pos, match in matches[:30]:
    ctx = raw[max(0,pos-50):pos+100]
    ctx = ctx.replace('\n', ' ')
    print(f"  [{match}]: ...{ctx}...")
