import { secondsLeftOf, type RedisRoomState } from './table.redis-state';

describe('table.redis-state', () => {
  it('secondsLeftOf 按 phaseEndsAt 计算剩余秒', () => {
    const room = {
      phaseEndsAt: 10_000,
    } as RedisRoomState;
    expect(secondsLeftOf(room, 7_400)).toBe(3);
    expect(secondsLeftOf(room, 10_500)).toBe(0);
  });
});
