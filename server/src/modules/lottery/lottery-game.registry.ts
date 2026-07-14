/**
 * 彩票游戏注册表：code → LotteryGameDef
 */
import { Injectable } from '@nestjs/common';
import type { LotteryGameDef } from './lottery.types';
import { ffcGame, sscGame } from './games/ffc.game';
import { kuai3Game } from './games/kuai3.game';
import { bjscGame, speedRacingGame, speedBoatGame } from './games/bjsc.game';

@Injectable()
export class LotteryGameRegistry {
  private readonly map = new Map<string, LotteryGameDef>([
    ['ffc',          ffcGame],
    ['ssc',          sscGame],
    ['kuai3',        kuai3Game],
    ['bjsc',         bjscGame],
    ['speed-racing', speedRacingGame],
    ['speed-boat',   speedBoatGame],
  ]);

  get(code: string): LotteryGameDef | undefined {
    return this.map.get(code);
  }

  all(): LotteryGameDef[] {
    return [...this.map.values()];
  }
}
