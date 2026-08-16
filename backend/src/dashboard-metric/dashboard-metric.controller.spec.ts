import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardMetricController } from './dashboard-metric.controller';
import { DashboardMetricService } from './dashboard-metric.service';

describe('DashboardMetricController', () => {
  let controller: DashboardMetricController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardMetricController],
      providers: [DashboardMetricService, PrismaService],
    }).compile();

    controller = module.get<DashboardMetricController>(DashboardMetricController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
