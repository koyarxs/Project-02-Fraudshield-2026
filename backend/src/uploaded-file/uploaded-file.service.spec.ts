import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UploadedFileService } from './uploaded-file.service';

describe('UploadedFileService', () => {
  let service: UploadedFileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadedFileService, PrismaService],
    }).compile();

    service = module.get<UploadedFileService>(UploadedFileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
