/**
 * 游戏页公共桥接（供 games-assets 内嵌 HTML 使用）
 * 与 Vue 客户端共享 localStorage，并通过 postMessage 导航
 */
(function () {
  const VUE_ROUTE_MAP = [
    [/game-lobby|\/lobby\b|^\/lobby\b/, '/lobby'],
    [/cs\.html|pages\/cs|^\/cs\b/, '/cs'],
    [/bet-records|^\/bets\b/, '/bets'],
    [/recharge|^\/recharge\b/, '/recharge'],
    [/apply-records/, '/apply-records'],
    [/flow\.html|pages\/flow|^\/flow\b/, '/flow'],
    [/points-log/, '/points-log'],
    [/profile\.html|withdraw|^\/settings\b/, '/settings'],
    [/welfare/, '/flow'],
  ]

  window.App = window.App || {}

  App.APP_NAME = '金御汇'
  App.BALANCE_KEY_PREFIX = 'gamebox_balance_'
  App.DEFAULT_BALANCE = 88888
  App.NAME_PREFIX = ['黄金', '银河', '夜行', '闪电', '深海', '炽焰', '疾风', '幻影']
  App.NAME_SUFFIX = ['猎手', '行者', '骑士', '大师', '旅人', '王者', '武士', '侠客']

  App.getUser = function () {
    try {
      const raw = localStorage.getItem('gamebox_user')
      if (raw) {
        const u = JSON.parse(raw)
        if (u && u.uid) return u
      }
    } catch (_) { /* ignore */ }
    const u = {
      uid: '100000001',
      name: '游客',
      avatar: '/images/avatars/001.jpg',
    }
    App.setUser(u)
    return u
  }

  App.setUser = function (user) {
    localStorage.setItem('gamebox_user', JSON.stringify(user))
  }

  App.getBalance = function (uid) {
    if (!uid) return App.DEFAULT_BALANCE
    const raw = localStorage.getItem(App.BALANCE_KEY_PREFIX + uid)
    if (raw === null) return App.DEFAULT_BALANCE
    const n = parseInt(raw, 10)
    return isNaN(n) ? App.DEFAULT_BALANCE : n
  }

  App.setBalance = function (uid, val) {
    if (!uid) return
    const n = Math.max(0, Math.floor(Number(val) || 0))
    localStorage.setItem(App.BALANCE_KEY_PREFIX + uid, String(n))
  }

  App.adjustBalance = function (uid, delta) {
    if (!uid) return App.DEFAULT_BALANCE
    const cur = App.getBalance(uid)
    const next = Math.max(0, cur + Math.floor(Number(delta) || 0))
    App.setBalance(uid, next)
    return next
  }

  App.toast = function (msg) {
    let el = document.getElementById('app-toast')
    if (!el) {
      el = document.createElement('div')
      el.id = 'app-toast'
      el.style.cssText = [
        'position:fixed', 'left:50%', 'bottom:80px', 'transform:translateX(-50%)',
        'z-index:9999', 'padding:10px 18px', 'border-radius:8px',
        'background:rgba(26,20,13,0.95)', 'border:1px solid rgba(212,175,55,0.35)',
        'color:#f5ecd6', 'font-size:14px', 'pointer-events:none',
        'opacity:0', 'transition:opacity 0.25s',
      ].join(';')
      document.body.appendChild(el)
    }
    el.textContent = String(msg || '')
    el.style.opacity = '1'
    clearTimeout(App._toastTimer)
    App._toastTimer = setTimeout(() => { el.style.opacity = '0' }, 2200)
  }

  App.resolveVuePath = function (url) {
    const s = String(url || '')
    for (const [re, path] of VUE_ROUTE_MAP) {
      if (re.test(s)) return path
    }
    return null
  }

  App.go = function (url) {
    const s = String(url || '')
    const vuePath = App.resolveVuePath(s)
    const qIdx = s.indexOf('?')
    const qs = qIdx >= 0 ? s.slice(qIdx) : ''
    if (vuePath && window.parent !== window) {
      window.parent.postMessage({ type: 'assets-game-nav', path: vuePath + qs }, '*')
      return
    }
    if (vuePath) {
      location.href = vuePath + qs
      return
    }
    App.toast('该功能即将开放')
  }

  App.mountTabbar = function () { /* 游戏内不显示底部 Tab */ }
})()
