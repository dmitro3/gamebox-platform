/**
 * 麻将胡了1 音效
 * - 优先播放 public/audio/mahjong/ 下 PG 精灵音轨（general-audio / vox）
 * - 其次播放独立 mp3 样本（见 README.txt）
 * - 缺失时用 Web Audio 合成近似 PG 的基础操作音
 */
import type { PaySymbolId } from '@/games/mahjong/mahjongWays1'
import { MAHJONG_AUDIO_SPRITES, type AudioSpriteCue } from './mahjongAudioSprites'
import { PG_MAHJONG_AUDIO_PUBLIC } from './pgMahjongAudioFromJson'

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
  /** 主局背景音乐（循环）— JSON: bgm_mg, 31.512s */
  mainBgm: PG_MAHJONG_AUDIO_PUBLIC.mainBgm,
  /** 免费局背景音乐（循环）— JSON: bgm_bonus_loop, 26.52s */
  freeSpinBgm: PG_MAHJONG_AUDIO_PUBLIC.freeSpinBgm,
} as const

let audioCtx: AudioContext | null = null
const sampleCache = new Map<string, HTMLAudioElement>()
const failedSamples = new Set<string>()
let rollShuffleTimer: ReturnType<typeof setInterval> | null = null
let rollLoopEl: HTMLAudioElement | null = null
let rollLoopStopTimer: ReturnType<typeof setTimeout> | null = null
let mainBgmEl: HTMLAudioElement | null = null
let freeSpinBgmEl: HTMLAudioElement | null = null
let freeSpinBgmActive = false

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

const VOX_GAIN = 1.9
const MAX_SPRITE_GAIN = 2.5

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

function playSprite(src: string, cue: AudioSpriteCue, volume = 1, fallback?: () => void) {
  if (isSoundOff()) return
  const isVox = src.includes('/vox')
  const targetGain = isVox ? volume * VOX_GAIN : volume

  void loadSample(src).then((base) => {
    if (!base) {
      fallback?.()
      return
    }
    const clip = base.cloneNode() as HTMLAudioElement
    clip.currentTime = cue.start
    const ms = Math.max(40, (cue.end - cue.start) * 1000)

    const ctx = getCtx()
    if (ctx) {
      try {
        const source = ctx.createMediaElementSource(clip)
        const gain = ctx.createGain()
        gain.gain.value = Math.min(MAX_SPRITE_GAIN, Math.max(0, targetGain))
        source.connect(gain)
        gain.connect(ctx.destination)
      } catch {
        clip.volume = Math.min(1, Math.max(0, targetGain))
      }
    } else {
      clip.volume = Math.min(1, Math.max(0, targetGain))
    }

    clip.play().catch(() => fallback?.())
    window.setTimeout(() => {
      clip.pause()
    }, ms + 30)
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

/** 旋转按钮：general 69s + 同步 vox「开始」 */
function synthSpinClick(isTurbo: boolean) {
  playSprite(MAHJONG_AUDIO_SPRITES.general, MAHJONG_AUDIO_SPRITES.spinClick, 1, () => {
    playSample(MW1_SAMPLES.spinClick, 1, () => {
      playNoise(0.012, isTurbo ? 0.11 : 0.13)
      playTone(isTurbo ? 1280 : 980, 0.028, { type: 'square', gain: 0.07 })
      playTone(isTurbo ? 620 : 480, 0.022, { type: 'sine', gain: 0.045, delay: 0.003 })
    })
  })
  playSprite(MAHJONG_AUDIO_SPRITES.vox, MAHJONG_AUDIO_SPRITES.spinVox, 1)
}

/** 单枚麻将碰撞 */
function synthTileClack(intensity = 1) {
  playSprite(
    MAHJONG_AUDIO_SPRITES.general,
    MAHJONG_AUDIO_SPRITES.tileClack,
    0.28 + intensity * 0.22,
    () => {
      playSample(MW1_SAMPLES.tileClack, 0.35 + Math.random() * 0.25, () => {
        const n = 0.01 + Math.random() * 0.016
        playNoise(n, 0.022 * intensity + Math.random() * 0.018)
        playTone(160 + Math.random() * 140, 0.035, {
          type: 'triangle',
          gain: 0.028 * intensity,
          detune: (Math.random() - 0.5) * 60,
        })
      })
    },
  )
}

function stopTileRollLoop() {
  if (rollShuffleTimer) {
    clearInterval(rollShuffleTimer)
    rollShuffleTimer = null
  }
  if (rollLoopStopTimer) {
    clearTimeout(rollLoopStopTimer)
    rollLoopStopTimer = null
  }
  if (rollLoopEl) {
    rollLoopEl.pause()
    rollLoopEl = null
  }
}

/** 滚轴转动：循环 PG 洗牌段（0.38~1.65s） */
function startTileRollLoop(isTurbo: boolean) {
  stopTileRollLoop()
  const loopCue = MAHJONG_AUDIO_SPRITES.spinRollLoop
  const maxMs = isTurbo ? 280 : 1050

  void loadSample(MAHJONG_AUDIO_SPRITES.general).then((base) => {
    if (!base || isSoundOff()) {
      startSyntheticTileRollLoop(isTurbo)
      return
    }
    const clip = base.cloneNode() as HTMLAudioElement
    clip.volume = isTurbo ? 0.52 : 0.65
    rollLoopEl = clip

    const onTimeUpdate = () => {
      if (clip.currentTime >= loopCue.end - 0.02) {
        clip.currentTime = loopCue.start
      }
    }
    clip.addEventListener('timeupdate', onTimeUpdate)
    clip.currentTime = loopCue.start
    clip.play().catch(() => startSyntheticTileRollLoop(isTurbo))

    rollLoopStopTimer = setTimeout(stopTileRollLoop, maxMs)
  })
}

function startSyntheticTileRollLoop(isTurbo: boolean) {
  const interval = isTurbo ? 26 : 42
  const maxMs = isTurbo ? 260 : 980
  let elapsed = 0
  rollShuffleTimer = setInterval(() => {
    elapsed += interval
    if (elapsed > maxMs) {
      stopTileRollLoop()
      return
    }
    const ramp = 1 - (elapsed / maxMs) * 0.35
    synthTileClack(ramp)
  }, interval)
}

function synthReelStop(col: number, isTurbo: boolean) {
  const reelCue = MAHJONG_AUDIO_SPRITES.reelStop[Math.min(col, MAHJONG_AUDIO_SPRITES.reelStop.length - 1)]!
  playSprite(MAHJONG_AUDIO_SPRITES.general, reelCue, 0.88 - col * 0.02, () => {
    playSample(MW1_SAMPLES.reelStop, 0.88 - col * 0.02, () => {
    const base = isTurbo ? 300 : 260
    playTone(base + col * 28, 0.07, { type: 'square', gain: 0.05, detune: col * 6 })
    playNoise(0.04, 0.03, 0.008)
    playTone(120 + col * 20, 0.05, { type: 'triangle', gain: 0.04, delay: 0.01 })
    })
  })
}

function synthTileAnnounce(symbol: PaySymbolId) {
  const cue = MAHJONG_AUDIO_SPRITES.voxTileAnnounce[symbol]
  if (!cue) return
  playSprite(MAHJONG_AUDIO_SPRITES.vox, cue, 1.1)
}

function synthWin(cascadeStep: number, symbol: PaySymbolId | null, isFreeSpin: boolean) {
  if (symbol) synthTileAnnounce(symbol)

  const idx = Math.min(cascadeStep, MW1_SAMPLES.winCascade.length - 1)
  const winCue = MAHJONG_AUDIO_SPRITES.winCascade[idx]!
  playSprite(MAHJONG_AUDIO_SPRITES.general, winCue, 0.95, () => {
    playSample(MW1_SAMPLES.winCascade[idx], 0.95, () => {
      const base = 520 + cascadeStep * 80
      ;[0, 1, 2].forEach((i) => {
        playTone(base * (1 + i * 0.25), 0.14, { type: 'sine', gain: 0.06, delay: i * 0.05 })
      })
    })
  })

  // 正版顺序：报牌 → 中奖音效 → 倍数播报（g:79 + vox）
  if (isFreeSpin) {
    synthMultiplier(cascadeStep, true)
  } else if (cascadeStep >= 1) {
    synthMultiplier(cascadeStep, false)
  }
}

function synthMultiplier(index: number, isFreeSpin: boolean) {
  if (isFreeSpin) {
    if (index < 0 || index >= MAHJONG_AUDIO_SPRITES.voxMultiplierFree.length) return
    playSprite(
      MAHJONG_AUDIO_SPRITES.general,
      MAHJONG_AUDIO_SPRITES.multiplierUp[Math.min(index, MAHJONG_AUDIO_SPRITES.multiplierUp.length - 1)]!,
      0.92,
    )
    playSprite(MAHJONG_AUDIO_SPRITES.vox, MAHJONG_AUDIO_SPRITES.voxMultiplierFree[index]!, 1.05)
    return
  }

  if (index <= 0 || index >= MAHJONG_AUDIO_SPRITES.voxMultiplierNormal.length) return
  playSprite(
    MAHJONG_AUDIO_SPRITES.general,
    MAHJONG_AUDIO_SPRITES.multiplierUp[Math.min(index - 1, MAHJONG_AUDIO_SPRITES.multiplierUp.length - 1)]!,
    0.92,
  )
  const voxCue = MAHJONG_AUDIO_SPRITES.voxMultiplierNormal[index]
  if (voxCue) {
    playSprite(MAHJONG_AUDIO_SPRITES.vox, voxCue, 1.05)
  }
}

function synthScatter(isRetrigger: boolean) {
  const spriteCue = isRetrigger
    ? MAHJONG_AUDIO_SPRITES.scatterRetrigger
    : MAHJONG_AUDIO_SPRITES.scatterFirst
  if (!isRetrigger) {
    playSprite(MAHJONG_AUDIO_SPRITES.vox, MAHJONG_AUDIO_SPRITES.voxScatterFirst, 1)
  }
  playSprite(MAHJONG_AUDIO_SPRITES.general, spriteCue, 1, () => {
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
  })
}

function synthFreeSpinEnter() {
  playSprite(MAHJONG_AUDIO_SPRITES.vox, MAHJONG_AUDIO_SPRITES.voxFreeSpinEnter, 1)
  playSprite(MAHJONG_AUDIO_SPRITES.general, MAHJONG_AUDIO_SPRITES.freeSpinEnter, 1, () => {
    playSample(MW1_SAMPLES.freeSpinEnter, 1, () => {
    playTone(392, 0.2, { type: 'sine', gain: 0.06 })
    playTone(523, 0.25, { type: 'sine', gain: 0.06, delay: 0.12 })
    playTone(659, 0.3, { type: 'sine', gain: 0.05, delay: 0.24 })
    })
  })
}

function synthFreeSpinEnd() {
  playSprite(MAHJONG_AUDIO_SPRITES.vox, MAHJONG_AUDIO_SPRITES.voxFreeSpinEnd, 1)
  playSprite(MAHJONG_AUDIO_SPRITES.general, MAHJONG_AUDIO_SPRITES.freeSpinEnd, 1, () => {
    playSample(MW1_SAMPLES.freeSpinEnd, 1, () => {
    ;[523, 659, 784, 1047].forEach((f, i) => {
      playTone(f, 0.22, { type: 'triangle', gain: 0.06, delay: i * 0.1 })
    })
    })
  })
}

async function startLoopBgm(src: string, volume: number): Promise<HTMLAudioElement | null> {
  if (isSoundOff()) return null
  const base = await loadSample(src)
  if (!base) return null
  const el = base.cloneNode() as HTMLAudioElement
  el.loop = true
  el.volume = Math.min(1, Math.max(0, volume))
  try {
    await el.play()
    return el
  } catch {
    return null
  }
}

function pauseMainBgm() {
  mainBgmEl?.pause()
  mainBgmEl = null
}

function pauseFreeSpinBgm() {
  freeSpinBgmEl?.pause()
  freeSpinBgmEl = null
}

export function useMahjongSound() {
  /** 点击旋转按钮 — 咔哒 + 开始洗牌 */
  function playSpinButtonClick(isTurbo = false) {
    void startMainBgm()
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

  /** 中奖：报牌 vox → general 中奖 → 倍数播报 */
  function playWin(cascadeStep = 0, symbol: PaySymbolId | null = null, isFreeSpin = false) {
    synthWin(cascadeStep, symbol, isFreeSpin)
  }

  /** 仅 UI 跳档时备用；正常在 playWin 内与中奖同播 */
  function playMultiplier(index: number, isFreeSpin = false) {
    synthMultiplier(index, isFreeSpin)
  }

  function playScatterTrigger(isRetrigger = false) {
    synthScatter(isRetrigger)
  }

  function playFreeSpinEnter() {
    synthFreeSpinEnter()
    pauseMainBgm()
    freeSpinBgmActive = true
    void startLoopBgm(MW1_SAMPLES.freeSpinBgm, 0.45).then((bgm) => {
      if (!bgm || isSoundOff()) return
      pauseFreeSpinBgm()
      freeSpinBgmEl = bgm
    })
  }

  function playFreeSpinEnd() {
    freeSpinBgmActive = false
    pauseFreeSpinBgm()
    synthFreeSpinEnd()
    void startMainBgm()
  }

  /** 进入主界面后循环播放主局 BGM（需用户手势时会在首次操作时重试） */
  async function startMainBgm() {
    if (isSoundOff() || freeSpinBgmActive) return
    if (mainBgmEl && !mainBgmEl.paused) return
    pauseMainBgm()
    const bgm = await startLoopBgm(MW1_SAMPLES.mainBgm, 0.35)
    if (bgm) mainBgmEl = bgm
  }

  function syncSoundEnabled() {
    if (isSoundOff()) {
      pauseMainBgm()
      pauseFreeSpinBgm()
      stopTileRollLoop()
      return
    }
    if (freeSpinBgmActive) {
      if (!freeSpinBgmEl) {
        void startLoopBgm(MW1_SAMPLES.freeSpinBgm, 0.45).then((bgm) => {
          if (bgm) freeSpinBgmEl = bgm
        })
      } else {
        void freeSpinBgmEl.play().catch(() => {})
      }
      return
    }
    void startMainBgm()
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
      MW1_SAMPLES.mainBgm,
      MW1_SAMPLES.freeSpinBgm,
      MAHJONG_AUDIO_SPRITES.general,
      MAHJONG_AUDIO_SPRITES.vox,
    ]
    urls.forEach((src) => void loadSample(src))
  }

  function stopAll() {
    stopTileRollLoop()
    freeSpinBgmActive = false
    pauseMainBgm()
    pauseFreeSpinBgm()
  }

  return {
    playSpinButtonClick,
    playSpin,
    playReelStop,
    playWin,
    playMultiplier,
    playScatterTrigger,
    playFreeSpinEnter,
    playFreeSpinEnd,
    startMainBgm,
    syncSoundEnabled,
    scheduleReelStops,
    preload,
    stopAll,
  }
}
