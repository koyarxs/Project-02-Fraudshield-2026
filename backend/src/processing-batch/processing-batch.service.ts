import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProcessingBatchDto } from './dto/create-processing-batch.dto';
import { UpdateProcessingBatchDto } from './dto/update-processing-batch.dto';

@Injectable()
export class ProcessingBatchService {
  constructor(private readonly prisma: PrismaService) {}

  create(createProcessingBatchDto: CreateProcessingBatchDto) {
    return this.prisma.processingBatch.create({
      data: createProcessingBatchDto,
    });
  }

  findAll() {
    return this.prisma.processingBatch.findMany({
      include: {
        uploadedFile: true,
        transactions: true,
        histories: true,
        dashboardMetric: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.processingBatch.findUnique({
      where: { id },
      include: {
        uploadedFile: true,
        transactions: true,
        histories: true,
        dashboardMetric: true,
      },
    });
  }

  update(
    id: number,
    updateProcessingBatchDto: UpdateProcessingBatchDto,
  ) {
    return this.prisma.processingBatch.update({
      where: { id },
      data: updateProcessingBatchDto,
    });
  }

  remove(id: number) {
    return this.prisma.processingBatch.delete({
      where: { id },
    });
  }
}