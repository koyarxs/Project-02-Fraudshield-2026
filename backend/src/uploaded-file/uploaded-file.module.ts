import { Module } from '@nestjs/common';
import { UploadedFileService } from './uploaded-file.service';
import { UploadedFileController } from './uploaded-file.controller';

@Module({
  controllers: [UploadedFileController],
  providers: [UploadedFileService],
})
export class UploadedFileModule {}
