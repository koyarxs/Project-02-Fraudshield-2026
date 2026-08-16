import {
  Body,
  Controller,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileProcessingService } from './file-processing.service';

@UseGuards(JwtAuthGuard)
@Controller('file-processing')
export class FileProcessingController {
  constructor(
    private readonly fileProcessingService: FileProcessingService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  processCsv(
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    @Body('userId', ParseIntPipe) userId: number,
  ) {
    return this.fileProcessingService.processCsv(file, userId);
  }
}