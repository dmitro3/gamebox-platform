/**
 * 水果机中心舞台特效清单（供 /dev/fruit-fx 逐个预览 / 修改）。
 * 只列特效本身，不含机台外壳与押分区。
 */
import {
  CENTER_SHEETS,
  CENTER_SYMBOL_SHEETS,
  type CenterSheetSpec,
  type CenterStageMode,
} from '@/games/slots/fruitCenterAssets'
import type { FruitBetSymbolId } from '@gamebox/shared'

export type FruitFxGroup = '常驻' | '猜大小' | '中奖符号'

export type FruitFxKind = 'sheet' | 'symbol' | 'stage' | 'asset'

export interface FruitFxItem {
  id: string
  group: FruitFxGroup
  label: string
  /** 说明：素材路径或合成方式 */
  note: string
  kind: FruitFxKind
  /** 精灵表 key（sheet / symbol） */
  sheetKey?: string
  /** 单张透明/静态素材预览 */
  assetUrl?: string
  /** 完整舞台预览：喂给 FruitCenterStage */
  stage?: {
    mode: CenterStageMode
    awardType?: string
    hitSymbol?: FruitBetSymbolId | 'luck' | null
    hitSize?: 'big' | 'small' | 'luck'
    hitLabel?: string
    hitOdds?: number
    hitBetUnits?: number
    winAmount?: number
    mult?: number
    totalStake?: number
    gambleResult?: number | null
  }
}

function sheetNote(spec: CenterSheetSpec) {
  const file = spec.url.replace(/^.*\//, '')
  return `${file} · ${spec.cols}×${spec.rows} · ${spec.fps}fps · ${spec.loop ? '循环' : '播完停'}`
}

/** 全部中心特效（按修改顺序：常驻 → 猜大小 → 大奖 → 符号） */
export const FRUIT_FX_CATALOG: FruitFxItem[] = [
  {
    id: 'idle-stage-ref',
    group: '常驻',
    label: '常驻 · 四行布局（参考比例）',
    note: '柠檬=5×10×2 / 赢100 / 倍数10 / 总额250',
    kind: 'stage',
    stage: {
      mode: 'idle',
      hitSymbol: 'lemon',
      hitLabel: '柠檬',
      hitOdds: 5,
      hitBetUnits: 2,
      winAmount: 100,
      mult: 10,
      totalStake: 250,
    },
  },
  {
    id: 'idle-stage-max',
    group: '常驻',
    label: '常驻 · 四行布局（极限预览）',
    note: '图标=100×100×99 / 赢999999 / 倍数100 / 总额999999',
    kind: 'stage',
    stage: {
      mode: 'idle',
      hitSymbol: 'seven',
      hitLabel: '77',
      hitOdds: 100,
      hitBetUnits: 99,
      winAmount: 999999,
      mult: 100,
      totalStake: 999999,
    },
  },
  {
    id: 'idle-stage-compact',
    group: '常驻',
    label: '常驻 · 仅倍数总额（无中奖）',
    note: '无图标/无赢分 · 前两行空着，倍数/总额仍在第3/4行',
    kind: 'stage',
    stage: {
      mode: 'idle',
      hitSymbol: null,
      winAmount: 0,
      mult: 10,
      totalStake: 0,
    },
  },
  {
    id: 'idle-sheet',
    group: '常驻',
    label: '常驻 · 闪灯金框底图',
    note: 'idle.png · 金框跑马灯 + 橙色纯色（无放射线/无数字黑框）',
    kind: 'sheet',
    sheetKey: 'idle',
  },
  {
    id: 'idle-rays',
    group: '常驻',
    label: '常驻 · 放射线（独立旋转层）',
    note: 'idle-rays.png · 透明底放射线，舞台内单独旋转',
    kind: 'asset',
    assetUrl: '/images/games/slots/center/idle-rays.png',
  },
  {
    id: 'idle-led-box',
    group: '常驻',
    label: '常驻 · 数字黑框',
    note: 'idle-led-box.png · 独立数码窗素材（倍数/总额各用一张）',
    kind: 'asset',
    assetUrl: '/images/games/slots/center/idle-led-box.png',
  },
  {
    id: 'idle-ring-icons',
    group: '常驻',
    label: '常驻 · 24格纯符号图',
    note: 'fruit-ring-icons-clean.png · 用户抠图 1024×1024，24格纯符号',
    kind: 'asset',
    assetUrl: '/images/games/slots/center/symbols/fruit-ring-icons-clean.png',
  },
  {
    id: 'idle-stage',
    group: '常驻',
    label: '常驻 · 完整舞台（底图+射线+黑框+叠字）',
    note: 'FruitCenterStage mode=idle · 分层合成',
    kind: 'stage',
    stage: {
      mode: 'idle',
      hitSymbol: 'lemon',
      hitLabel: '柠檬',
      hitOdds: 5,
      hitBetUnits: 2,
      winAmount: 100,
      mult: 10,
      totalStake: 250,
    },
  },
  {
    id: 'gamble-roll',
    group: '猜大小',
    label: '猜大小 · 常驻底图（无叠字）',
    note: '直接播 idle 金框橙底 · 无射线无四行',
    kind: 'sheet',
    sheetKey: 'idle',
  },
  {
    id: 'gamble-roll-stage',
    group: '猜大小',
    label: '猜大小 · 完整舞台（橙底+金圈滚轮）',
    note: '常驻底图 + 橙色上金圈 + 圈内滚 1–13',
    kind: 'stage',
    stage: { mode: 'gamble_roll', mult: 10, totalStake: 250, winAmount: 100 },
  },
  {
    id: 'gamble-win-stage',
    group: '猜大小',
    label: '猜大小 · 猜中（停轮）',
    note: '橙底金圈 · 猜中横幅+绿光脉冲',
    kind: 'stage',
    stage: { mode: 'gamble_win', gambleResult: 10, mult: 10, totalStake: 250, winAmount: 200 },
  },
  {
    id: 'gamble-lose-stage',
    group: '猜大小',
    label: '猜大小 · 猜错（停轮）',
    note: '橙底金圈 · 未中横幅+红光抖动',
    kind: 'stage',
    stage: { mode: 'gamble_lose', gambleResult: 3, mult: 10, totalStake: 250, winAmount: 0 },
  },
  {
    id: 'settle-idle-win',
    group: '常驻',
    label: '报奖算账 · 常驻四行（有中奖）',
    note: '无大奖分镜；idle 显示图标算式 + 赢分',
    kind: 'stage',
    stage: {
      mode: 'idle',
      hitSymbol: 'apple',
      hitSize: 'big',
      hitLabel: '大苹果',
      hitOdds: 5,
      hitBetUnits: 2,
      winAmount: 500,
      mult: 10,
      totalStake: 250,
    },
  },
  {
    id: 'settle-idle-train',
    group: '常驻',
    label: '开火车算账 · 常驻四行',
    note: '语音/环灯报奖，中心仍用常驻算账',
    kind: 'stage',
    stage: {
      mode: 'idle',
      hitSymbol: 'orange',
      hitSize: 'big',
      hitLabel: '大橘子',
      hitOdds: 10,
      hitBetUnits: 3,
      winAmount: 800,
      mult: 10,
      totalStake: 250,
    },
  },
  ...Object.entries(CENTER_SYMBOL_SHEETS).map(([key, spec]) => ({
    id: `symbol-${key}`,
    group: '中奖符号' as const,
    label: `符号 · ${symbolLabel(key)}`,
    note: sheetNote(spec),
    kind: 'symbol' as const,
    sheetKey: key,
  })),
]

function symbolLabel(key: string) {
  const map: Record<string, string> = {
    apple: '苹果',
    orange: '橘子',
    lemon: '芒果',
    melon: '西瓜',
    bell: '铃铛',
    star: '双星',
    seven: '77',
    bar: '天门',
    luck: 'Luck',
  }
  return map[key] || key
}

export function getFruitFxSheet(item: FruitFxItem): CenterSheetSpec | null {
  if (!item.sheetKey) return null
  if (item.kind === 'symbol') return CENTER_SYMBOL_SHEETS[item.sheetKey] ?? null
  return CENTER_SHEETS[item.sheetKey] ?? null
}

export const FRUIT_FX_GROUPS: FruitFxGroup[] = ['常驻', '猜大小', '中奖符号']
