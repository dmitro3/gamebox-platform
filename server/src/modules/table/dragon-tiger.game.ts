import * as crypto from 'crypto';
import type { Card, DragonTigerOutcome } from './table.types';

const SUITS: Card['suit'][] = ['S', 'H', 'D', 'C'];

/** 生成 52 张牌的完整牌组 */
function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let r = 1; r <= 13; r++) {
      deck.push({ suit, rank: r });
    }
  }
  return deck;
}

/** 用 serverSeed + nonce Fisher-Yates 洗牌（可证明公平） */
export function drawCards(serverSeed: string, nonce: number): DragonTigerOutcome {
  const deck = freshDeck();
  const combined = `${serverSeed}:${nonce}`;

  // 用 HMAC-SHA256 逐步生成随机字节 → 归一到 [0,1)
  for (let i = deck.length - 1; i > 0; i--) {
    const hmac = crypto.createHmac('sha256', combined);
    hmac.update(i.toString());
    const hex = hmac.digest('hex').slice(0, 8);
    const rnd = parseInt(hex, 16) / 0xffffffff;
    const j = Math.floor(rnd * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const dragon = deck[0];
  const tiger = deck[1];

  // A=1 最小，K=13 最大；平局（rank 相同）赔率特殊
  let winner: DragonTigerOutcome['winner'];
  if (dragon.rank > tiger.rank) winner = 'DRAGON';
  else if (tiger.rank > dragon.rank) winner = 'TIGER';
  else winner = 'TIE';

  return { dragon, tiger, winner };
}

/** 赢利抽水（对齐 WG：抽取下注盈利的 5%） */
const COMMISSION = 0.05;

/**
 * 结算返还（含本金），对齐 WG 官方规则：
 * - 龙/虎：赔付倍数 1:2（含本金），赢利抽 5%
 * - 和：赔付倍数 1:9（含本金），赢利抽 5%
 * - 开和时：龙/虎注全退
 * - 买错：×0
 */
export function calcPayout(side: string, outcome: DragonTigerOutcome, amount: number): number {
  if (side === outcome.winner) {
    const mult = side === 'TIE' ? 9 : 2;
    const grossProfit = amount * (mult - 1);
    return amount + Math.floor(grossProfit * (1 - COMMISSION));
  }
  if (outcome.winner === 'TIE' && side !== 'TIE') {
    return amount; // 开和全退
  }
  return 0;
}
