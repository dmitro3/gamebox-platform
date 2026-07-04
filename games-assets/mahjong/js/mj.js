(function () {
  const DESIGN_W = 1080
  const DESIGN_H = 2340
  const REF_BG = '/images/games/mahjong/pg/ui/ref-official-ui.png'
  const SYMBOLS = ['fa', 'zhong', 'bai', '8w', '5t', '5s', '2t', '2s', 'wild', 'hu']
  const SYM_BASE = '/images/games/mahjong/classic/symbols'

  function pctBoxStyle(box) {
    return {
      left: `${box.leftPct}%`,
      top: `${box.topPct}%`,
      width: `${box.widthPct}%`,
      height: `${box.heightPct}%`,
    }
  }

  function applyStyles(el, styles) {
    Object.assign(el.style, styles)
  }

  function layerImg(box, src, className) {
    const wrap = document.createElement('div')
    wrap.className = `mj-layer ${className || ''}`
    applyStyles(wrap, pctBoxStyle(box))
    const img = document.createElement('img')
    img.src = src
    img.alt = ''
    img.draggable = false
    wrap.appendChild(img)
    return wrap
  }

  function updateScale() {
    const scale = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)
    document.documentElement.style.setProperty('--mj-scale', String(scale))
  }

  function mountReels(stage, layout) {
    for (const reel of layout.reels || []) {
      const col = document.createElement('div')
      col.className = 'mj-reel-col'
      applyStyles(col, pctBoxStyle(reel.box))
      for (let r = 0; r < 4; r++) {
        const cell = document.createElement('div')
        cell.className = 'mj-tile'
        const sym = SYMBOLS[(reel.col + r) % SYMBOLS.length]
        const img = document.createElement('img')
        img.src = `${SYM_BASE}/${sym}.png`
        img.alt = ''
        cell.appendChild(img)
        col.appendChild(cell)
      }
      stage.appendChild(col)
    }
  }

  function mountSpin(stage, layout) {
    const spinBox = layout.layers?.find((l) => l.id === 'spin-frame')?.box
      || layout.spinController
    if (!spinBox) return
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'mj-spin-hit'
    btn.setAttribute('aria-label', '旋转')
    applyStyles(btn, pctBoxStyle(spinBox))
    btn.addEventListener('click', () => {
      btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.92)' }, { transform: 'scale(1)' }], {
        duration: 180,
      })
    })
    stage.appendChild(btn)
  }

  async function boot() {
    const params = new URLSearchParams(location.search)
    const useLayers = params.get('layers') === '1'
    const res = await fetch('./assets/layout.json')
    const layout = await res.json()
    const stage = document.getElementById('mjStage')
    if (!stage) return

    if (!useLayers) {
      const bg = document.createElement('div')
      bg.className = 'mj-ref-bg'
      const img = document.createElement('img')
      img.src = REF_BG
      img.alt = ''
      bg.appendChild(img)
      stage.appendChild(bg)
      mountReels(stage, layout)
      mountSpin(stage, layout)
    } else {
      const order = [
        ['bottom-wood', 'mj-layer--wood'],
        ['reel-frame', 'mj-layer--green'],
        ['multiplier-bar', 'mj-layer--mult'],
        ['title-1024', 'mj-layer--title mj-layer--contain'],
        ['message-ribbon', 'mj-layer--msg mj-layer--contain'],
        ['spin-frame', 'mj-layer--spin mj-layer--contain'],
      ]
      const byId = Object.fromEntries((layout.layers || []).map((l) => [l.id, l]))
      for (const [id, cls] of order) {
        const layer = byId[id]
        if (layer) stage.appendChild(layerImg(layer.box, layer.src, cls))
      }
      if (layout.multBar && layout.multSprites?.length) {
        const row = document.createElement('div')
        row.className = 'mj-mult-row'
        applyStyles(row, pctBoxStyle(layout.multBar))
        for (const m of layout.multSprites) {
          const img = document.createElement('img')
          img.src = m.src
          img.alt = ''
          row.appendChild(img)
        }
        stage.appendChild(row)
      }
      mountReels(stage, layout)
      for (const ctrl of layout.controls || []) {
        stage.appendChild(layerImg(ctrl.box, ctrl.src, `mj-layer--${ctrl.id} mj-layer--contain`))
      }
      mountSpin(stage, layout)
    }

    updateScale()
    window.addEventListener('resize', updateScale)

    if (params.get('debug') === '1') stage.classList.add('mj-debug')
    const ref = params.get('ref')
    if (ref) {
      const ov = document.createElement('div')
      ov.className = 'mj-ref-overlay'
      ov.style.backgroundImage = `url(${decodeURIComponent(ref)})`
      stage.appendChild(ov)
    }
  }

  boot().catch((err) => console.error('[mj]', err))
})()
