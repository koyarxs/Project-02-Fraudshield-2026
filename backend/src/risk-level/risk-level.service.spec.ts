import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RiskLevelService } from './risk-level.service';

describe('RiskLevelService', () => {
  let service: RiskLevelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RiskLevelService, PrismaService],
    }).compile();

    service = module.get<RiskLevelService>(RiskLevelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
