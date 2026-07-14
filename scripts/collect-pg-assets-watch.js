/**
 * PG 麻将胡了 — 边玩边录资源（推荐用这个，比 collect-pg-assets.js 抓得更全）
 *
 * 用法：
 * 1. 打开官方游戏页，等主界面出来
 * 2. F12 -> Console，粘贴本脚本回车
 * 3. 按下面「操作清单」继续玩游戏 3~5 分钟
 * 4. 完成后在控制台输入：  PG_FINISH_COLLECT()
 * 5. 浏览器会批量下载文件 + pg-assets-manifest.json
 */
(function () {
  const GAME_ID = '65';
  const DELAY_MS = 200;
  const HOST_RE = /pgf-nvgais\.com/i;
  const ASSET_RE = /\.(png|jpg|jpeg|webp|mp3|ogg|wav|json)$/i;
  const PATH_RE = /\/65\/|\/shared\//;

  const seen = new Set();
  const queue = [];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const categorize = (url) => {
    if (url.startsWith('blob:')) return 'blobs';
    if (/\/assets\/resources\/native\//i.test(url)) return 'native';
    if (/\/assets\/resources\/import\//i.test(url)) return 'import';
    if (/config\..+\.json$/i.test(url)) return 'config';
    if (/\.(png|jpg|jpeg|webp)$/i.test(url)) return 'images';
    if (/\.(mp3|ogg|wav)$/i.test(url)) return 'audio';
    if (/\.json$/i.test(url)) return 'json';
    return 'other';
  };

  const fileNameFromUrl = (url, index, blobType) => {
    if (url.startsWith('blob:')) {
      const ext = blobType?.includes('jpeg') ? 'jpg' : blobType?.includes('png') ? 'png' : 'bin';
      return `blob_${String(index + 1).padStart(3, '0')}.${ext}`;
    }
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts.length >= 2 ? parts.slice(-2).join('_') : parts.pop() || `asset_${index + 1}`;
  };

  const shouldTrack = (url) => {
    if (!url) return false;
    if (url.startsWith('blob:')) return true;
    if (!/^https?:\/\//i.test(url)) return false;
    if (!HOST_RE.test(url)) return false;
    if (!PATH_RE.test(url)) return false;
    return ASSET_RE.test(url);
  };

  const track = (url) => {
    if (!shouldTrack(url) || seen.has(url)) return;
    seen.add(url);
    queue.push(url);
    console.log(`[PG+] ${queue.length} ${url.slice(0, 100)}`);
  };

  // 已有 performance 记录
  performance.getEntriesByType('resource').forEach((e) => track(e.name));

  // 继续监听新资源
  try {
    const obs = new PerformanceObserver((list) => {
      list.getEntries().forEach((e) => track(e.name));
    });
    obs.observe({ entryTypes: ['resource'] });
    window.__PG_OBS__ = obs;
  } catch (err) {
    console.warn('[PG] PerformanceObserver 不可用，仅使用已加载资源', err);
  }

  const downloadHttp = async (url, filename) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    return { size: blob.size, type: blob.type || res.headers.get('content-type') || '' };
  };

  const downloadBlob = async (url, filename) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    return { size: blob.size, type: blob.type };
  };

  window.PG_FINISH_COLLECT = async () => {
    const urls = [...seen];
    const httpUrls = urls.filter((u) => /^https?:\/\//i.test(u));
    const blobUrls = urls.filter((u) => u.startsWith('blob:'));

    console.log(`[PG] 开始下载 HTTP ${httpUrls.length}，blob ${blobUrls.length}`);

    const manifest = {
      collectedAt: new Date().toISOString(),
      page: location.href,
      gameId: GAME_ID,
      mode: 'watch',
      summary: { http: httpUrls.length, blob: blobUrls.length },
      items: [],
    };

    for (let i = 0; i < httpUrls.length; i++) {
      const url = httpUrls[i];
      const category = categorize(url);
      const filename = `${category}/${fileNameFromUrl(url, i)}`;
      try {
        const meta = await downloadHttp(url, filename.replace(/\//g, '__'));
        manifest.items.push({ url, category, filename, ok: true, ...meta });
        console.log(`[OK] ${i + 1}/${httpUrls.length} ${filename}`);
      } catch (err) {
        manifest.items.push({ url, category, filename, ok: false, error: String(err) });
        console.warn(`[FAIL] ${filename}`, err);
      }
      await sleep(DELAY_MS);
    }

    for (let i = 0; i < blobUrls.length; i++) {
      const url = blobUrls[i];
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const fname = `blobs__${fileNameFromUrl(url, i, blob.type)}`;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fname;
        a.click();
        URL.revokeObjectURL(a.href);
        manifest.items.push({
          url,
          category: 'blobs',
          filename: `blobs/${fileNameFromUrl(url, i, blob.type)}`,
          ok: true,
          size: blob.size,
          type: blob.type,
        });
      } catch (err) {
        manifest.items.push({ url, category: 'blobs', ok: false, error: String(err) });
      }
      await sleep(DELAY_MS);
    }

    const manifestText = JSON.stringify(manifest, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([manifestText], { type: 'application/json' }));
    a.download = 'pg-assets-manifest.json';
    a.click();

    try {
      await navigator.clipboard.writeText(manifestText);
    } catch (_) {}

    console.log('[PG] 全部完成。把下载文件放进 scripts/麻将胡了/ 后运行 deploy-pg-assets.py');
    return manifest.summary;
  };

  console.log(`
========================================
  PG 资源录制已启动
  请按操作清单玩游戏 3~5 分钟
  完成后输入:  PG_FINISH_COLLECT()
========================================
`);
})();
