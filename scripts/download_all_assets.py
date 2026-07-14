#!/usr/bin/env python3
"""
下载 PG Soft Mahjong Ways 全部 native 图片资源
- 对已知扩展名 URL 直接下载
- 未知的依次尝试 .png / .jpg / .mp3
"""
import json, os, re, time
import urllib.request, urllib.error

OUT_DIR = 'pg_assets'
DELAY   = 0.20
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125',
    'Referer':    'https://www.pgf-nvgais.com/',
    'Accept':     'image/avif,image/webp,image/apng,*/*;q=0.9',
}

# ── 读取 config 获取路径映射 ──────────────────────────────────────────────────
with open('config.f413e.json', encoding='utf-8') as f:
    cfg = json.load(f)
paths_dict = cfg['paths']   # {str_idx: [logical_path, type_id]}

# ── 读取 uuid_batch (path_index 映射) ─────────────────────────────────────────
with open('uuid_batch.json') as f:
    pairs = json.load(f)   # [[path_index, compact_uuid, native_hash], ...]

# ── 读取已知扩展名 ─────────────────────────────────────────────────────────────
with open('uuid_ext.json') as f:
    uuid_to_ext = json.load(f)   # {uuid_str: '.png'|'.jpg'|'.mp3'}

# ── 读取 native_urls.json ─────────────────────────────────────────────────────
with open('native_urls.json') as f:
    native_urls = json.load(f)   # [{uuid, hash, url_base}, ...]

assert len(pairs) == len(native_urls), "pairs / native_urls 长度不一致"

os.makedirs(OUT_DIR, exist_ok=True)

def fetch(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if e.code in (404, 403, 500):
            return None
        print(f"  HTTP {e.code}: {url}")
        return None
    except Exception as e:
        print(f"  ERR {e}")
        return None

downloaded = skipped = failed = 0
results = []   # [{uuid, url, logical_path, filename}, ...]

for i, (pair, entry) in enumerate(zip(pairs, native_urls)):
    path_index = pair[0]
    uuid       = entry['uuid']
    url_base   = entry['url_base']

    pinfo   = paths_dict.get(str(path_index))
    logical = pinfo[0] if pinfo else f'unknown_{path_index}'
    # 用路径最后一段 + uuid 前8位 作文件名基础
    last_seg = logical.replace('/', '__')
    base_name = last_seg

    # 检查是否已下载
    existing = [fn for fn in os.listdir(OUT_DIR)
                if fn.startswith(base_name + '.') or fn.startswith(base_name + '_')]
    if existing:
        results.append({'uuid': uuid, 'logical': logical, 'file': existing[0]})
        skipped += 1
        continue

    # 确定要尝试的 URL 列表
    ext = uuid_to_ext.get(uuid)
    if ext:
        urls_to_try = [url_base + ext]
    else:
        urls_to_try = [url_base + '.png', url_base + '.jpg', url_base + '.mp3']

    data = None
    used_url = None
    for u in urls_to_try:
        data = fetch(u)
        if data:
            used_url = u
            break

    if not data:
        print(f"[{i+1:3d}] FAIL  {logical[:50]}")
        failed += 1
        results.append({'uuid': uuid, 'logical': logical, 'file': None})
        continue

    # 判断扩展名
    final_ext = '.' + used_url.rsplit('.', 1)[-1]
    filename  = base_name + final_ext
    fpath     = os.path.join(OUT_DIR, filename)
    with open(fpath, 'wb') as fout:
        fout.write(data)

    results.append({'uuid': uuid, 'logical': logical, 'file': filename})
    downloaded += 1
    size_kb = len(data) / 1024
    print(f"[{i+1:3d}] OK {size_kb:6.1f}KB  {logical[:60]}")
    time.sleep(DELAY)

# ── 保存清单 ───────────────────────────────────────────────────────────────────
manifest = {r['logical']: r['file'] for r in results if r['file']}
with open(os.path.join(OUT_DIR, '_manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

print(f"\n=== 完成 ===  下载={downloaded}  跳过={skipped}  失败={failed}")
print(f"清单已写入 {OUT_DIR}/_manifest.json")
