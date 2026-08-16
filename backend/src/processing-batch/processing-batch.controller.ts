import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProcessingBatchService } from './processing-batch.service';
import { CreateProcessingBatchDto } from './dto/create-processing-batch.dto';
import { UpdateProcessingBatchDto } from './dto/update-processing-batch.dto';

@UseGuards(JwtAuthGuard)

@Controller('processing-batch')
export class ProcessingBatchController {
  constructor(private readonly processingBatchService: ProcessingBatchService) {}

  @Post()
  create(@Body() createProcessingBatchDto: CreateProcessingBatchDto) {
    return this.processingBatchService.create(createProcessingBatchDto);
  }

  @Get()
  findAll() {
    return this.processingBatchService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.processingBatchService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProcessingBatchDto: UpdateProcessingBatchDto) {
    return this.processingBatchService.update(+id, updateProcessingBatchDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.processingBatchService.remove(+id);
  }
}
