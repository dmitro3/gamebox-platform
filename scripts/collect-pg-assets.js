/**
 * 在麻将胡了游戏页面控制台运行。
 * 1. 打开 https://www.pgf-nvgais.com/65/index.html?... 并进入主界面
 * 2. 多旋转几次、打开设置/规则页，让更多资源加载出来
 * 3. F12 -> Console，粘贴本脚本回车
 */
(async () => {
  const GAME_ID = '65';
  const DELAY_MS = 250;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const categorize = (url) => {
    if (url.startsWith('blob:')) return 'blobs';
    if (/\/assets\/resources\/native\//i.test(url)) return 'native';
    if (/\/assets\/resources\/import\//i.test(url)) return 'import';
    if (/config\..+\.json$/i.test(url)) return 'config';
    if (/\.(png|jpg|jpeg|webp)$/i.test(url)) return 'images';
    if (/\.(mp3|ogg|wav)$/i.test(url)) return 'audio';
    if (/\.json$/i.test(url)) return 'json';
    if (/\.js$/i.test(url)) return 'scripts';
    return 'other';
  };

  const fileNameFromUrl = (url, index, blobType) => {
    if (url.startsWith('blob:')) {
      const ext = blobType?.includes('jpeg') ? 'jpg' : blobType?.includes('png') ? 'png' : 'bin';
      return `blob_${String(index + 1).padStart(3, '0')}.${ext}`;
    }
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return parts.slice(-2).join('_');
    }
    return parts.pop() || `asset_${index + 1}`;
  };

  const collectHttpUrls = () => {
    const urls = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .filter((u) => /^https?:\/\//i.test(u))
      .filter((u) => new URL(u).hostname.includes('pgf-nvgais.com'))
      .filter((u) => /\/65\//.test(u) || /\/shared\//.test(u))
      .filter((u) => /\.(png|jpg|jpeg|webp|mp3|ogg|wav|json)$/i.test(u));

    return [...new Set(urls)];
  };

  const collectBlobUrls = () => {
    const urls = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .filter((u) => u.startsWith('blob:'));

    return [...new Set(urls)];
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

  const httpUrls = collectHttpUrls();
  const blobUrls = collectBlobUrls();

  const manifest = {
    collectedAt: new Date().toISOString(),
    page: location.href,
    gameId: GAME_ID,
    summary: {
      http: httpUrls.length,
      blob: blobUrls.length,
    },
    items: [],
  };

  console.log(`[PG] HTTP 资源 ${httpUrls.length} 个，blob 资源 ${blobUrls.length} 个`);

  for (let i = 0; i < httpUrls.length; i++) {
    const url = httpUrls[i];
    const category = categorize(url);
    const filename = `${category}/${fileNameFromUrl(url, i)}`;
    try {
      const meta = await downloadHttp(url, filename.replace(/\//g, '__'));
      manifest.items.push({ url, category, filename, ok: true, ...meta });
      console.log(`[OK] ${filename}`);
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
      const filename = `blobs/${fileNameFromUrl(url, i, blob.type)}`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename.replace(/\//g, '__');
      a.click();
      URL.revokeObjectURL(a.href);
      manifest.items.push({
        url,
        category: 'blobs',
        filename,
        ok: true,
        size: blob.size,
        type: blob.type,
      });
      console.log(`[OK] ${filename}`);
    } catch (err) {
      manifest.items.push({ url, category: 'blobs', ok: false, error: String(err) });
      console.warn(`[FAIL] blob ${i + 1}`, err);
    }
    await sleep(DELAY_MS);
  }

  const manifestText = JSON.stringify(manifest, null, 2);
  const manifestBlob = new Blob([manifestText], { type: 'application/json' });
  const manifestLink = document.createElement('a');
  manifestLink.href = URL.createObjectURL(manifestBlob);
  manifestLink.download = 'pg-assets-manifest.json';
  manifestLink.click();
  URL.revokeObjectURL(manifestLink.href);

  try {
    await navigator.clipboard.writeText(manifestText);
    console.log('[PG] 资源清单已复制到剪贴板');
  } catch (_) {
    console.log('[PG] 无法写入剪贴板，但 manifest 文件已下载');
  }

  console.log('[PG] 完成。优先查看 category=native / images 的文件。');
})();
