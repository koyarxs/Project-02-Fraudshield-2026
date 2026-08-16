import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessingBatchDto } from './create-processing-batch.dto';

export class UpdateProcessingBatchDto extends PartialType(
  CreateProcessingBatchDto,
) {}