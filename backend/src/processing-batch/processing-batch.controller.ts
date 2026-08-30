import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProcessingBatchService } from './processing-batch.service';
import { CreateProcessingBatchDto } from './dto/create-processing-batch.dto';
import { UpdateProcessingBatchDto } from './dto/update-processing-batch.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('processing-batch')
export class ProcessingBatchController {
  constructor(
    private readonly processingBatchService: ProcessingBatchService,
  ) {}

  @Post()
  @Roles(UserRole.ADMINISTRADOR)
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
  @Roles(UserRole.ADMINISTRADOR)
  update(
    @Param('id') id: string,
    @Body() updateProcessingBatchDto: UpdateProcessingBatchDto,
  ) {
    return this.processingBatchService.update(+id, updateProcessingBatchDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRADOR)
  remove(@Param('id') id: string) {
    return this.processingBatchService.remove(+id);
  }
}
