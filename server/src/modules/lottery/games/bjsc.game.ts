/**
 * 北京赛车 / 极速赛车游戏定义（10 辆赛车，排列 1-10）
 *
 * 玩法：
 *   champion:N    冠军号码（1-10）
 *   runner:N      亚军号码（1-10）
 *   top2big       冠亚和大（冠亚号码之和 12-19）
 *   top2small     冠亚和小（冠亚号码之和 3-11）
 *   top2odd       冠亚和奇
 *   top2even      冠亚和偶
 */
import { createHash } from 'node:crypto';
import type { LotteryGameDef, LotteryBetPayload, DrawResult, LotteryPayTable } from '../lottery.types';

function bjscDraw(serverSeed: string, clientSeed: string, nonce: number): number[] {
  const cars = Array.from({ length: 10 }, (_, i) => i + 1);
  const input = `${serverSeed}:${clientSeed}:${nonce}`;
  const hex = createHash('sha256').update(input).digest('hex');

  // Fisher-Yates 洗牌
  for (let i = cars.length - 1; i > 0; i--) {
    const slice = hex.slice((i * 4) % 60, (i * 4) % 60 + 4);
    const j = parseInt(slice, 16) % (i + 1);
    [cars[i], cars[j]] = [cars[j], cars[i]];
  }
  return cars; // 开奖顺序，第 0 位是冠军
}

export const bjscGame: LotteryGameDef = {
  code: 'bjsc',

  validateBet(betType: string, value?: string | number): boolean {
    const sumBets = ['top2big', 'top2small', 'top2odd', 'top2even'];
    if (sumBets.includes(betType)) return true;
    if (betType === 'champion' || betType === 'runner') {
      const n = Number(value);
      return Number.isInteger(n) && n >= 1 && n <= 10;
    }
    return false;
  },

  draw(serverSeed: string, clientSeed: string, nonce: number): DrawResult {
    const numbers = bjscDraw(serverSeed, clientSeed, nonce);
    const top2sum = numbers[0] + numbers[1];
    return {
      numbers, sum: top2sum,
      extras: { champion: numbers[0], runner: numbers[1], top2sum },
    };
  },

  judge(bet: LotteryBetPayload, draw: DrawResult, _pt: LotteryPayTable): string | null {
    const { extras } = draw;
    const top2sum = extras['top2sum'] as number;
    switch (bet.betType) {
      case 'champion': return Number(bet.value) === extras['champion'] ? 'champion' : null;
      case 'runner':   return Number(bet.value) === extras['runner']   ? 'runner'   : null;
      case 'top2big':  return top2sum >= 12 ? 'top2big'   : null;
      case 'top2small':return top2sum <= 11 ? 'top2small' : null;
      case 'top2odd':  return top2sum % 2 !== 0 ? 'top2odd' : null;
      case 'top2even': return top2sum % 2 === 0 ? 'top2even': null;
      default:         return null;
    }
  },
};

export const speedRacingGame: LotteryGameDef = { ...bjscGame, code: 'speed-racing' };
export const speedBoatGame: LotteryGameDef = { ...bjscGame, code: 'speed-boat' };
