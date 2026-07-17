/**
 * 前端本地开奖（演示 / API 失败回退），规则对齐 shared + 服务端引擎。
 */
import {
  FRUIT_RING,
  FRUIT_DEFAULT_AWARD_WEIGHTS,
  FRUIT_AWARD_TYPES,
  fruitAppleIndexes,
  fruitBigIndexes,
  fruitLuckIndexes,
  fruitNonLuckIndexes,
  type FruitAwardType,
  type FruitBetSymbolId,
} from '@gamebox/shared'

export interface FruitLocalWinLine {
  symbol: FruitBetSymbolId
  mult: number
  amount: number
  cellIndex: number
}

export interface FruitLocalSpinResult {
  awardType: FruitAwardType
  stopIndex: number
  hitIndexes: number[]
  wins: FruitLocalWinLine[]
  totalBet: number
  totalWin: number
}

function rnd() {
  return Math.random()
}

function weightedPick(weights: number[], r: number): number {
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  let t = r * sum
  for (let i = 0; i < weights.length; i++) {
    t -= weights[i]
    if (t <= 0) return i
  }
  return weights.length - 1
}

function pickWeightedIndex(indexes: number[], cellWeights: number[], r: number): number {
  if (!indexes.length) return 0
  const w = indexes.map((i) => cellWeights[i] ?? 1)
  return indexes[weightedPick(w, r)]
}

function pickOne(indexes: number[], r: number): number {
  if (!indexes.length) return 0
  return indexes[Math.floor(r * indexes.length) % indexes.length]
}

function pickDistinct(pool: number[], count: number, cellWeights: number[]): number[] {
  const left = [...pool]
  const out: number[] = []
  const n = Math.min(count, left.length)
  for (let i = 0; i < n; i++) {
    const w = left.map((idx) => cellWeights[idx] ?? 1)
    const pick = weightedPick(w, rnd())
    out.push(left[pick])
    left.splice(pick, 1)
  }
  return out
}

function resolveHits(awardType: FruitAwardType): { stopIndex: number; hitIndexes: number[] } {
  const luckIdx = fruitLuckIndexes()
  const nonLuck = fruitNonLuckIndexes()
  const cellWeights = FRUIT_RING.map((c) => c.weight)

  if (awardType === 'luck_eat') {
    const stopIndex = pickWeightedIndex(luckIdx, cellWeights, rnd())
    return { stopIndex, hitIndexes: [] }
  }
  if (awardType === 'luck_send') {
    const stopIndex = pickWeightedIndex(luckIdx, cellWeights, rnd())
    const count = 1 + Math.floor(rnd() * 5)
    return { stopIndex, hitIndexes: pickDistinct(nonLuck, count, cellWeights) }
  }
  if (awardType === 'train') {
    const start = pickWeightedIndex(nonLuck, cellWeights, rnd())
    const len = 4 + Math.floor(rnd() * 3)
    const hits: number[] = []
    for (let i = 0; i < len; i++) {
      const idx = (start + i) % FRUIT_RING.length
      if (FRUIT_RING[idx].size !== 'luck') hits.push(idx)
    }
    return { stopIndex: start, hitIndexes: hits }
  }
  if (awardType === 'big3') {
    const hits = [
      pickOne(fruitBigIndexes('seven'), rnd()),
      pickOne(fruitBigIndexes('star'), rnd()),
      pickOne(fruitBigIndexes('melon'), rnd()),
    ]
    return { stopIndex: hits[0], hitIndexes: hits }
  }
  if (awardType === 'small3') {
    const hits = [
      pickOne(fruitBigIndexes('bell'), rnd()),
      pickOne(fruitBigIndexes('lemon'), rnd()),
      pickOne(fruitBigIndexes('orange'), rnd()),
    ]
    return { stopIndex: hits[0], hitIndexes: hits }
  }
  if (awardType === 'four') {
    const hits = fruitAppleIndexes()
    return { stopIndex: hits[0] ?? 0, hitIndexes: hits }
  }
  if (awardType === 'slam') {
    return { stopIndex: nonLuck[0] ?? 0, hitIndexes: [...nonLuck] }
  }

  const stopIndex = pickWeightedIndex(
    [...Array(FRUIT_RING.length).keys()],
    cellWeights,
    rnd(),
  )
  if (FRUIT_RING[stopIndex].size === 'luck') {
    const count = 1 + Math.floor(rnd() * 3)
    return { stopIndex, hitIndexes: pickDistinct(nonLuck, count, cellWeights) }
  }
  return { stopIndex, hitIndexes: [stopIndex] }
}

function settleWins(
  hitIndexes: number[],
  betMap: Record<FruitBetSymbolId, number>,
): FruitLocalWinLine[] {
  const wins: FruitLocalWinLine[] = []
  for (const cellIndex of hitIndexes) {
    const cell = FRUIT_RING[cellIndex]
    if (!cell?.symbol || cell.mult <= 0) continue
    const betAmt = betMap[cell.symbol] ?? 0
    if (betAmt <= 0) continue
    wins.push({
      symbol: cell.symbol,
      mult: cell.mult,
      amount: Math.floor(betAmt * cell.mult),
      cellIndex,
    })
  }
  return wins
}

/** 本地演示开奖（金额单位 = 注数×倍数后的实际押注） */
export function localFruitSpin(
  bets: Record<string, number>,
  opts?: { forceAward?: FruitAwardType },
): FruitLocalSpinResult {
  const entries = Object.entries(bets).filter(([, a]) => a > 0)
  const betMap = Object.fromEntries(entries) as Record<FruitBetSymbolId, number>
  const totalBet = entries.reduce((s, [, a]) => s + a, 0)

  const awardType =
    opts?.forceAward ??
    FRUIT_AWARD_TYPES[weightedPick(
      FRUIT_AWARD_TYPES.map((t) => FRUIT_DEFAULT_AWARD_WEIGHTS[t]),
      rnd(),
    )]
  const { stopIndex, hitIndexes } = resolveHits(awardType)
  const wins = settleWins(hitIndexes, betMap)
  const totalWin = wins.reduce((s, w) => s + w.amount, 0)

  return { awardType, stopIndex, hitIndexes, wins, totalBet, totalWin }
}
