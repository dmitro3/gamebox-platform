import { Module } from '@nestjs/common';
import { GameEngineRegistry } from './game-engine.registry';
import { SlotEngine } from './slot-engine';
import { BcbmEngine } from './bcbm-engine';
import { BetController } from './bet.controller';
import { PointsModule } from '../points/points.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [PointsModule, AgentsModule],
  providers: [GameEngineRegistry, SlotEngine, BcbmEngine],
  controllers: [BetController],
  exports: [GameEngineRegistry, SlotEngine, BcbmEngine],
})
export class GameCoreModule {}
