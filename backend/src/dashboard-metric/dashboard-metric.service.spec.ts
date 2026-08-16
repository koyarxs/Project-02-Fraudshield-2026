import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardMetricService } from './dashboard-metric.service';

describe('DashboardMetricService', () => {
  let service: DashboardMetricService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardMetricService, PrismaService],
    }).compile();

    service = module.get<DashboardMetricService>(DashboardMetricService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
