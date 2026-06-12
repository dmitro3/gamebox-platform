import { Module } from '@nestjs/common';
import { CommissionService } from './commission.service';
import { AgentController } from './agent.controller';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [PointsModule],
  providers: [CommissionService],
  controllers: [AgentController],
  exports: [CommissionService],
})
export class AgentsModule {}
