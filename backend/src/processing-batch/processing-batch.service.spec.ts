import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessingBatchService } from './processing-batch.service';

describe('ProcessingBatchService', () => {
  let service: ProcessingBatchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcessingBatchService, PrismaService],
    }).compile();

    service = module.get<ProcessingBatchService>(ProcessingBatchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
