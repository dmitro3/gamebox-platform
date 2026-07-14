/**
 * 中心舞台素材：优先用「多帧贴图 / 精灵表」，数字与文案由代码叠加。
 * 视频整段不可控（猜大小跳不出指定点数），故不用整段视频当主方案。
 */
import type { FruitAwardType, FruitBetSymbolId } from '@gamebox/shared'

const BASE = '/images/games/slots/center'
const SYM = `${BASE}/symbols`
const SHEETS = `${BASE}/sheets`

export type CenterStageMode =
  | 'idle'
  | 'gamble_roll'
  | 'gamble_win'
  | 'gamble_lose'
  | 'gamble_push'
  | 'award'

/** 精灵表规格：一张图里横 cols × 竖 rows 格，从左到右、从上到下播放 */
export interface CenterSheetSpec {
  /** 素材 URL；文件不存在时组件自动回退 CSS */
  url: string
  cols: number
  rows: number
  fps: number
  /** 是否循环；false 则播到最后一帧停住 */
  loop: boolean
}

/**
 * 分镜动画精灵表（场景舞台，不是纯粒子环）。
 * 放到 sheets/ 同名即可；cols/rows 必须与图里真实格子一致。
 */
export const CENTER_SHEETS: Record<string, CenterSheetSpec> = {
  idle: {
    url: `${SHEETS}/idle.png`,
    cols: 4,
    rows: 3,
    fps: 10,
    loop: true,
  },
  gamble_roll: {
    url: `${SHEETS}/gamble-roll.png`,
    cols: 4,
    rows: 4,
    fps: 10,
    loop: true,
  },
  gamble_win: {
    url: `${SHEETS}/gamble-win.png`,
    cols: 3,
    rows: 4,
    fps: 10,
    loop: false,
  },
  gamble_lose: {
    url: `${SHEETS}/gamble-lose.png`,
    cols: 3,
    rows: 4,
    fps: 10,
    loop: false,
  },
  train: {
    url: `${SHEETS}/award-train.png`,
    cols: 4,
    rows: 4,
    fps: 10,
    loop: true,
  },
  big3: {
    url: `${SHEETS}/award-big3.png`,
    cols: 3,
    rows: 4,
    fps: 8,
    loop: false,
  },
  small3: {
    url: `${SHEETS}/award-small3.png`,
    cols: 3,
    rows: 4,
    fps: 8,
    loop: false,
  },
  four: {
    url: `${SHEETS}/award-four.png`,
    cols: 3,
    rows: 4,
    fps: 8,
    loop: false,
  },
  slam: {
    url: `${SHEETS}/award-slam.png`,
    cols: 4,
    rows: 4,
    fps: 10,
    loop: false,
  },
  luck_send: {
    url: `${SHEETS}/award-luck.png`,
    cols: 4,
    rows: 3,
    fps: 8,
    loop: true,
  },
  luck_eat: {
    url: `${SHEETS}/award-luck.png`,
    cols: 4,
    rows: 3,
    fps: 8,
    loop: false,
  },
  bar: {
    url: `${SHEETS}/award-bar.png`,
    cols: 4,
    rows: 3,
    fps: 10,
    loop: false,
  },
}

export function centerSheetKeyForMode(
  mode: CenterStageMode,
  awardType?: string,
): string | null {
  if (mode === 'idle') return 'idle'
  if (mode === 'gamble_roll') return 'gamble_roll'
  if (mode === 'gamble_win') return 'gamble_win'
  if (mode === 'gamble_lose' || mode === 'gamble_push') return 'gamble_lose'
  if (mode === 'award') {
    const t = awardType || 'train'
    if (t in CENTER_SHEETS) return t
    if (t === 'normal') return null
    return 'train'
  }
  return null
}

/**
 * 中奖符号展示：重新设计的 2×2 分镜（水果本体 + 环绕光效），
 * 不是从 24 格裁下来的按钮图。倍率数字仍由 HTML 叠。
 */
export const CENTER_SYMBOL_SHEETS: Record<string, CenterSheetSpec> = {
  apple: { url: `${SYM}/apple.png`, cols: 2, rows: 2, fps: 8, loop: true },
  orange: { url: `${SYM}/orange.png`, cols: 2, rows: 2, fps: 8, loop: true },
  lemon: { url: `${SYM}/lemon.png`, cols: 2, rows: 2, fps: 8, loop: true },
  melon: { url: `${SYM}/melon.png`, cols: 2, rows: 2, fps: 8, loop: true },
  bell: { url: `${SYM}/bell.png`, cols: 2, rows: 2, fps: 8, loop: true },
  star: { url: `${SYM}/star.png`, cols: 2, rows: 2, fps: 8, loop: true },
  seven: { url: `${SYM}/seven.png`, cols: 2, rows: 2, fps: 8, loop: true },
  bar: { url: `${SYM}/bar.png`, cols: 2, rows: 2, fps: 8, loop: true },
  luck: { url: `${SYM}/luck.png`, cols: 2, rows: 2, fps: 8, loop: true },
}

export function centerSymbolSheetKey(
  symbol: FruitBetSymbolId | 'luck' | null | undefined,
): string | null {
  if (!symbol) return null
  return symbol in CENTER_SYMBOL_SHEETS ? symbol : null
}

export function centerSymbolUrl(
  symbol: FruitBetSymbolId | 'luck' | null | undefined,
  size: 'big' | 'small' | 'luck' = 'big',
): string {
  if (!symbol || symbol === 'luck' || size === 'luck') return `${SYM}/luck.png`
  if (size === 'big') return `${SYM}/${symbol}.png`
  return `${SYM}/${symbol}_small.png`
}

export function centerKindUrl(kind: string): string {
  return `${SYM}/${kind}.png`
}

export function awardTitleForCenter(awardType: FruitAwardType | 'bar' | string): string {
  switch (awardType) {
    case 'train':
      return '开火车啦'
    case 'big3':
      return '大三元'
    case 'small3':
      return '小三元'
    case 'four':
      return '大四喜'
    case 'slam':
      return '大满贯'
    case 'luck_send':
      return '送灯'
    case 'luck_eat':
      return '吃灯'
    case 'bar':
      return '天门'
    default:
      return '大奖'
  }
}
