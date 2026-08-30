import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessingBatchController } from './processing-batch.controller';
import { ProcessingBatchService } from './processing-batch.service';

describe('ProcessingBatchController', () => {
  let controller: ProcessingBatchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessingBatchController],
      providers: [ProcessingBatchService, PrismaService],
    }).compile();

    controller = module.get<ProcessingBatchController>(
      ProcessingBatchController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
