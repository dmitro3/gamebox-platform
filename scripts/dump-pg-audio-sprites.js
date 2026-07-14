/**
 * 在正版 Mahjong Ways 页面加载完成后，于 DevTools Console 粘贴执行。
 *
 * 用法 A — 静态扫描（通常拿不到 general/vox 切片，仅供调试）:
 *   dumpPgAudioConfig()
 *
 * 用法 B — 推荐：hook 实际播放，在游戏里点旋转/中奖/倍数后再导出:
 *   installPgAudioHooks()
 *   // … 正版里操作：点旋转、等停轮、触发倍数语音、scatter 等 …
 *   exportPgAudioCaptures()
 */
(() => {
  const SCRIPT_VERSION = 'v4'
  const KEY_RE = /general|vox|audio|sound|sfx|sprite|multiplier|spin|reel|win|scatter|clip|cue|bgm|opus/i
  /** 跨多次粘贴保留捕获（避免重贴脚本后丢数据） */
  const captures = window.__PG_AUDIO_CAPTURES__ || (window.__PG_AUDIO_CAPTURES__ = [])
  let hooksInstalled = !!window.__PG_AUDIO_HOOKS_INSTALLED__

  function safeJson(v, depth = 0, visited = new WeakSet()) {
    if (depth > 8) return '[max-depth]'
    if (v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      return v
    }
    if (typeof v === 'function') return `[Function ${v.name || 'anonymous'}]`
    if (typeof v !== 'object') return String(v)

    if (visited.has(v)) return '[Circular]'
    visited.add(v)

    if (Array.isArray(v)) {
      const limit = v.length > 120 ? 120 : v.length
      const out = []
      for (let i = 0; i < limit; i += 1) out.push(safeJson(v[i], depth + 1, visited))
      if (v.length > limit) out.push(`[+${v.length - limit} more]`)
      return out
    }

    const out = {}
    let count = 0
    for (const [k, val] of Object.entries(v)) {
      if (count >= 80) {
        out['…'] = '[truncated]'
        break
      }
      if (!KEY_RE.test(k) && typeof val !== 'number' && typeof val !== 'string' && typeof val !== 'boolean') {
        continue
      }
      try {
        out[k] = safeJson(val, depth + 1, visited)
        count += 1
      } catch (e) {
        out[k] = `[Error: ${e.message}]`
        count += 1
      }
    }
    return out
  }

  function pushCapture(kind, detail) {
    captures.push({ at: performance.now(), kind, ...detail })
    if (captures.length > 500) captures.shift()
  }

  /** PG general_audio / vox 整轨时长（与 import JSON 一致） */
  const TRACK_BY_DURATION = [
    { track: 'general', duration: 96.024, tolerance: 0.6 },
    { track: 'vox', duration: 53.04, tolerance: 0.6 },
  ]

  function trackFromBufferDuration(duration) {
    if (typeof duration !== 'number' || !(duration > 0)) return null
    for (const t of TRACK_BY_DURATION) {
      if (Math.abs(duration - t.duration) <= t.tolerance) return t.track
    }
    return null
  }

  function isSpriteSrc(src) {
    return /general|vox|671c5bc3|35f37ba4/i.test(src || '')
  }

  function probePgAudioPath() {
    const noAudio =
      new URLSearchParams(location.search).get('no_audio') === '1' ||
      window.shell?.D?.get?.('no_audio') === '1'
    const out = {
      scriptVersion: SCRIPT_VERSION,
      hasCc: !!window.cc,
      ccAudioEngine: !!window.cc?.audioEngine,
      opusAudio: !!window.opusAudio,
      audioContext: !!(window.AudioContext || window.webkitAudioContext),
      noAudio,
      hooksInstalled: !!window.__PG_AUDIO_HOOKS_INSTALLED__,
      priorCaptureCount: captures.length,
      note: noAudio
        ? '检测到 no_audio=1，游戏可能完全静音'
        : 'Mahjong Ways 精灵音轨走 Web Audio（og 类），不是 HTMLAudioElement',
    }
    console.log('[pg-audio] 音频路径探测:', out)
    return out
  }

  function captureWebAudioPlay(detail) {
    if (window.__PG_AUDIO_SELF_TEST__) {
      pushCapture('self-test', detail)
      return
    }
    const track = detail.track
    pushCapture(track ? 'webaudio-start' : 'webaudio-any', detail)
  }

  function buildPlayDetail({ track, start, duration, loop, loopStart, loopEnd, bufferDuration, tag, selfTest }) {
    const off = typeof start === 'number' ? start : 0
    const end =
      typeof duration === 'number' && duration > 0
        ? off + duration
        : loop && typeof loopEnd === 'number'
          ? loopEnd
          : null
    return {
      track: track || null,
      start: +off.toFixed(3),
      end: end != null ? +end.toFixed(3) : null,
      duration: typeof duration === 'number' ? +duration.toFixed(3) : null,
      loop: !!loop,
      loopStart: typeof loopStart === 'number' ? +loopStart.toFixed(3) : null,
      loopEnd: typeof loopEnd === 'number' ? +loopEnd.toFixed(3) : null,
      bufferDuration: bufferDuration ? +Number(bufferDuration).toFixed(3) : null,
      tag: tag || null,
      selfTest: !!selfTest,
    }
  }

  function hookShellWebAudio() {
    const WA = window.shell?.WebAudio
    if (!WA?.prototype?.play || WA.prototype.__pgShellPlayPatched) return !!WA?.prototype?.__pgShellPlayPatched
    const origPlay = WA.prototype.play
    WA.prototype.play = function patchedShellPlay(start, duration) {
      try {
        const buf = this.It
        const bufDur = buf?.duration ?? this.Ot
        const tag = buf?._name || buf?.name || null
        const track = trackFromBufferDuration(bufDur)
        const hasStart = typeof start === 'number' && start >= 0
        const hasDur = typeof duration === 'number' && duration > 0
        const spriteStart = hasStart ? start : this.Zt
        const spriteEnd = hasStart && hasDur ? start + duration : hasStart ? null : this.Zt + this.Ot
        captureWebAudioPlay(
          buildPlayDetail({
            track,
            start: spriteStart,
            duration: hasDur ? duration : this.Ot,
            loop: this.Rt,
            loopStart: this.Zt,
            loopEnd: typeof this.Zt === 'number' && typeof this.Ot === 'number' ? this.Zt + this.Ot : null,
            bufferDuration: bufDur,
            tag,
          }),
        )
      } catch {
        /* ignore */
      }
      return origPlay.apply(this, arguments)
    }
    WA.prototype.__pgShellPlayPatched = true
    console.log('[pg-audio] 已 hook shell.WebAudio.prototype.play')
    return true
  }

  function hookCreateBufferSource(bufferTags) {
    for (const Ctor of [window.AudioContext, window.webkitAudioContext]) {
      if (!Ctor?.prototype?.createBufferSource || Ctor.prototype.__pgCbsPatched) continue
      const orig = Ctor.prototype.createBufferSource
      Ctor.prototype.createBufferSource = function patchedCbs() {
        const node = orig.call(this)
        if (node.__pgInstStartPatched) return node
        const origStart = node.start
        node.start = function instStart(when, offset, duration) {
          try {
            const buf = node.buffer
            const tag = bufferTags.get(buf)
            const track = tag
              ? /vox|35f37ba4/i.test(String(tag))
                ? 'vox'
                : /general|671c5bc3/i.test(String(tag))
                  ? 'general'
                  : String(tag)
              : trackFromBufferDuration(buf?.duration)
            captureWebAudioPlay(
              buildPlayDetail({
                track,
                start: typeof offset === 'number' ? offset : 0,
                duration,
                loop: node.loop,
                loopStart: node.loopStart,
                loopEnd: node.loopEnd,
                bufferDuration: buf?.duration,
                tag,
              }),
            )
          } catch {
            /* ignore */
          }
          return origStart.apply(node, arguments)
        }
        node.__pgInstStartPatched = true
        return node
      }
      Ctor.prototype.__pgCbsPatched = true
    }
  }

  function scheduleLateHooks() {
    let n = 0
    const timer = setInterval(() => {
      n += 1
      hookShellWebAudio()
      patchCcAudio()
      if (n >= 60) clearInterval(timer)
    }, 500)
  }

  function testPgAudioHooks() {
    if (!window.__PG_AUDIO_HOOKS_INSTALLED__) {
      console.warn('[pg-audio] 请先 installPgAudioHooks()')
      return false
    }
    const before = captures.length
    window.__PG_AUDIO_SELF_TEST__ = true
    try {
      const ctx = new AudioContext()
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start(0, 0, 0.05)
      setTimeout(() => {
        window.__PG_AUDIO_SELF_TEST__ = false
        const after = captures.length
        const gameCount = captures.filter((c) => c.kind !== 'self-test').length
        console.log(
          `[pg-audio] 自检: ${after > before ? 'OK — hook 生效' : '失败 — 请整页刷新后重贴脚本'}`,
          { before, after, gameCaptureCount: gameCount },
        )
      }, 200)
      return true
    } catch (e) {
      window.__PG_AUDIO_SELF_TEST__ = false
      console.error('[pg-audio] 自检失败', e)
      return false
    }
  }

  function patchCcAudio() {
    if (!window.cc) return
    const ae = cc.audioEngine
    if (ae && !ae.__pgPatched) {
      ae.__pgPatched = true
      for (const fn of ['play', 'playEffect', 'playMusic', 'setCurrentTime']) {
        if (typeof ae[fn] !== 'function') continue
        const orig = ae[fn].bind(ae)
        ae[fn] = (...args) => {
          pushCapture(`cc.audioEngine.${fn}`, { args: args.map((a) => safeJson(a, 0)) })
          return orig(...args)
        }
      }
    }
    const AS = cc.AudioSource
    if (AS?.prototype?.play && !AS.prototype.__pgAsPatched) {
      AS.prototype.__pgAsPatched = true
      const origAsPlay = AS.prototype.play
      AS.prototype.play = function patchedAsPlay(...args) {
        try {
          const clip = this.clip || this._clip
          const name = clip?._name || clip?.name || ''
          pushCapture('cc.AudioSource.play', {
            clip: name,
            volume: this.volume,
            loop: this.loop,
            startTime: this.startTime,
          })
        } catch {
          /* ignore */
        }
        return origAsPlay.apply(this, args)
      }
    }
  }

  function installPgAudioHooks() {
    if (hooksInstalled) {
      hookShellWebAudio()
      patchCcAudio()
      console.log(`[pg-audio] hooks 已安装 (${SCRIPT_VERSION})，已有 ${captures.length} 条捕获`)
      console.log('[pg-audio] 请操作游戏后再 exportPgAudioCaptures()（忽略 self-test 条目）')
      return captures
    }
    hooksInstalled = true
    window.__PG_AUDIO_HOOKS_INSTALLED__ = true
    probePgAudioPath()

    const bufferTags = new WeakMap()

    // decodeAudioData
    for (const Ctor of [window.AudioContext, window.webkitAudioContext]) {
      if (!Ctor?.prototype?.decodeAudioData || Ctor.prototype.__pgDecodePatched) continue
      Ctor.prototype.__pgDecodePatched = true
      const origDecode = Ctor.prototype.decodeAudioData
      Ctor.prototype.decodeAudioData = function patchedDecode(...args) {
        const urlHint = String(args[2] || args[1] || '')
        const done = args.length >= 3 ? args[2] : args[1]
        if (typeof done === 'function') {
          const wrap = (err, buffer) => {
            try {
              if (buffer && /general|vox|671c5bc3|35f37ba4/i.test(urlHint)) {
                bufferTags.set(buffer, urlHint.split('/').pop())
              } else if (buffer) {
                const track = trackFromBufferDuration(buffer.duration)
                if (track) bufferTags.set(buffer, track)
              }
            } catch {
              /* ignore */
            }
            return done(err, buffer)
          }
          if (args.length >= 3) args[2] = wrap
          else args[1] = wrap
        }
        return origDecode.apply(this, args)
      }
    }

    hookCreateBufferSource(bufferTags)

    if (!AudioBufferSourceNode.prototype.__pgAudioPatched) {
      const absStart = AudioBufferSourceNode.prototype.start
      AudioBufferSourceNode.prototype.start = function patchedAbsStart(when, offset, duration) {
        try {
          const buf = this.buffer
          const tag = bufferTags.get(buf)
          const track = tag
            ? /vox|35f37ba4/i.test(String(tag))
              ? 'vox'
              : /general|671c5bc3/i.test(String(tag))
                ? 'general'
                : String(tag)
            : trackFromBufferDuration(buf?.duration)
          captureWebAudioPlay(
            buildPlayDetail({
              track,
              start: typeof offset === 'number' ? offset : 0,
              duration,
              loop: this.loop,
              loopStart: this.loopStart,
              loopEnd: this.loopEnd,
              bufferDuration: buf?.duration,
              tag,
            }),
          )
        } catch {
          /* ignore */
        }
        return absStart.apply(this, arguments)
      }
      AudioBufferSourceNode.prototype.__pgAudioPatched = true
    }

    hookShellWebAudio()
    scheduleLateHooks()
    patchCcAudio()

    const ctDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime')
    if (ctDesc?.set && !HTMLMediaElement.prototype.__pgCtPatched) {
      HTMLMediaElement.prototype.__pgCtPatched = true
      Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
        configurable: true,
        enumerable: ctDesc.enumerable,
        get: ctDesc.get,
        set(v) {
          try {
            const src = this.currentSrc || this.src || ''
            if (isSpriteSrc(src) && typeof v === 'number' && v >= 0 && v < 120) {
              pushCapture('media-seek', { src: src.split('/').pop(), time: +v.toFixed(3) })
            }
          } catch {
            /* ignore */
          }
          return ctDesc.set.call(this, v)
        },
      })
    }

    if (!HTMLAudioElement.prototype.__pgPlayPatched) {
      HTMLAudioElement.prototype.__pgPlayPatched = true
      const origPlay = HTMLAudioElement.prototype.play
      HTMLAudioElement.prototype.play = function patchedPlay(...args) {
        try {
          const src = this.currentSrc || this.src || ''
          if (isSpriteSrc(src)) {
            pushCapture('media-play', {
              src: src.split('/').pop(),
              currentTime: +this.currentTime.toFixed(3),
              duration: +this.duration.toFixed(3),
            })
          }
        } catch {
          /* ignore */
        }
        return origPlay.apply(this, args)
      }
    }

    console.log(`[pg-audio] hooks 已安装 ${SCRIPT_VERSION}（shell.WebAudio + createBufferSource + decodeAudioData）`)
    console.log('  1) testPgAudioHooks()  → 产生 self-test 条目（可忽略）')
    console.log('  2) 实际操作游戏 30~60 秒，确认能听到旋转/停轮/中奖音效')
    console.log('  3) exportPgAudioCaptures()  → gameCaptureCount 应 > 0')
    return captures
  }

  function exportPgAudioCaptures() {
    const grouped = {}
    for (const c of captures) {
      const k = c.kind
      grouped[k] = grouped[k] || []
      grouped[k].push(c)
    }
    const gameCaptures = captures.filter((c) => c.kind !== 'self-test')
    const result = {
      scriptVersion: SCRIPT_VERSION,
      exportedAt: new Date().toISOString(),
      page: location.href,
      captureCount: captures.length,
      gameCaptureCount: gameCaptures.length,
      grouped,
      groupedGame: Object.fromEntries(
        Object.entries(grouped).filter(([k]) => k !== 'self-test'),
      ),
      all: captures,
      hint: 'v4: 看 groupedGame["webaudio-start"]（忽略 self-test）；gameCaptureCount 须 > 0',
    }
    const text = JSON.stringify(result, null, 2)
    console.log('=== PG audio captures ===')
    console.log(text)
    try {
      copy(text)
      console.log('(已 copy 到剪贴板)')
    } catch {
      console.log('(手动复制上方 JSON)')
    }
    return result
  }

  function componentMatches(comp) {
    const className = comp.constructor?.name || ''
    if (KEY_RE.test(className)) return true
    try {
      for (const k of Object.keys(comp)) {
        if (KEY_RE.test(k)) return true
        const val = comp[k]
        if (typeof val === 'string' && KEY_RE.test(val)) return true
        if (typeof val === 'number' && /start|end|offset|duration|time/i.test(k)) return true
      }
    } catch {
      /* ignore */
    }
    return false
  }

  function collectComponents() {
    if (!window.cc?.director) return { error: 'cc 未就绪，等进入主界面后再执行' }
    const hits = []
    const seen = new Set()

    function walk(n, depth = 0) {
      if (!n || depth > 28) return
      for (const comp of n._components || []) {
        if (!comp || seen.has(comp._id)) continue
        if (!componentMatches(comp)) continue
        seen.add(comp._id)
        hits.push({
          node: n.name,
          class: comp.constructor?.name || 'unknown',
          fields: safeJson(comp),
        })
      }
      for (const c of n.children || []) walk(c, depth + 1)
    }
    walk(cc.director.getScene())
    return hits
  }

  function probeOpusAudio() {
    const oa = window.opusAudio
    if (!oa) return null
    const out = { ctor: oa.constructor?.name }
    for (const k of Object.keys(oa)) {
      try {
        out[k] = safeJson(oa[k])
      } catch {
        out[k] = '[error]'
      }
    }
    return out
  }

  function dumpPgAudioConfig() {
    const result = {
      dumpedAt: new Date().toISOString(),
      page: location.href,
      ccVersion: cc.ENGINE_VERSION || cc.sys?.platform,
      note: '静态扫描通常不含 general/vox 切片；请改用 installPgAudioHooks + exportPgAudioCaptures',
      components: collectComponents(),
      opusAudio: probeOpusAudio(),
      audioEngine: cc.audioEngine ? safeJson(cc.audioEngine) : null,
    }
    const text = JSON.stringify(result, null, 2)
    console.log('=== PG audio static dump ===')
    console.log(text)
    try {
      copy(text)
      console.log('(已 copy 到剪贴板)')
    } catch {
      console.log('(手动复制上方 JSON)')
    }
    return result
  }

  window.installPgAudioHooks = installPgAudioHooks
  window.exportPgAudioCaptures = exportPgAudioCaptures
  window.dumpPgAudioConfig = dumpPgAudioConfig
  window.probePgAudioPath = probePgAudioPath
  window.testPgAudioHooks = testPgAudioHooks

  console.log(`[pg-audio] 已就绪 ${SCRIPT_VERSION}。请按顺序：`)
  console.log('  1) installPgAudioHooks()')
  console.log('  2) testPgAudioHooks()  （可选，仅验证 hook）')
  console.log('  3) 在游戏里操作 30~60 秒，必须能听到音效')
  console.log('  4) exportPgAudioCaptures()  确认 gameCaptureCount > 0')
  console.log('（必须从 scripts/dump-pg-audio-sprites.js 重新复制全文粘贴）')
})()
