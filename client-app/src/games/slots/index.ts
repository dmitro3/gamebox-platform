/**
 * 水果机前端布局入口 —— 权威数据来自 @gamebox/shared
 */
export {
  FRUIT_RING,
  FRUIT_SLOT_POS,
  FRUIT_BET_SYMBOLS,
  FRUIT_AWARD_LABELS,
  FRUIT_AWARD_TYPES,
  type FruitAwardType,
  type FruitBetSymbolId,
  type FruitRingCell,
} from '@gamebox/shared'

/** 展示用符号（暂无 emoji，后续可换素材） */
export const FRUIT_SYMBOL_EMOJI: Record<string, string> = {
  apple: '🍎',
  orange: '🍊',
  lemon: '🥭',
  bell: '🔔',
  melon: '🍉',
  star: '⭐',
  seven: '7️⃣',
  bar: 'BAR',
  luck: 'GOOD LUCK',
}

/** 底部倍数档位：下注区显示注数(00)，实际扣分 = 注数 × 倍数 */
export const FRUIT_MULT_STEPS = [1, 5, 10, 20, 50, 100] as const
/** @deprecated 用 FRUIT_MULT_STEPS */
export const FRUIT_UNIT_STEPS = [...FRUIT_MULT_STEPS]
