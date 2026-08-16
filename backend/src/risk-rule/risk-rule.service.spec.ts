import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RiskRuleService } from './risk-rule.service';

describe('RiskRuleService', () => {
  let service: RiskRuleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RiskRuleService, PrismaService],
    }).compile();

    service = module.get<RiskRuleService>(RiskRuleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
