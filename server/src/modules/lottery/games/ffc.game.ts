/**
 * 1分时时彩 游戏定义（5 球 0-9，总和 0-45，均值 22.5）
 *
 * 玩法：
 *   big      总和 23-45（对称分布，恰好 50%）
 *   small    总和 0-22
 *   odd      总和奇数
 *   even     总和偶数
 *   exact:N  猜个位数字（0-9）
 */
import { createHash } from 'node:crypto';
import type { LotteryGameDef, LotteryBetPayload, DrawResult, LotteryPayTable } from '../lottery.types';

function provableDraw(serverSeed: string, clientSeed: string, nonce: number, count: number, max: number): number[] {
  const input = `${serverSeed}:${clientSeed}:${nonce}`;
  const hex = createHash('sha256').update(input).digest('hex');
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const slice = hex.slice(i * 8, i * 8 + 8);
    result.push(parseInt(slice, 16) % max);
  }
  return result;
}

export const ffcGame: LotteryGameDef = {
  code: 'ffc',

  validateBet(betType: string, value?: string | number): boolean {
    const base = ['big', 'small', 'odd', 'even'];
    if (base.includes(betType)) return true;
    if (betType === 'exact') {
      const n = Number(value);
      return Number.isInteger(n) && n >= 0 && n <= 9;
    }
    return false;
  },

  draw(serverSeed: string, clientSeed: string, nonce: number): DrawResult {
    const numbers = provableDraw(serverSeed, clientSeed, nonce, 5, 10);
    const sum = numbers.reduce((a, b) => a + b, 0);
    return {
      numbers,
      sum,
      extras: {
        last: numbers[4],  // 个位
        isBig: sum >= 23,
        isOdd: sum % 2 !== 0,
      },
    };
  },

  judge(bet: LotteryBetPayload, draw: DrawResult, _payTable: LotteryPayTable): string | null {
    const { betType, value } = bet;
    const { sum, extras } = draw;

    switch (betType) {
      case 'big':   return (sum >= 23)     ? 'big'   : null;
      case 'small': return (sum <= 22)     ? 'small' : null;
      case 'odd':   return (sum % 2 !== 0) ? 'odd'   : null;
      case 'even':  return (sum % 2 === 0) ? 'even'  : null;
      case 'exact':
        return Number(value) === (extras['last'] as number) ? 'exact' : null;
      default:
        return null;
    }
  },
};

/** 时时彩（SSC）= 分分彩相同逻辑，只是期号间隔不同 */
export const sscGame: LotteryGameDef = { ...ffcGame, code: 'ssc' };
