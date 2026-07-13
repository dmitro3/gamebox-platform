/**
 * 中心舞台素材路径。
 * 视频/webp 放到 public/images/games/slots/center/ 后自动优先使用；
 * 缺省回退 CSS 动画。
 */
import type { FruitAwardType, FruitBetSymbolId } from '@gamebox/shared'

const BASE = '/images/games/slots/center'
const SYM = `${BASE}/symbols`

export type CenterStageMode =
  | 'idle'
  | 'gamble_roll'
  | 'gamble_win'
  | 'gamble_lose'
  | 'gamble_push'
  | 'award'

/** 可选循环/单次视频（生成后按此命名放入 center/） */
export const CENTER_VIDEO: Record<string, string> = {
  idle: `${BASE}/idle-loop.webm`,
  gamble_roll: `${BASE}/gamble-roll.webm`,
  gamble_win: `${BASE}/gamble-win.webm`,
  gamble_lose: `${BASE}/gamble-lose.webm`,
  train: `${BASE}/award-train.webm`,
  big3: `${BASE}/award-big3.webm`,
  small3: `${BASE}/award-small3.webm`,
  four: `${BASE}/award-four.webm`,
  slam: `${BASE}/award-slam.webm`,
  luck_send: `${BASE}/award-luck.webm`,
  luck_eat: `${BASE}/award-luck.webm`,
  bar: `${BASE}/award-bar.webm`,
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

export function awardVideoKey(awardType: string): string {
  if (awardType in CENTER_VIDEO) return awardType
  return 'train'
}
