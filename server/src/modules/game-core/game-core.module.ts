import { Module } from '@nestjs/common';
import { SlotEngine } from './slot-engine';
import { BcbmEngine } from './bcbm-engine';
import { FruitMachineEngine } from './fruit-machine-engine';
import { BetController } from './bet.controller';
import { PointsModule } from '../points/points.module';
import { AgentsModule } from '../agents/agents.module';
import { MahjongEngine } from './mahjong-engine';

@Module({
  imports: [PointsModule, AgentsModule],
  providers: [SlotEngine, BcbmEngine, FruitMachineEngine, MahjongEngine],
  controllers: [BetController],
  exports: [SlotEngine, BcbmEngine, FruitMachineEngine, MahjongEngine],
})
export class GameCoreModule {}
