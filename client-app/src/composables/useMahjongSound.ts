/**
 * 麻将胡了1 音效
 * - 优先播放 public/audio/mahjong/ 下样本（见 README.txt）
 * - 缺失时用 Web Audio 合成近似 PG 的基础操作音
 */
const AUDIO_BASE = '/audio/mahjong'

const MW1_SAMPLES = {
  /** 点击旋转按钮 — 清脆「咔哒」 */
  spinClick: `${AUDIO_BASE}/spin-click.mp3`,
  /** 单枚牌碰撞（滚动时复用） */
  tileClack: `${AUDIO_BASE}/tile-clack.mp3`,
  /** 轴停轮落牌 */
  reelStop: `${AUDIO_BASE}/reel-stop.mp3`,
  spinStart: `${AUDIO_BASE}/spin-start.mp3`,
  winCascade: [
    `${AUDIO_BASE}/win-cascade-1.mp3`,
    `${AUDIO_BASE}/win-cascade-2.mp3`,
    `${AUDIO_BASE}/win-cascade-3.mp3`,
    `${AUDIO_BASE}/win-cascade-4.mp3`,
  ],
  scatterFirst: `${AUDIO_BASE}/scatter-first.mp3`,
  scatterRetrigger: `${AUDIO_BASE}/scatter-retrigger.mp3`,
  freeSpinEnter: `${AUDIO_BASE}/free-spin-enter.mp3`,
  freeSpinEnd: `${AUDIO_BASE}/free-spin-end.mp3`,
  freeSpinBgm: `${AUDIO_BASE}/free-spin-bgm.mp3`,
} as const

let audioCtx: AudioContext | null = null
const sampleCache = new Map<string, HTMLAudioElement>()
const failedSamples = new Set<string>()
let rollShuffleTimer: ReturnType<typeof setInterval> | null = null
let freeSpinBgmEl: HTMLAudioElement | null = null

function isSoundOff() {
  return localStorage.getItem('sound_off') === '1'
}

function getCtx(): AudioContext | null {
  if (isSoundOff()) return null
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) {
    try {
      audioCtx = new Ctx()
    } catch {
      return null
    }
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

async function loadSample(src: string): Promise<HTMLAudioElement | null> {
  if (failedSamples.has(src)) return null
  const cached = sampleCache.get(src)
  if (cached) return cached

  return new Promise((resolve) => {
    const audio = new Audio(src)
    audio.preload = 'auto'
    const onReady = () => {
      audio.removeEventListener('error', onError)
      sampleCache.set(src, audio)
      resolve(audio)
    }
    const onError = () => {
      audio.removeEventListener('canplaythrough', onReady)
      failedSamples.add(src)
      resolve(null)
    }
    audio.addEventListener('canplaythrough', onReady, { once: true })
    audio.addEventListener('error', onError, { once: true })
    audio.load()
  })
}

function playSample(src: string, volume = 1, fallback?: () => void) {
  if (isSoundOff()) return
  void loadSample(src).then((base) => {
    if (!base) {
      fallback?.()
      return
    }
    const clip = base.cloneNode() as HTMLAudioElement
    clip.volume = Math.min(1, Math.max(0, volume))
    clip.play().catch(() => fallback?.())
  })
}

// ── 合成：旋转按钮「咔哒」+ 洗牌碰撞 ──

function playTone(
  freq: number,
  duration: number,
  opts: { type?: OscillatorType; gain?: number; delay?: number; detune?: number } = {},
) {
  const ctx = getCtx()
  if (!ctx) return
  const { type = 'sine', gain = 0.07, delay = 0, detune = 0 } = opts
  try {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = freq
    o.detune.value = detune
    o.connect(g)
    g.connect(ctx.destination)
    const t = ctx.currentTime + delay
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.001, t + duration)
    o.start(t)
    o.stop(t + duration + 0.03)
  } catch {
    /* ignore */
  }
}

function playNoise(duration: number, gain = 0.04, delay = 0) {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration))
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    }
    const src = ctx.createBufferSource()
    const g = ctx.createGain()
    src.buffer = buffer
    src.connect(g)
    g.connect(ctx.destination)
    const t = ctx.currentTime + delay
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + duration)
    src.start(t)
    src.stop(t + duration)
  } catch {
    /* ignore */
  }
}

/** 旋转按钮：短促机械「咔哒」 */
function synthSpinClick(isTurbo: boolean) {
  playSample(MW1_SAMPLES.spinClick, 1, () => {
    playNoise(0.012, isTurbo ? 0.11 : 0.13)
    playTone(isTurbo ? 1280 : 980, 0.028, { type: 'square', gain: 0.07 })
    playTone(isTurbo ? 620 : 480, 0.022, { type: 'sine', gain: 0.045, delay: 0.003 })
  })
}

/** 单枚麻将碰撞 */
function synthTileClack(intensity = 1) {
  playSample(MW1_SAMPLES.tileClack, 0.35 + Math.random() * 0.25, () => {
    const n = 0.01 + Math.random() * 0.016
    playNoise(n, 0.022 * intensity + Math.random() * 0.018)
    playTone(160 + Math.random() * 140, 0.035, {
      type: 'triangle',
      gain: 0.028 * intensity,
      detune: (Math.random() - 0.5) * 60,
    })
  })
}

function stopTileRollLoop() {
  if (rollShuffleTimer) {
    clearInterval(rollShuffleTimer)
    rollShuffleTimer = null
  }
}

/** 滚轴转动：连续洗牌碰撞声 */
function startTileRollLoop(isTurbo: boolean) {
  stopTileRollLoop()
  const interval = isTurbo ? 26 : 42
  const maxMs = isTurbo ? 260 : 980
  let elapsed = 0
  rollShuffleTimer = setInterval(() => {
    elapsed += interval
    if (elapsed > maxMs) {
      stopTileRollLoop()
      return
    }
    const ramp = 1 - elapsed / maxMs * 0.35
    synthTileClack(ramp)
  }, interval)
}

function synthReelStop(col: number, isTurbo: boolean) {
  playSample(MW1_SAMPLES.reelStop, 0.88 - col * 0.02, () => {
    const base = isTurbo ? 300 : 260
    playTone(base + col * 28, 0.07, { type: 'square', gain: 0.05, detune: col * 6 })
    playNoise(0.04, 0.03, 0.008)
    playTone(120 + col * 20, 0.05, { type: 'triangle', gain: 0.04, delay: 0.01 })
  })
}

function synthWin(cascadeStep: number) {
  const idx = Math.min(cascadeStep, MW1_SAMPLES.winCascade.length - 1)
  playSample(MW1_SAMPLES.winCascade[idx], 0.95, () => {
    const base = 520 + cascadeStep * 80
    ;[0, 1, 2].forEach((i) => {
      playTone(base * (1 + i * 0.25), 0.14, { type: 'sine', gain: 0.06, delay: i * 0.05 })
    })
  })
}

function synthScatter(isRetrigger: boolean) {
  const src = isRetrigger ? MW1_SAMPLES.scatterRetrigger : MW1_SAMPLES.scatterFirst
  playSample(src, 1, () => {
    if (isRetrigger) {
      playTone(660, 0.12, { type: 'sine', gain: 0.07 })
      playTone(880, 0.16, { type: 'sine', gain: 0.06, delay: 0.08 })
    } else {
      playTone(440, 0.18, { type: 'triangle', gain: 0.08 })
      playTone(554, 0.22, { type: 'triangle', gain: 0.07, delay: 0.1 })
      playTone(659, 0.28, { type: 'triangle', gain: 0.06, delay: 0.2 })
    }
  })
}

function synthFreeSpinEnter() {
  playSample(MW1_SAMPLES.freeSpinEnter, 1, () => {
    playTone(392, 0.2, { type: 'sine', gain: 0.06 })
    playTone(523, 0.25, { type: 'sine', gain: 0.06, delay: 0.12 })
    playTone(659, 0.3, { type: 'sine', gain: 0.05, delay: 0.24 })
  })
}

function synthFreeSpinEnd() {
  playSample(MW1_SAMPLES.freeSpinEnd, 1, () => {
    ;[523, 659, 784, 1047].forEach((f, i) => {
      playTone(f, 0.22, { type: 'triangle', gain: 0.06, delay: i * 0.1 })
    })
  })
}

export function useMahjongSound() {
  /** 点击旋转按钮 — 咔哒 + 开始洗牌 */
  function playSpinButtonClick(isTurbo = false) {
    synthSpinClick(isTurbo)
    startTileRollLoop(isTurbo)
  }

  function playSpin(isTurbo = false) {
    playSpinButtonClick(isTurbo)
  }

  function playReelStop(col: number, isTurbo = false) {
    synthReelStop(col, isTurbo)
    if (col >= 4) {
      stopTileRollLoop()
    }
  }

  function playWin(cascadeStep = 0) {
    synthWin(cascadeStep)
  }

  function playScatterTrigger(isRetrigger = false) {
    synthScatter(isRetrigger)
  }

  function playFreeSpinEnter() {
    synthFreeSpinEnter()
    void loadSample(MW1_SAMPLES.freeSpinBgm).then((bgm) => {
      if (!bgm || isSoundOff()) return
      freeSpinBgmEl?.pause()
      freeSpinBgmEl = bgm.cloneNode() as HTMLAudioElement
      freeSpinBgmEl.loop = true
      freeSpinBgmEl.volume = 0.45
      freeSpinBgmEl.play().catch(() => {})
    })
  }

  function playFreeSpinEnd() {
    freeSpinBgmEl?.pause()
    freeSpinBgmEl = null
    synthFreeSpinEnd()
  }

  function scheduleReelStops(isTurbo = false, onComplete?: () => void) {
    const delays = isTurbo ? [60, 100, 140, 180, 220] : [180, 360, 540, 720, 900]
    delays.forEach((ms, col) => {
      setTimeout(() => playReelStop(col, isTurbo), ms)
    })
    if (onComplete) {
      setTimeout(onComplete, delays[4]! + 120)
    }
  }

  function preload() {
    if (isSoundOff()) return
    const urls = [
      MW1_SAMPLES.spinClick,
      MW1_SAMPLES.tileClack,
      MW1_SAMPLES.reelStop,
      MW1_SAMPLES.spinStart,
      ...MW1_SAMPLES.winCascade,
      MW1_SAMPLES.scatterFirst,
      MW1_SAMPLES.scatterRetrigger,
      MW1_SAMPLES.freeSpinEnter,
      MW1_SAMPLES.freeSpinEnd,
    ]
    urls.forEach((src) => void loadSample(src))
  }

  function stopAll() {
    stopTileRollLoop()
    freeSpinBgmEl?.pause()
    freeSpinBgmEl = null
  }

  return {
    playSpinButtonClick,
    playSpin,
    playReelStop,
    playWin,
    playScatterTrigger,
    playFreeSpinEnter,
    playFreeSpinEnd,
    scheduleReelStops,
    preload,
    stopAll,
  }
}
