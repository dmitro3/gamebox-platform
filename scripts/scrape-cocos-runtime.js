/**
 * PG Mahjong Ways — Cocos 运行时完整精灵帧 & 场景布局导出
 *
 * 使用方法：
 *   1. 打开游戏页面，等待完全加载进入主界面
 *   2. 多点几下（旋转/开设置/规则页）让资源全部加载
 *   3. F12 → Console，粘贴整段脚本，回车
 *   4. 等待 "✅ 导出完成" 出现，下载的 JSON 文件即为完整清单
 *
 * 导出内容：
 *   - spriteFrames: 所有 SpriteFrame 的精确 atlas URL + rect + originalSize + offset + rotated
 *   - textures:     所有 Texture2D 的 URL + 像素尺寸
 *   - sceneNodes:   当前场景节点树（name / position / size / anchor / spriteFrame 引用）
 *   - designSize:   Cocos 设计分辨率
 */
(async () => {
  'use strict';

  // ─── 工具 ────────────────────────────────────────────────────────────────
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function safeGet(obj, ...keys) {
    let cur = obj;
    for (const k of keys) {
      if (cur == null) return undefined;
      cur = cur[k];
    }
    return cur;
  }

  function rectToArr(r) {
    if (!r) return null;
    return [
      Math.round(r.x ?? r.xMin ?? 0),
      Math.round(r.y ?? r.yMin ?? 0),
      Math.round(r.width ?? r.w ?? 0),
      Math.round(r.height ?? r.h ?? 0),
    ];
  }

  function vec2ToArr(v) {
    if (!v) return null;
    return [+(v.x ?? 0).toFixed(3), +(v.y ?? 0).toFixed(3)];
  }

  // ─── 检查 cc ────────────────────────────────────────────────────────────
  if (typeof cc === 'undefined' || !cc.director) {
    console.error('❌ cc 未就绪，请等游戏加载完毕再执行');
    return;
  }

  const version = safeGet(cc, 'ENGINE_VERSION') || safeGet(cc, 'engineVersion') || 'unknown';
  console.log(`[PG Dump] Cocos ${version}`);

  // ─── 1. 收集 SpriteFrame ────────────────────────────────────────────────
  const spriteFrames = {};
  const textureMap = {};   // url → { url, w, h }

  function captureSpriteFrame(sf) {
    if (!sf || sf.__dumped) return;
    sf.__dumped = true;

    const uuid = sf._uuid || sf.uuid || sf.id || null;
    const name = sf._name || sf.name || '';

    // 获取底层 Texture2D
    const tex = sf._texture || sf.texture || safeGet(sf, '_textureMeta', '_texture') || null;
    const nativeUrl =
      safeGet(tex, '_nativeUrl') ||
      safeGet(tex, 'nativeUrl') ||
      safeGet(tex, '_url') ||
      safeGet(tex, 'url') ||
      null;

    if (nativeUrl && !textureMap[nativeUrl]) {
      textureMap[nativeUrl] = {
        url: nativeUrl,
        w: safeGet(tex, '_width') || safeGet(tex, 'width') || 0,
        h: safeGet(tex, '_height') || safeGet(tex, 'height') || 0,
      };
    }

    const rect         = sf._rect || sf.rect || null;
    const originalSize = sf._originalSize || sf.originalSize || null;
    const offset       = sf._offset || sf.offset || null;
    const rotated      = !!(sf._rotated || sf.rotated);
    // Cocos3 trimmed rect
    const trimRect     = sf._trimRect || sf.trimRect || null;

    const key = uuid || `${name}_${nativeUrl || ''}`;
    spriteFrames[key] = {
      uuid,
      name,
      atlasUrl: nativeUrl,
      rect: rectToArr(rect),
      originalSize: originalSize
        ? [Math.round(originalSize.width || originalSize.w || 0), Math.round(originalSize.height || originalSize.h || 0)]
        : null,
      offset: vec2ToArr(offset),
      rotated,
      trimRect: rectToArr(trimRect),
    };
  }

  // 方式 A：cc.assetManager (Cocos 2.4+ / Cocos 3.x)
  const mgr = cc.assetManager || cc.loader;
  if (mgr && mgr._assets) {
    try {
      mgr._assets.forEach((asset) => {
        if (asset instanceof cc.SpriteFrame) captureSpriteFrame(asset);
      });
      console.log(`[PG Dump] assetManager._assets: ${Object.keys(spriteFrames).length} 帧`);
    } catch (e) {
      console.warn('[PG Dump] assetManager._assets 枚举失败:', e);
    }
  }
  if (mgr && mgr.assets) {
    try {
      Object.values(mgr.assets).forEach((asset) => {
        if (asset instanceof cc.SpriteFrame) captureSpriteFrame(asset);
      });
      console.log(`[PG Dump] assetManager.assets 追加后: ${Object.keys(spriteFrames).length} 帧`);
    } catch (e) {}
  }

  // 方式 B：cc.loader._cache（Cocos 2.x 旧 API）
  if (cc.loader && cc.loader._cache) {
    try {
      Object.values(cc.loader._cache).forEach((item) => {
        const asset = item && item.content;
        if (asset instanceof cc.SpriteFrame) captureSpriteFrame(asset);
        if (asset instanceof cc.SpriteAtlas) {
          const frames = asset.getSpriteFrames ? asset.getSpriteFrames() : [];
          frames.forEach(captureSpriteFrame);
        }
      });
      console.log(`[PG Dump] loader._cache 追加后: ${Object.keys(spriteFrames).length} 帧`);
    } catch (e) {
      console.warn('[PG Dump] loader._cache 枚举失败:', e);
    }
  }

  // 方式 C：遍历场景节点，从 Sprite 组件收集（保证不漏场景内当前使用的帧）
  function walkScene(node, depth = 0) {
    if (!node || depth > 20) return;
    // Cocos 2.x
    const sprite = node.getComponent && node.getComponent(cc.Sprite);
    if (sprite && sprite.spriteFrame) captureSpriteFrame(sprite.spriteFrame);
    // Cocos 3.x
    const sprite3 = safeGet(node, '_components')?.find?.(c => c && c.spriteFrame !== undefined);
    if (sprite3 && sprite3.spriteFrame) captureSpriteFrame(sprite3.spriteFrame);

    const children = node._children || node.children || [];
    children.forEach((c) => walkScene(c, depth + 1));
  }
  try {
    const scene = cc.director.getScene();
    walkScene(scene);
    console.log(`[PG Dump] 场景遍历后: ${Object.keys(spriteFrames).length} 帧`);
  } catch (e) {
    console.warn('[PG Dump] 场景遍历失败:', e);
  }

  // ─── 2. 收集场景布局 ─────────────────────────────────────────────────────
  let designW = 1080, designH = 1920;
  try {
    const ds = cc.view.getDesignResolutionSize();
    designW = ds.width;
    designH = ds.height;
  } catch (e) {}

  const canvas = (() => {
    try {
      return cc.find('Canvas') || cc.director.getScene();
    } catch (e) {
      return null;
    }
  })();

  function worldPct(node) {
    try {
      const bbox = node.getBoundingBoxToWorld();
      if (!bbox) return null;
      let bl, tr;
      if (canvas) {
        bl = canvas.convertToNodeSpaceAR(cc.v2(bbox.x, bbox.y));
        tr = canvas.convertToNodeSpaceAR(cc.v2(bbox.x + bbox.width, bbox.y + bbox.height));
      } else {
        bl = { x: bbox.x, y: bbox.y };
        tr = { x: bbox.x + bbox.width, y: bbox.y + bbox.height };
      }
      const left  = Math.min(bl.x, tr.x);
      const right = Math.max(bl.x, tr.x);
      const bot   = Math.min(bl.y, tr.y);
      const top   = Math.max(bl.y, tr.y);
      const cx = designW / 2, cy = designH / 2;
      return {
        leftPct:   +((cx + left)  / designW * 100).toFixed(3),
        topPct:    +((cy - top)   / designH * 100).toFixed(3),
        widthPct:  +((right-left) / designW * 100).toFixed(3),
        heightPct: +((top-bot)    / designH * 100).toFixed(3),
      };
    } catch (e) {
      return null;
    }
  }

  function dumpNode(node, depth = 0) {
    if (!node || depth > 12) return null;
    const name = node.name || node._name || '';
    const pos  = node.position || node._position || {};
    const size = node.contentSize || node._contentSize || {};
    const anchor = node.anchorPoint || node._anchorPoint || {};
    const scale = { x: node.scaleX ?? 1, y: node.scaleY ?? 1 };
    const active = node.active ?? node._activeInHierarchy ?? true;

    // 当前精灵帧
    let spriteName = null, spriteAtlasUrl = null;
    try {
      const sp = node.getComponent && node.getComponent(cc.Sprite);
      if (sp && sp.spriteFrame) {
        spriteName = sp.spriteFrame._name || sp.spriteFrame.name || null;
        const tex = sp.spriteFrame._texture || sp.spriteFrame.texture;
        spriteAtlasUrl =
          safeGet(tex, '_nativeUrl') ||
          safeGet(tex, 'nativeUrl') ||
          safeGet(tex, '_url') || null;
      }
    } catch (e) {}

    const children = (node._children || node.children || [])
      .map((c) => dumpNode(c, depth + 1))
      .filter(Boolean);

    const entry = {
      name,
      active,
      pos: [+(pos.x || 0).toFixed(1), +(pos.y || 0).toFixed(1)],
      size: [Math.round(size.width || 0), Math.round(size.height || 0)],
      anchor: [+(anchor.x ?? 0.5).toFixed(3), +(anchor.y ?? 0.5).toFixed(3)],
      scale: [+scale.x.toFixed(3), +scale.y.toFixed(3)],
      worldPct: worldPct(node),
    };
    if (spriteName)     entry.sprite = spriteName;
    if (spriteAtlasUrl) entry.atlasUrl = spriteAtlasUrl;
    if (children.length) entry.children = children;
    return entry;
  }

  let sceneTree = null;
  try {
    const scene = cc.director.getScene();
    sceneTree = dumpNode(scene, 0);
  } catch (e) {
    console.warn('[PG Dump] 场景树导出失败:', e);
  }

  // ─── 3. 收集 HTTP 网络资源 URL（补充 textures 列表）────────────────────
  try {
    performance.getEntriesByType('resource')
      .map((e) => e.name)
      .filter((u) => /\.(png|jpg|jpeg|webp)$/i.test(u))
      .forEach((url) => {
        if (!textureMap[url]) textureMap[url] = { url, w: 0, h: 0 };
      });
  } catch (e) {}

  // ─── 4. 汇总 & 下载 ─────────────────────────────────────────────────────
  const dump = {
    dumpedAt:    new Date().toISOString(),
    page:        location.href,
    engineVersion: version,
    designSize:  [designW, designH],
    summary: {
      spriteFrames: Object.keys(spriteFrames).length,
      textures:     Object.keys(textureMap).length,
    },
    spriteFrames,
    textures: Object.values(textureMap),
    sceneTree,
  };

  const json = JSON.stringify(dump, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pg-cocos-dump.json';
  a.click();
  URL.revokeObjectURL(a.href);

  try { await navigator.clipboard.writeText(json); } catch (_) {}

  console.log(`✅ 导出完成！精灵帧: ${dump.summary.spriteFrames}，图集: ${dump.summary.textures}`);
  console.log('📁 文件已下载: pg-cocos-dump.json');
  console.log('📋 下一步：将此文件放到 scripts/ 目录，运行 python extract-from-runtime-dump.py');
})();
