/**
 * PG Mahjong Ways — 精灵直接渲染导出 (RenderTexture 版)
 *
 * 用法：
 *   1. 打开游戏 → 等进入主界面 → 旋转一次 → 点开设置面板一次
 *   2. F12 → Console → 粘贴整段 → 回车
 *   3. 等 "✅ 全部完成" → 自动下载 pg-sprites-direct.json
 */
(async () => {
  'use strict';
  if (typeof cc === 'undefined' || !cc.director) {
    console.error('❌ cc 未就绪'); return;
  }
  console.log('[Export] 开始...');

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ── 方法 1：用 2D canvas 直接裁剪（同源/blob 纹理不受 CORS 限制）────────
  function renderCanvas2D(sf) {
    try {
      const tex = sf._texture || sf.texture;
      if (!tex) return null;
      const img = tex._image || tex.image || tex._nativeData;
      if (!img) return null;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) return null;

      const r   = sf._rect || sf.rect;
      if (!r) return null;
      const rx  = Math.round(r.x ?? r.xMin ?? 0);
      const ry  = Math.round(r.y ?? r.yMin ?? 0);
      const rw  = Math.round(r.width  ?? r.w ?? 0);
      const rh  = Math.round(r.height ?? r.h ?? 0);
      if (!rw || !rh) return null;

      const rot  = !!(sf._rotated || sf.rotated);
      const outW = rot ? rh : rw;
      const outH = rot ? rw : rh;

      const c = document.createElement('canvas');
      c.width = outW; c.height = outH;
      const ctx = c.getContext('2d');
      if (rot) {
        ctx.translate(outW, 0);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, rx, ry, rw, rh, 0, 0, rw, rh);
      } else {
        ctx.drawImage(img, rx, ry, rw, rh, 0, 0, rw, rh);
      }
      return c.toDataURL('image/png');
    } catch (e) { return null; }
  }

  // ── 方法 2：通过 Cocos RenderTexture（WebGL 渲染，无 CORS 问题）──────────
  async function renderGL(sf) {
    try {
      const os = sf.getOriginalSize ? sf.getOriginalSize()
               : sf._originalSize || sf._rect;
      const w = Math.round(os.width || os.w || sf._rect?.width  || 0);
      const h = Math.round(os.height|| os.h || sf._rect?.height || 0);
      if (!w || !h) return null;

      const rt = new cc.RenderTexture();
      rt.initWithSize(w, h);

      const node = new cc.Node('__ex_spr');
      node.setPosition(0, 0);
      node.setContentSize(w, h);
      const spr = node.addComponent(cc.Sprite);
      spr.spriteFrame = sf;
      if (cc.Sprite.SizeMode) spr.sizeMode = cc.Sprite.SizeMode.RAW;

      const camNode = new cc.Node('__ex_cam');
      camNode.setPosition(0, 0);
      const cam = camNode.addComponent(cc.Camera);
      cam.clearFlags = cc.Camera.ClearFlags.COLOR;
      cam.backgroundColor = new cc.Color(0, 0, 0, 0);
      cam.targetTexture = rt;
      cam.cullingMask = 0xFFFFFFFF;

      const scene = cc.director.getScene();
      scene.addChild(node);
      scene.addChild(camNode);

      // 等下一帧渲染完
      await new Promise(res => {
        const fn = () => { cc.director.off(cc.Director.EVENT_AFTER_DRAW, fn); res(); };
        cc.director.on(cc.Director.EVENT_AFTER_DRAW, fn);
      });
      await sleep(30);

      const pixels = rt.readPixels();
      node.destroy(); camNode.destroy(); rt.destroy();

      if (!pixels || !pixels.length) return null;

      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      const id = ctx.createImageData(w, h);
      // WebGL Y 轴反向，翻转
      for (let row = 0; row < h; row++) {
        const s = (h - 1 - row) * w * 4;
        const d = row * w * 4;
        id.data.set(pixels.subarray(s, s + w * 4), d);
      }
      ctx.putImageData(id, 0, 0);
      return c.toDataURL('image/png');
    } catch (e) { return null; }
  }

  // ── 收集精灵帧 ─────────────────────────────────────────────────────────
  const frameMap = {};   // name → SpriteFrame
  const seen = new Set();

  function collect(asset) {
    if (!(asset instanceof cc.SpriteFrame)) return;
    const name = asset._name || asset.name || asset._uuid || '';
    if (!name || seen.has(name)) return;
    seen.add(name);
    frameMap[name] = asset;
  }

  const mgr = cc.assetManager || cc.loader;
  if (mgr?._assets) try { mgr._assets.forEach(collect); } catch(e){}
  if (mgr?.assets)  try { Object.values(mgr.assets).forEach(collect); } catch(e){}
  if (cc.loader?._cache) try { Object.values(cc.loader._cache).forEach(collect); } catch(e){}

  // 场景节点扫描
  function scanNode(node) {
    if (!node) return;
    try {
      const sp = node.getComponent?.(cc.Sprite);
      if (sp?.spriteFrame) collect(sp.spriteFrame);
      const ch = node._children || node.children || [];
      for (const c of ch) scanNode(c);
    } catch(e){}
  }
  const scene = cc.director.getScene?.() || cc.director._scene;
  if (scene) scanNode(scene);

  console.log(`[Export] 找到 ${Object.keys(frameMap).length} 个精灵帧`);

  // ── 逐个渲染 ──────────────────────────────────────────────────────────
  const results = {};
  let ok = 0, glOk = 0, fail = 0;

  for (const [name, sf] of Object.entries(frameMap)) {
    // 先试 2D canvas
    let dataUrl = renderCanvas2D(sf);

    // 失败了再试 GL RenderTexture
    if (!dataUrl || dataUrl.length < 200) {
      dataUrl = await renderGL(sf);
      if (dataUrl && dataUrl.length >= 200) {
        glOk++;
      }
    } else {
      ok++;
    }

    if (dataUrl && dataUrl.length >= 200) {
      const r   = sf._rect || sf.rect || {};
      const rot = !!(sf._rotated || sf.rotated);
      results[name] = {
        name,
        uuid: sf._uuid || '',
        w: rot ? Math.round(r.height ?? r.h ?? 0) : Math.round(r.width  ?? r.w ?? 0),
        h: rot ? Math.round(r.width  ?? r.w ?? 0) : Math.round(r.height ?? r.h ?? 0),
        dataUrl
      };
    } else {
      fail++;
      if (fail <= 10) console.warn(`  ✗ ${name}`);
    }
  }

  console.log(`\n✅ 全部完成: 2D=${ok} GL=${glOk} 失败=${fail} 总计=${ok+glOk}`);

  // ── 下载 ─────────────────────────────────────────────────────────────
  const total = ok + glOk;
  const json  = JSON.stringify({ timestamp: new Date().toISOString(), count: total, sprites: results });
  const blob  = new Blob([json], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href = url; a.download = 'pg-sprites-direct.json';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log('📦 已下载 pg-sprites-direct.json');
})();
