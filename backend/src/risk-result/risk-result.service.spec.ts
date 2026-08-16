import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RiskResultService } from './risk-result.service';

describe('RiskResultService', () => {
  let service: RiskResultService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RiskResultService, PrismaService],
    }).compile();

    service = module.get<RiskResultService>(RiskResultService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
