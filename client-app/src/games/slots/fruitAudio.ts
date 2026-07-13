/**
 * 水果机音效 / BGM
 * 下注、报奖、开跑等优先用参考柜机素材；特殊奖用中文语音报奖。
 */
import type { FruitAwardType, FruitBetSymbolId } from '@gamebox/shared'

const BASE = '/audio/slots'

const FILES = {
  bgm: `${BASE}/bgm-idle.mp3`,
  tick: `${BASE}/sfx-tick.mp3`,
  stop: `${BASE}/sfx-stop.mp3`,
  lose: `${BASE}/sfx-lose.mp3`,
  win: `${BASE}/win.mp3`,
  go: `${BASE}/go.mp3`,
  start: `${BASE}/start.mp3`,
  coin: `${BASE}/coin.mp3`,
  clear: `${BASE}/clear.mp3`,
  big: `${BASE}/sfx-big.mp3`,
  small: `${BASE}/sfx-small.mp3`,
  gambleWin: `${BASE}/sfx-gamble-win.mp3`,
  gambleLose: `${BASE}/sfx-gamble-lose.mp3`,
  cashout: `${BASE}/clear.mp3`,
  mult: `${BASE}/sfx-mult.mp3`,
  click: `${BASE}/sfx-click.mp3`,
  special: `${BASE}/sfx-special.mp3`,
  trainStep: `${BASE}/sfx-train-step.mp3`,
  awardTrain: `${BASE}/sfx-award-train.mp3`,
  awardFanfare: `${BASE}/sfx-award-fanfare.mp3`,
  awardSlam: `${BASE}/sfx-award-slam.mp3`,
  /** 大奖触发专用特殊音效 */
  jackpot: `${BASE}/sfx-jackpot.mp3`,
  wild: `${BASE}/sfx-wild.mp3`,
  barWin: `${BASE}/sfx-bar-win.mp3`,
  scoreUp: `${BASE}/sfx-score-up.mp3`,
} as const

/** 特殊大奖中文语音报奖 */
const AWARD_VOICE: Partial<Record<FruitAwardType | 'goodluck', string>> = {
  train: `${BASE}/v_train.mp3`,
  big3: `${BASE}/v_big3.mp3`,
  small3: `${BASE}/v_small3.mp3`,
  four: `${BASE}/v_four.mp3`,
  slam: `${BASE}/v_slam.mp3`,
  luck_send: `${BASE}/v_luck_send.mp3`,
  luck_eat: `${BASE}/v_luck_eat.mp3`,
  goodluck: `${BASE}/v_goodluck.mp3`,
}

/** 8 仓位下注音（参考机 s1~s8） */
const BET_SFX: Record<FruitBetSymbolId, string> = {
  apple: `${BASE}/s1.mp3`,
  orange: `${BASE}/s2.mp3`,
  lemon: `${BASE}/s3.mp3`,
  bell: `${BASE}/s4.mp3`,
  melon: `${BASE}/s5.mp3`,
  star: `${BASE}/s6.mp3`,
  seven: `${BASE}/s7.mp3`,
  bar: `${BASE}/s8.mp3`,
}

/** 报奖：普通格 / 大格（幸运加倍） */
const ANNOUNCE_SFX: Record<FruitBetSymbolId, { small: string; big: string }> = {
  apple: { small: `${BASE}/s_apple.mp3`, big: `${BASE}/s_lapple.mp3` },
  orange: { small: `${BASE}/s_orange.mp3`, big: `${BASE}/s_lorange.mp3` },
  lemon: { small: `${BASE}/s_lingmeng.mp3`, big: `${BASE}/s_slingmeng.mp3` },
  bell: { small: `${BASE}/s_lingdang.mp3`, big: `${BASE}/s_slingdang.mp3` },
  melon: { small: `${BASE}/s_xigua.mp3`, big: `${BASE}/s_lxigua.mp3` },
  star: { small: `${BASE}/s_star.mp3`, big: `${BASE}/s_lstar.mp3` },
  seven: { small: `${BASE}/s_77.mp3`, big: `${BASE}/s_l77.mp3` },
  bar: { small: `${BASE}/s_bar.mp3`, big: `${BASE}/s_lbar.mp3` },
}

type SfxKey = keyof typeof FILES

const cache = new Map<string, HTMLAudioElement>()

function getAudio(url: string): HTMLAudioElement {
  let a = cache.get(url)
  if (!a) {
    a = new Audio(url)
    a.preload = 'auto'
    cache.set(url, a)
  }
  return a
}

function playUrl(url: string, volume = 0.75): HTMLAudioElement | null {
  if (muted) return null
  unlockFruitAudio()
  const a = getAudio(url).cloneNode(true) as HTMLAudioElement
  a.volume = volume
  void a.play().catch(() => {})
  return a
}

/** 播放并等到结束（带超时兜底） */
function playUrlAndWait(url: string, volume = 0.9, maxMs = 3500): Promise<void> {
  return new Promise((resolve) => {
    if (muted) {
      resolve()
      return
    }
    unlockFruitAudio()
    const a = getAudio(url).cloneNode(true) as HTMLAudioElement
    a.volume = volume
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }
    a.addEventListener('ended', finish)
    a.addEventListener('error', finish)
    const t = window.setTimeout(finish, maxMs)
    void a.play().catch(() => {
      window.clearTimeout(t)
      finish()
    })
  })
}

let unlocked = false
let bgmEl: HTMLAudioElement | null = null
let muted = false
let goEl: HTMLAudioElement | null = null

export function unlockFruitAudio() {
  if (unlocked) return
  unlocked = true
  const a = getAudio(FILES.click)
  a.volume = 0
  void a
    .play()
    .then(() => {
      a.pause()
      a.currentTime = 0
      a.volume = 1
    })
    .catch(() => {})
}

export function playFruitSfx(key: SfxKey, volume = 0.7) {
  playUrl(FILES[key], volume)
}

/** 按符号播放下注音 */
export function playFruitBet(symbol: FruitBetSymbolId) {
  playUrl(BET_SFX[symbol], 0.8)
}

/** 报奖：按格子大小播对应语音/音效，并等到播完 */
export function playFruitAnnounce(symbol: FruitBetSymbolId, size: 'big' | 'small'): Promise<void> {
  const pack = ANNOUNCE_SFX[symbol]
  if (!pack) return Promise.resolve()
  return playUrlAndWait(size === 'big' ? pack.big : pack.small, 0.92, size === 'big' ? 2200 : 1600)
}

/** 开跑：播一段跑灯 go（可打断） */
export function playFruitGo() {
  stopFruitGo()
  goEl = playUrl(FILES.go, 0.55)
}

export function stopFruitGo() {
  if (goEl) {
    goEl.pause()
    goEl.currentTime = 0
    goEl = null
  }
}

export function startFruitBgm() {
  if (muted) return
  unlockFruitAudio()
  if (!bgmEl) {
    bgmEl = getAudio(FILES.bgm)
    bgmEl.loop = true
    bgmEl.volume = 0.32
  }
  void bgmEl.play().catch(() => {})
}

export function stopFruitBgm() {
  if (bgmEl) {
    bgmEl.pause()
    bgmEl.currentTime = 0
  }
}

/** 跑灯时压低 BGM，结束后恢复 */
export function setFruitBgmDuck(duck: boolean) {
  if (!bgmEl) return
  bgmEl.volume = duck ? 0.12 : 0.32
}

export function setFruitMuted(v: boolean) {
  muted = v
  if (v) {
    stopFruitBgm()
    stopFruitGo()
  }
}

/** 特殊大奖开场曲（短音效，可叠加语音） */
export function playFruitAwardFanfare(
  awardType: 'train' | 'big3' | 'small3' | 'four' | 'slam' | 'luck_send' | 'luck_eat' | string,
) {
  // 所有特殊奖先打 jackpot 特殊音效
  playFruitSfx('jackpot', 0.95)
  if (awardType === 'train') {
    playFruitSfx('awardTrain', 0.7)
    return
  }
  if (awardType === 'slam') {
    playFruitSfx('awardSlam', 0.85)
    return
  }
  if (
    awardType === 'big3' ||
    awardType === 'small3' ||
    awardType === 'four' ||
    awardType === 'luck_send'
  ) {
    playFruitSfx('awardFanfare', 0.7)
    return
  }
  playFruitSfx('special', 0.7)
}

/**
 * 中文语音报奖：开火车啦 / 大三元 / 小三元 / 大四喜 / 大满贯 / 送灯 / 吃灯
 * 返回 Promise，便于等语音播完再继续跑灯
 */
export async function playFruitAwardVoice(
  awardType: FruitAwardType | 'goodluck' | string,
): Promise<void> {
  const url = AWARD_VOICE[awardType as keyof typeof AWARD_VOICE]
  if (!url) return
  await playUrlAndWait(url, 0.98, 3200)
}
