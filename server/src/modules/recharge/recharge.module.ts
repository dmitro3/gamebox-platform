import { Module } from '@nestjs/common';
import { RechargeService } from './recharge.service';
import { RechargeController } from './recharge.controller';
import { PointsModule } from '../points/points.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [PointsModule, AdminModule],
  providers: [RechargeService],
  controllers: [RechargeController],
  exports: [RechargeService],
})
export class RechargeModule {}
