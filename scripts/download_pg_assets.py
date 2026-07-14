#!/usr/bin/env python3
"""
下载 PG Soft Mahjong Ways 全部 native 图片资源
1. 读取 config.f413e.json 获取路径映射
2. 读取 uuid_batch.json 和 native_urls.json 构建 URL
3. 批量下载，探测文件类型，保存到 pg_assets/ 目录
"""
import json, os, time, struct
import urllib.request
import urllib.error

# ─── 配置 ────────────────────────────────────────────────────────────────────
NATIVE_BASE  = 'https://www.pgf-nvgais.com/65/assets/resources/native/'
IMPORT_BASE  = 'https://www.pgf-nvgais.com/65/assets/resources/import/'
OUT_DIR      = 'pg_assets'
DELAY        = 0.25          # 每个请求之间的延迟（秒）
HEADERS      = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0',
    'Referer':    'https://www.pgf-nvgais.com/',
    'Accept':     '*/*',
}

# ─── 读取 config 中的路径映射 ─────────────────────────────────────────────────
with open('config.f413e.json', encoding='utf-8') as f:
    cfg = json.load(f)
paths_dict   = cfg['paths']        # {str_idx: [logical_path, type_id]}
uuids_list   = cfg['uuids']        # 2500 compact UUIDs (indexed)
types_list   = cfg['types']        # type name array

# 解析 versions.native (格式: [idx, hash, idx, hash, ...])
native_vers = cfg['versions']['native']
native_hash_by_idx = {}
for i in range(0, len(native_vers) - 1, 2):
    idx  = native_vers[i]
    h    = native_vers[i + 1]
    if isinstance(idx, int) and isinstance(h, str):
        native_hash_by_idx[idx] = h

# 解析 versions.import (同格式)
import_vers = cfg['versions'].get('import', [])
import_hash_by_idx = {}
for i in range(0, len(import_vers) - 1, 2):
    idx = import_vers[i]
    h   = import_vers[i + 1]
    if isinstance(idx, int) and isinstance(h, str):
        import_hash_by_idx[idx] = h

print(f"  config: {len(uuids_list)} UUIDs, {len(native_hash_by_idx)} native files, "
      f"{len(import_hash_by_idx)} import files")

# ─── 读取解码好的 UUID ────────────────────────────────────────────────────────
with open('native_urls.json') as f:
    native_urls = json.load(f)          # [{uuid, hash, url_base}, ...]

# ─── 读取 uuid_batch 以获取 path_index ───────────────────────────────────────
with open('uuid_batch.json') as f:
    pairs = json.load(f)                # [[path_index, compact_uuid, native_hash], ...]

assert len(native_urls) == len(pairs), "length mismatch!"

# ─── 构建完整下载列表 ──────────────────────────────────────────────────────────
def sig_to_ext(data: bytes) -> str:
    """根据文件头魔数判断扩展名"""
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return '.png'
    if data[:3] == b'\xff\xd8\xff':
        return '.jpg'
    if data[:3] == b'GIF':
        return '.gif'
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return '.webp'
    if data[:3] == b'ID3' or (len(data) >= 2 and data[:2] in (b'\xff\xfb', b'\xff\xf3')):
        return '.mp3'
    if data[:4] == b'OggS':
        return '.ogg'
    try:
        data[:64].decode('utf-8')
        return '.json'
    except Exception:
        return '.bin'

def fetch(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        print(f"    HTTP {e.code}: {url}")
        return None
    except Exception as e:
        print(f"    ERR {e}: {url}")
        return None

os.makedirs(OUT_DIR, exist_ok=True)

# ─── 主下载循环 ────────────────────────────────────────────────────────────────
downloaded = 0
skipped    = 0
failed     = 0
asset_manifest = {}   # logical_path → local_filename

for i, (pair, entry) in enumerate(zip(pairs, native_urls)):
    path_index   = pair[0]
    native_hash  = pair[2]
    uuid         = entry['uuid']
    url          = entry['url_base']

    pinfo       = paths_dict.get(str(path_index), None)
    logical     = pinfo[0] if pinfo else f'unknown_{path_index}'
    type_id     = pinfo[1] if pinfo else 0

    # 用逻辑路径最后一段作为保存文件名的基础
    base_name   = logical.replace('/', '__')
    # 检查是否已下载过（用任意扩展名匹配）
    existing    = [fn for fn in os.listdir(OUT_DIR) if fn.startswith(base_name + '.')]
    if existing:
        asset_manifest[logical] = existing[0]
        skipped += 1
        continue

    print(f"[{i+1:3d}/{len(pairs)}] {logical[:60]}")
    data = fetch(url)
    if data is None:
        # 尝试加 .png 扩展
        data = fetch(url + '.png')
    if data is None:
        print(f"    FAIL: {url}")
        failed += 1
        continue

    ext      = sig_to_ext(data)
    filename = base_name + ext
    fpath    = os.path.join(OUT_DIR, filename)
    with open(fpath, 'wb') as f:
        f.write(data)

    asset_manifest[logical] = filename
    downloaded += 1
    time.sleep(DELAY)

# ─── 保存资产清单 ──────────────────────────────────────────────────────────────
with open(os.path.join(OUT_DIR, '_manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(asset_manifest, f, indent=2, ensure_ascii=False)

print(f"\nDone. downloaded={downloaded}  skipped={skipped}  failed={failed}")
print(f"Manifest saved to {OUT_DIR}/_manifest.json")
