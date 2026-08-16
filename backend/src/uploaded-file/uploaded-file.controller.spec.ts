import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UploadedFileController } from './uploaded-file.controller';
import { UploadedFileService } from './uploaded-file.service';

describe('UploadedFileController', () => {
  let controller: UploadedFileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadedFileController],
      providers: [UploadedFileService, PrismaService],
    }).compile();

    controller = module.get<UploadedFileController>(UploadedFileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
