import json

with open('uuid_batch.json') as f:
    pairs = json.load(f)
with open('native_urls.json') as f:
    entries = json.load(f)
with open('config.f413e.json') as f:
    cfg = json.load(f)

# Find path_idx=207
for i, (p, e) in enumerate(zip(pairs, entries)):
    if p[0] == 207:
        print(f'path_idx=207: pairs[{i}] uuid={e["uuid"]}')
    if 'a9f0710a' in e['uuid']:
        pinfo = cfg['paths'].get(str(p[0]))
        print(f'a9f0710a: pairs[{i}] path_idx={p[0]} path={pinfo} uuid={e["uuid"]}')
    if 'e32de5a8' in e['uuid']:
        pinfo = cfg['paths'].get(str(p[0]))
        print(f'e32de5a8: pairs[{i}] path_idx={p[0]} path={pinfo} uuid={e["uuid"]}')
