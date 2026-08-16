import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RiskRuleController } from './risk-rule.controller';
import { RiskRuleService } from './risk-rule.service';

describe('RiskRuleController', () => {
  let controller: RiskRuleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RiskRuleController],
      providers: [RiskRuleService, PrismaService],
    }).compile();

    controller = module.get<RiskRuleController>(RiskRuleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
