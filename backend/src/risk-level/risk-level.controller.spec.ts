import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RiskLevelController } from './risk-level.controller';
import { RiskLevelService } from './risk-level.service';

describe('RiskLevelController', () => {
  let controller: RiskLevelController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RiskLevelController],
      providers: [RiskLevelService, PrismaService],
    }).compile();

    controller = module.get<RiskLevelController>(RiskLevelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
