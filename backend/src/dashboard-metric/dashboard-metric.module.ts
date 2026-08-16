import { Module } from '@nestjs/common';
import { DashboardMetricService } from './dashboard-metric.service';
import { DashboardMetricController } from './dashboard-metric.controller';

@Module({
  controllers: [DashboardMetricController],
  providers: [DashboardMetricService],
})
export class DashboardMetricModule {}
