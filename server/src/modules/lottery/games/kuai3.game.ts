/**
 * 极速快三游戏定义（3 颗骰子 1-6）
 *
 * 玩法：
 *   big      总和 11-17（不含豹子）
 *   small    总和 4-10（不含豹子）
 *   odd      总和奇数（不含豹子）
 *   even     总和偶数（不含豹子）
 *   triplet  全同（豹子）
 *   sum:N    猜总和（4-17）
 */
import { createHash } from 'node:crypto';
import type { LotteryGameDef, LotteryBetPayload, DrawResult, LotteryPayTable } from '../lottery.types';

function k3Draw(serverSeed: string, clientSeed: string, nonce: number): number[] {
  const input = `${serverSeed}:${clientSeed}:${nonce}`;
  const hex = createHash('sha256').update(input).digest('hex');
  return Array.from({ length: 3 }, (_, i) =>
    (parseInt(hex.slice(i * 8, i * 8 + 8), 16) % 6) + 1
  );
}

export const kuai3Game: LotteryGameDef = {
  code: 'kuai3',

  validateBet(betType: string, value?: string | number): boolean {
    const base = ['big', 'small', 'odd', 'even', 'triplet'];
    if (base.includes(betType)) return true;
    if (betType === 'sum') {
      const n = Number(value);
      return Number.isInteger(n) && n >= 4 && n <= 17;
    }
    return false;
  },

  draw(serverSeed: string, clientSeed: string, nonce: number): DrawResult {
    const numbers = k3Draw(serverSeed, clientSeed, nonce);
    const sum = numbers.reduce((a, b) => a + b, 0);
    const isTriplet = numbers.every(n => n === numbers[0]);
    return {
      numbers, sum,
      extras: { isTriplet, isBig: !isTriplet && sum >= 11, isOdd: sum % 2 !== 0 },
    };
  },

  judge(bet: LotteryBetPayload, draw: DrawResult, _pt: LotteryPayTable): string | null {
    const { sum, extras } = draw;
    const triplet = extras['isTriplet'] as boolean;
    switch (bet.betType) {
      case 'big':     return (!triplet && sum >= 11 && sum <= 17) ? 'big'  : null;
      case 'small':   return (!triplet && sum >= 4  && sum <= 10) ? 'small': null;
      case 'odd':     return (!triplet && sum % 2 !== 0)          ? 'odd'  : null;
      case 'even':    return (!triplet && sum % 2 === 0)          ? 'even' : null;
      case 'triplet': return triplet                              ? 'triplet': null;
      case 'sum':     return sum === Number(bet.value)            ? 'sum'  : null;
      default:        return null;
    }
  },
};
