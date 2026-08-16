import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RiskResultController } from './risk-result.controller';
import { RiskResultService } from './risk-result.service';

describe('RiskResultController', () => {
  let controller: RiskResultController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RiskResultController],
      providers: [RiskResultService, PrismaService],
    }).compile();

    controller = module.get<RiskResultController>(RiskResultController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
