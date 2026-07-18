import { createHash, randomBytes } from 'crypto';

/**
 * 可证明公平（Provably Fair）工具。
 * 流程：
 *   1. 开局前生成 serverSeed，先公布它的 hash（承诺，不可反悔）
 *   2. 结算后公布 serverSeed 原文
 *   3. 玩家用 serverSeed + clientSeed + nonce 自行复算，验证结果未被操纵
 */

export function genServerSeed(): { seed: string; hash: string } {
  const seed = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(seed).digest('hex');
  return { seed, hash };
}

/** 由种子派生 [0,1) 随机数（确定性、可复算） */
export function deriveRandom(serverSeed: string, clientSeed: string, nonce: number): number {
  const h = createHash('sha256')
    .update(`${serverSeed}:${clientSeed}:${nonce}`)
    .digest('hex');
  // 取前 13 个 hex 位转为 [0,1)
  const slice = h.slice(0, 13);
  return parseInt(slice, 16) / Math.pow(2, 52);
}

/**
 * 按权重表抽取一个奖项索引（电子/街机爆率核心）。
 * weights: 各奖项权重；rnd: [0,1) 随机数。
 */
export function weightedPick(weights: number[], rnd: number): number {
  if (weights.length === 0) throw new Error('权重表不能为空');
  if (!Number.isFinite(rnd) || rnd < 0 || rnd >= 1) throw new Error('随机数必须在 [0,1) 范围');
  if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new Error('权重必须是非负有限数');
  }
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) throw new Error('权重总和必须大于 0');
  let acc = 0;
  const target = rnd * total;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (target < acc) return i;
  }
  return weights.length - 1;
}
