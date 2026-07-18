import { deriveRandom, weightedPick } from './fairness.util';

describe('fairness utilities', () => {
  it('同一种子和 nonce 产生相同结果', () => {
    expect(deriveRandom('server', 'client', 1)).toBe(
      deriveRandom('server', 'client', 1),
    );
  });

  it('拒绝非法权重表', () => {
    expect(() => weightedPick([], 0.5)).toThrow('权重表不能为空');
    expect(() => weightedPick([0, 0], 0.5)).toThrow('权重总和必须大于 0');
    expect(() => weightedPick([1, -1], 0.5)).toThrow('权重必须是非负有限数');
  });

  it('按累计权重选中确定索引', () => {
    expect(weightedPick([1, 3], 0)).toBe(0);
    expect(weightedPick([1, 3], 0.5)).toBe(1);
  });
});
