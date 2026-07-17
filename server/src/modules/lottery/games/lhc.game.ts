/**
 * 幸运六合彩：开奖 7 个不重复号码（1-49），末位为特码。
 * H5 全玩法仍在 games-assets 本地结算；此处供 scheduler 预创/开奖期号。
 */
import { createHash } from 'node:crypto';
import type { LotteryGameDef, LotteryBetPayload, DrawResult, LotteryPayTable } from '../lottery.types';

function drawUnique(serverSeed: string, clientSeed: string, nonce: number, count: number, max: number): number[] {
  const pool = Array.from({ length: max }, (_, i) => i + 1);
  const input = `${serverSeed}:${clientSeed}:${nonce}`;
  const hex = createHash('sha256').update(input).digest('hex');
  for (let i = pool.length - 1; i > 0; i--) {
    const slice = hex.slice((i * 4) % 56, (i * 4) % 56 + 4);
    const j = parseInt(slice, 16) % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export const lhcGame: LotteryGameDef = {
  code: 'lhc',

  validateBet(betType: string, value?: string | number): boolean {
    if (betType === 'special') {
      const n = Number(value);
      return Number.isInteger(n) && n >= 1 && n <= 49;
    }
    return ['big', 'small', 'odd', 'even'].includes(betType);
  },

  draw(serverSeed: string, clientSeed: string, nonce: number): DrawResult {
    const numbers = drawUnique(serverSeed, clientSeed, nonce, 7, 49);
    const special = numbers[6];
    const sum = numbers.reduce((a, b) => a + b, 0);
    return {
      numbers,
      sum,
      extras: {
        special,
        isBig: special >= 25,
        isOdd: special % 2 !== 0,
      },
    };
  },

  judge(bet: LotteryBetPayload, draw: DrawResult, _payTable: LotteryPayTable): string | null {
    const special = draw.extras['special'] as number;
    switch (bet.betType) {
      case 'big':
        return special >= 25 ? 'big' : null;
      case 'small':
        return special <= 24 ? 'small' : null;
      case 'odd':
        return special % 2 !== 0 ? 'odd' : null;
      case 'even':
        return special % 2 === 0 ? 'even' : null;
      case 'special':
        return Number(bet.value) === special ? 'special' : null;
      default:
        return null;
    }
  },
};
