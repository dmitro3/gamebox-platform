/**
 * 正版 Mahjong Ways — Cocos 运行时导出（世界坐标，非 prefab 推算）。
 * 控制台或 CDP Runtime.evaluate 执行。
 */
(() => {
  if (!window.cc || !cc.director) {
    return JSON.stringify({ error: 'cc 未就绪，等游戏加载完再执行' })
  }
  const dw = cc.view.getDesignResolutionSize().width
  const dh = cc.view.getDesignResolutionSize().height

  const canvas =
    cc.find('Canvas') ||
    (() => {
      let found = null
      function walk(n) {
        if (found || !n) return
        if (n.name === 'Canvas') found = n
        for (const c of n.children || []) walk(c)
      }
      walk(cc.director.getScene())
      return found
    })()

  function pctBox(n) {
    const bbox = n.getBoundingBoxToWorld()
    let bl, tr
    if (canvas) {
      bl = canvas.convertToNodeSpaceAR(cc.v2(bbox.x, bbox.y))
      tr = canvas.convertToNodeSpaceAR(cc.v2(bbox.x + bbox.width, bbox.y + bbox.height))
    } else {
      bl = cc.v2(bbox.x, bbox.y)
      tr = cc.v2(bbox.x + bbox.width, bbox.y + bbox.height)
    }
    const left = Math.min(bl.x, tr.x)
    const right = Math.max(bl.x, tr.x)
    const bottom = Math.min(bl.y, tr.y)
    const topY = Math.max(bl.y, tr.y)
    const cx = dw / 2
    const cy = dh / 2
    const leftDesign = cx + left
    const topDesign = cy - topY
    const wDesign = right - left
    const hDesign = topY - bottom
    return {
      leftPct: +(leftDesign / dw * 100).toFixed(3),
      topPct: +(topDesign / dh * 100).toFixed(3),
      widthPct: +(wDesign / dw * 100).toFixed(3),
      heightPct: +(hDesign / dh * 100).toFixed(3),
    }
  }

  const targets = new Set([
    'background_controller', 'main_top_a', 'main_top_b', 'main_bottom_a',
    'reel_a', 'reel_glow', 'slot_controller',
    'dark_reel_1', 'dark_reel_2', 'dark_reel_3', 'dark_reel_4', 'dark_reel_5',
    'multiplier_bar_controller', '1024ways',
    'infoboard_controller', 'infoboard_holder', 'content',
    'spin_button_controller', 'spin_base',
    'setting_menu', 'setting_info_footer_controller', 'GameInfo',
    'wallet_button_sensor', 'bet_button_sensor', 'win_button_sensor',
  ])
  const nodes = {}

  function findNode(name, root = cc.director.getScene(), depth = 0) {
    if (!root || depth > 16) return null
    if (root.name === name) return root
    for (const c of root.children || []) {
      const hit = findNode(name, c, depth + 1)
      if (hit) return hit
    }
    return null
  }

  function walk(node, depth = 0) {
    if (!node || depth > 16) return
    const name = node.name || ''
    if (targets.has(name)) nodes[name] = pctBox(node)
    for (const c of node.children || []) walk(c, depth + 1)
  }
  walk(cc.director.getScene())

  // 按钮区子节点：一次 dump 拿到每个键的真实坐标（避免手调）
  for (const rootName of ['spin_button_controller', 'wallet_button_sensor', 'setting_menu']) {
    const root = findNode(rootName)
    if (!root) continue
    function walkChildren(n, depth = 0) {
      if (!n || depth > 8) return
      const name = n.name || ''
      if (name && name !== rootName) {
        const key = `${rootName}/${name}`
        nodes[key] = pctBox(n)
      }
      for (const c of n.children || []) walkChildren(c, depth + 1)
    }
    walkChildren(root)
  }

  return JSON.stringify({
    source: 'live-cocos-runtime',
    page: location.href,
    design: [dw, dh],
    nodes,
  }, null, 2)
})()
