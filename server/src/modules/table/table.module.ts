import { Module } from '@nestjs/common';
import { TableGateway } from './table.gateway';
import { TableService } from './table.service';
import { TableController } from './table.controller';
import { PointsModule } from '../points/points.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [PointsModule, AgentsModule],
  providers: [TableGateway, TableService],
  controllers: [TableController],
  exports: [TableService],
})
export class TableModule {}
